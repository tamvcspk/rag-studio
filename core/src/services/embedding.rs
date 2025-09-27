/*!
* Embedding Service - Subprocess Management
*
* Manages the embedding-worker subprocess for AI operations (embedding, reranking).
* Provides process lifecycle management, health checks, and communication.
*
* Architecture: Process isolation as specified in CORE_DESIGN.md and MVP_PLAN.md
*/

use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::CoreError;

/// Embedding service for managing the embedding worker subprocess
pub struct EmbeddingService {
    worker_process: Arc<Mutex<Option<EmbeddingWorkerProcess>>>,
    config: EmbeddingConfig,
}

/// Configuration for the embedding service
#[derive(Debug, Clone)]
pub struct EmbeddingConfig {
    /// Path to the embedding-worker executable
    pub worker_executable: String,
    /// Request timeout in milliseconds
    pub request_timeout_ms: u64,
    /// Maximum number of retry attempts
    pub max_retries: u32,
    /// Health check interval in seconds
    pub health_check_interval_secs: u64,
    /// Whether to restart worker on failure
    pub auto_restart: bool,
}

/// Embedding worker process management
struct EmbeddingWorkerProcess {
    child: Child,
    start_time: Instant,
    request_count: u64,
}

/// Request message to embedding worker
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum EmbeddingRequest {
    Ping { request_id: Uuid },
    Health { request_id: Uuid },
    Embedding {
        request_id: Uuid,
        text: String,
        model: Option<String>,
    },
    Reranking {
        request_id: Uuid,
        query: String,
        documents: Vec<DocumentToRerank>,
        top_k: Option<usize>,
    },
    Shutdown { request_id: Uuid },
}

/// Response message from embedding worker
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum EmbeddingResponse {
    Pong { request_id: Uuid },
    Health {
        request_id: Uuid,
        status: HealthStatus,
    },
    Embedding {
        request_id: Uuid,
        embedding: Vec<f32>,
        model: String,
        processing_time_ms: u64,
    },
    Reranking {
        request_id: Uuid,
        documents: Vec<RankedDocument>,
        model: String,
        processing_time_ms: u64,
    },
    Shutdown { request_id: Uuid },
    Error { request_id: Uuid, error: String },
}

/// Document for reranking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentToRerank {
    pub id: String,
    pub text: String,
    pub metadata: Option<serde_json::Value>,
}

/// Ranked document result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankedDocument {
    pub id: String,
    pub text: String,
    pub score: f32,
    pub original_rank: usize,
    pub metadata: Option<serde_json::Value>,
}

/// Health status from embedding worker
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub python_ready: bool,
    pub models: Vec<String>,
    pub memory_mb: Option<f64>,
    pub uptime_seconds: u64,
    pub processed_requests: u64,
    pub avg_processing_time_ms: Option<f64>,
}

impl Default for EmbeddingConfig {
    fn default() -> Self {
        Self {
            worker_executable: "embedding-worker".to_string(),
            request_timeout_ms: 30000, // 30 seconds
            max_retries: 3,
            health_check_interval_secs: 30,
            auto_restart: true,
        }
    }
}

impl EmbeddingConfig {
    /// Create MVP configuration
    pub fn mvp() -> Self {
        Self {
            worker_executable: "./target/debug/embedding-worker".to_string(),
            request_timeout_ms: 30000,
            max_retries: 2,
            health_check_interval_secs: 60,
            auto_restart: true,
        }
    }

    /// Create production configuration
    pub fn production(executable_path: &str) -> Self {
        Self {
            worker_executable: executable_path.to_string(),
            request_timeout_ms: 15000, // Tighter timeout for production
            max_retries: 3,
            health_check_interval_secs: 30,
            auto_restart: true,
        }
    }
}

impl EmbeddingService {
    /// Create new embedding service
    pub fn new(config: EmbeddingConfig) -> Self {
        Self {
            worker_process: Arc::new(Mutex::new(None)),
            config,
        }
    }

    /// Start the embedding worker subprocess
    pub async fn start_worker(&self) -> Result<(), CoreError> {
        info!("🚀 Starting embedding worker subprocess");

        let mut process_guard = self.worker_process.lock()
            .map_err(|e| CoreError::Service(format!("Failed to acquire process lock: {}", e)))?;

        // Stop existing process if running
        if let Some(mut existing_process) = process_guard.take() {
            warn!("⚠️  Stopping existing embedding worker process");
            if let Err(e) = existing_process.child.kill() {
                warn!("Failed to kill existing process: {}", e);
            }
        }

        // Start new process
        let child = Command::new(&self.config.worker_executable)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| CoreError::Service(format!("Failed to start embedding worker: {}", e)))?;

        let worker_process = EmbeddingWorkerProcess {
            child,
            start_time: Instant::now(),
            request_count: 0,
        };

        *process_guard = Some(worker_process);

        info!("✅ Embedding worker subprocess started successfully");
        Ok(())
    }

    /// Stop the embedding worker subprocess
    pub async fn stop_worker(&self) -> Result<(), CoreError> {
        info!("🛑 Stopping embedding worker subprocess");

        // Take the worker process out of the option
        let worker_process_opt = {
            let mut process_guard = self.worker_process.lock()
                .map_err(|e| CoreError::Service(format!("Failed to acquire process lock: {}", e)))?;
            process_guard.take()
        };

        if let Some(mut worker_process) = worker_process_opt {
            // Try graceful shutdown first (outside the lock)
            if let Err(e) = Self::send_shutdown_to_process(&mut worker_process).await {
                warn!("Failed graceful shutdown, force killing: {}", e);
                if let Err(e) = worker_process.child.kill() {
                    error!("Failed to force kill worker process: {}", e);
                    return Err(CoreError::Service(format!("Failed to stop worker: {}", e)));
                }
            }

            // Wait for process to exit
            if let Err(e) = worker_process.child.wait() {
                warn!("Error waiting for worker process to exit: {}", e);
            }

            info!("✅ Embedding worker subprocess stopped");
        } else {
            info!("ℹ️  No embedding worker process to stop");
        }

        Ok(())
    }

    /// Send shutdown request to a worker process (static method to avoid borrowing issues)
    async fn send_shutdown_to_process(worker_process: &mut EmbeddingWorkerProcess) -> Result<(), CoreError> {
        let request = EmbeddingRequest::Shutdown {
            request_id: Uuid::new_v4(),
        };

        let request_json = serde_json::to_string(&request)
            .map_err(|e| CoreError::Service(format!("Failed to serialize shutdown request: {}", e)))?;

        if let Some(stdin) = worker_process.child.stdin.as_mut() {
            writeln!(stdin, "{}", request_json)
                .map_err(|e| CoreError::Service(format!("Failed to send shutdown request: {}", e)))?;
            stdin.flush()
                .map_err(|e| CoreError::Service(format!("Failed to flush shutdown request: {}", e)))?;
        }

        Ok(())
    }


    /// Generate embeddings for text
    pub async fn generate_embedding(&self, text: String, model: Option<String>) -> Result<Vec<f32>, CoreError> {
        let request_id = Uuid::new_v4();
        let request = EmbeddingRequest::Embedding {
            request_id,
            text,
            model,
        };

        let response = self.send_request_with_retry(request).await?;

        match response {
            EmbeddingResponse::Embedding { embedding, .. } => Ok(embedding),
            EmbeddingResponse::Error { error, .. } => Err(CoreError::Service(error)),
            _ => Err(CoreError::Service("Unexpected response type".to_string())),
        }
    }

    /// Rerank documents using query
    pub async fn rerank_documents(
        &self,
        query: String,
        documents: Vec<DocumentToRerank>,
        top_k: Option<usize>,
    ) -> Result<Vec<RankedDocument>, CoreError> {
        let request_id = Uuid::new_v4();
        let request = EmbeddingRequest::Reranking {
            request_id,
            query,
            documents,
            top_k,
        };

        let response = self.send_request_with_retry(request).await?;

        match response {
            EmbeddingResponse::Reranking { documents, .. } => Ok(documents),
            EmbeddingResponse::Error { error, .. } => Err(CoreError::Service(error)),
            _ => Err(CoreError::Service("Unexpected response type".to_string())),
        }
    }

    /// Health check for embedding worker
    pub async fn health_check(&self) -> Result<HealthStatus, CoreError> {
        let request_id = Uuid::new_v4();
        let request = EmbeddingRequest::Health { request_id };

        let response = self.send_request_with_retry(request).await?;

        match response {
            EmbeddingResponse::Health { status, .. } => Ok(status),
            EmbeddingResponse::Error { error, .. } => Err(CoreError::Service(error)),
            _ => Err(CoreError::Service("Unexpected response type for health check".to_string())),
        }
    }

    /// Send request with retry logic
    async fn send_request_with_retry(&self, request: EmbeddingRequest) -> Result<EmbeddingResponse, CoreError> {
        let mut attempts = 0;
        let max_attempts = self.config.max_retries + 1;

        while attempts < max_attempts {
            attempts += 1;

            match self.send_request(request.clone()).await {
                Ok(response) => return Ok(response),
                Err(e) if attempts < max_attempts => {
                    warn!("Embedding request failed (attempt {}): {}", attempts, e);

                    // Try to restart worker if enabled
                    if self.config.auto_restart {
                        if let Err(restart_err) = self.start_worker().await {
                            error!("Failed to restart worker: {}", restart_err);
                        }
                    }

                    // Wait before retry
                    tokio::time::sleep(Duration::from_millis(1000 * attempts as u64)).await;
                }
                Err(e) => {
                    error!("Embedding request failed after {} attempts: {}", attempts, e);
                    return Err(e);
                }
            }
        }

        Err(CoreError::Service("Max retry attempts exceeded".to_string()))
    }

    /// Send single request to worker
    async fn send_request(&self, request: EmbeddingRequest) -> Result<EmbeddingResponse, CoreError> {
        // Serialize request outside the lock
        let request_json = serde_json::to_string(&request)
            .map_err(|e| CoreError::Service(format!("Failed to serialize request: {}", e)))?;

        // Acquire lock only for the duration needed
        let response = {
            let mut process_guard = self.worker_process.lock()
                .map_err(|e| CoreError::Service(format!("Failed to acquire process lock: {}", e)))?;

            let worker_process = process_guard.as_mut()
                .ok_or_else(|| CoreError::Service("Embedding worker not started".to_string()))?;

            // Send request to stdin
            if let Some(stdin) = worker_process.child.stdin.as_mut() {
                writeln!(stdin, "{}", request_json)
                    .map_err(|e| CoreError::Service(format!("Failed to send request: {}", e)))?;
                stdin.flush()
                    .map_err(|e| CoreError::Service(format!("Failed to flush request: {}", e)))?;
            } else {
                return Err(CoreError::Service("Worker stdin not available".to_string()));
            }

            // Read response from stdout
            if let Some(stdout) = worker_process.child.stdout.as_mut() {
                let mut reader = BufReader::new(stdout);
                let mut line = String::new();

                reader.read_line(&mut line)
                    .map_err(|e| CoreError::Service(format!("Failed to read response: {}", e)))?;

                let response: EmbeddingResponse = serde_json::from_str(line.trim())
                    .map_err(|e| CoreError::Service(format!("Failed to parse response: {}", e)))?;

                worker_process.request_count += 1;

                response
            } else {
                return Err(CoreError::Service("Worker stdout not available".to_string()));
            }
        };

        Ok(response)
    }

    /// Check if worker process is running
    pub fn is_worker_running(&self) -> bool {
        if let Ok(process_guard) = self.worker_process.lock() {
            if let Some(_worker_process) = process_guard.as_ref() {
                // Check if process is still running (simplified check)
                return true; // In a real implementation, check process status
            }
        }
        false
    }

    /// Get worker statistics
    pub fn get_worker_stats(&self) -> Option<WorkerStats> {
        if let Ok(process_guard) = self.worker_process.lock() {
            if let Some(worker_process) = process_guard.as_ref() {
                return Some(WorkerStats {
                    uptime_seconds: worker_process.start_time.elapsed().as_secs(),
                    request_count: worker_process.request_count,
                });
            }
        }
        None
    }
}

/// Worker statistics
#[derive(Debug, Clone)]
pub struct WorkerStats {
    pub uptime_seconds: u64,
    pub request_count: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedding_config_mvp() {
        let config = EmbeddingConfig::mvp();
        assert_eq!(config.worker_executable, "./target/debug/embedding-worker");
        assert_eq!(config.request_timeout_ms, 30000);
        assert!(config.auto_restart);
    }

    #[test]
    fn test_embedding_config_production() {
        let config = EmbeddingConfig::production("/path/to/worker");
        assert_eq!(config.worker_executable, "/path/to/worker");
        assert_eq!(config.request_timeout_ms, 15000);
        assert!(config.auto_restart);
    }

    #[tokio::test]
    async fn test_embedding_service_creation() {
        let config = EmbeddingConfig::mvp();
        let service = EmbeddingService::new(config);
        assert!(!service.is_worker_running());
    }
}