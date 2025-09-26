/*!
* RAG Studio Embedding Worker Subprocess
*
* This subprocess handles AI-related operations (embedding, reranking) in isolation
* from the main Tauri process for security, stability, and error recovery.
*
* Communication Protocol: JSON over stdin/stdout
* Architecture: Process isolation as specified in CORE_DESIGN.md and MVP_PLAN.md
*/

mod protocol;
mod python_ai;
mod batch;
mod model_cache;

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, BufReader, Write};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt};
use tracing::{info, error, warn, debug};
use uuid::Uuid;

use protocol::{WorkerRequest, WorkerResponse, EmbeddingRequest, EmbeddingResponse, RerankingRequest, RerankingResponse};
use python_ai::PythonAI;
use batch::BatchProcessor;

/// Main embedding worker struct that manages Python AI functions
pub struct EmbeddingWorker {
    python_ai: PythonAI,
    batch_processor: BatchProcessor,
}

impl EmbeddingWorker {
    /// Initialize the embedding worker with Python AI context
    pub fn new() -> Result<Self> {
        info!("🚀 Initializing RAG Studio Embedding Worker");

        let python_ai = PythonAI::new()
            .context("Failed to initialize Python AI context")?;

        let batch_processor = BatchProcessor::new();

        Ok(Self {
            python_ai,
            batch_processor,
        })
    }

    /// Process a single worker request
    pub async fn process_request(&mut self, request: WorkerRequest) -> Result<WorkerResponse> {
        debug!("Processing request: {:?}", request);

        match request {
            WorkerRequest::Ping { request_id } => {
                Ok(WorkerResponse::Pong { request_id })
            }

            WorkerRequest::Health { request_id } => {
                let health_status = self.python_ai.health_check().await?;
                Ok(WorkerResponse::Health {
                    request_id,
                    status: health_status,
                })
            }

            WorkerRequest::Embedding { request_id, embedding_request } => {
                let response = self.python_ai.generate_embeddings(embedding_request).await
                    .context("Failed to generate embeddings")?;

                Ok(WorkerResponse::Embedding {
                    request_id,
                    embedding_response: response,
                })
            }

            WorkerRequest::Reranking { request_id, reranking_request } => {
                let response = self.python_ai.rerank_documents(reranking_request).await
                    .context("Failed to rerank documents")?;

                Ok(WorkerResponse::Reranking {
                    request_id,
                    reranking_response: response,
                })
            }

            WorkerRequest::BatchEmbedding { request_id, batch_requests } => {
                let responses = self.batch_processor.process_embedding_batch(
                    &mut self.python_ai,
                    batch_requests
                ).await
                    .context("Failed to process embedding batch")?;

                Ok(WorkerResponse::BatchEmbedding {
                    request_id,
                    batch_responses: responses,
                })
            }

            WorkerRequest::Shutdown { request_id } => {
                info!("🛑 Shutdown request received");
                Ok(WorkerResponse::Shutdown { request_id })
            }
        }
    }

    /// Main event loop for processing stdin/stdout JSON protocol
    pub async fn run(&mut self) -> Result<()> {
        info!("📡 Embedding Worker started - listening on stdin");

        let stdin = io::stdin();
        let mut reader = BufReader::new(stdin);
        let mut stdout = io::stdout();

        loop {
            let mut line = String::new();

            // Read line from stdin
            match reader.read_line(&mut line) {
                Ok(0) => {
                    // EOF - parent process closed, exit gracefully
                    info!("📡 EOF received, shutting down embedding worker");
                    break;
                }
                Ok(_) => {
                    let line = line.trim();
                    if line.is_empty() {
                        continue;
                    }

                    // Parse JSON request
                    match serde_json::from_str::<WorkerRequest>(line) {
                        Ok(request) => {
                            let request_id = request.request_id();
                            debug!("📨 Received request: {}", request_id);

                            // Process request
                            let response = match self.process_request(request).await {
                                Ok(response) => response,
                                Err(e) => {
                                    error!("❌ Request processing error: {}", e);
                                    WorkerResponse::Error {
                                        request_id,
                                        error: e.to_string(),
                                    }
                                }
                            };

                            // Send JSON response to stdout
                            let response_json = serde_json::to_string(&response)
                                .context("Failed to serialize response")?;
                            writeln!(stdout, "{}", response_json)?;
                            stdout.flush()?;

                            debug!("📤 Sent response for request: {}", request_id);

                            // Check for shutdown
                            if matches!(response, WorkerResponse::Shutdown { .. }) {
                                info!("🛑 Shutting down embedding worker");
                                break;
                            }
                        }
                        Err(e) => {
                            error!("❌ Failed to parse JSON request: {} | Input: {}", e, line);

                            // Send error response with unknown request ID
                            let error_response = WorkerResponse::Error {
                                request_id: Uuid::new_v4(),
                                error: format!("Invalid JSON request: {}", e),
                            };

                            let response_json = serde_json::to_string(&error_response)
                                .context("Failed to serialize error response")?;
                            writeln!(stdout, "{}", response_json)?;
                            stdout.flush()?;
                        }
                    }
                }
                Err(e) => {
                    error!("❌ Failed to read from stdin: {}", e);
                    break;
                }
            }
        }

        info!("✅ Embedding Worker shutdown completed");
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::filter::EnvFilter::from_default_env()
                .add_directive("embedding_worker=info".parse()?)
        )
        .with_target(false)
        .with_thread_ids(true)
        .init();

    info!("🚀 RAG Studio Embedding Worker starting...");

    // Create and run embedding worker
    let mut worker = EmbeddingWorker::new()
        .context("Failed to create embedding worker")?;

    // Run the main event loop
    worker.run().await
        .context("Embedding worker runtime error")?;

    info!("✅ RAG Studio Embedding Worker shutdown complete");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio_test]
    async fn test_worker_initialization() {
        let worker = EmbeddingWorker::new();
        assert!(worker.is_ok(), "Worker should initialize successfully");
    }

    #[tokio_test]
    async fn test_ping_request() {
        let mut worker = EmbeddingWorker::new().unwrap();
        let request_id = Uuid::new_v4();

        let request = WorkerRequest::Ping { request_id };
        let response = worker.process_request(request).await;

        assert!(response.is_ok());
        match response.unwrap() {
            WorkerResponse::Pong { request_id: resp_id } => {
                assert_eq!(resp_id, request_id);
            }
            _ => panic!("Expected Pong response"),
        }
    }
}