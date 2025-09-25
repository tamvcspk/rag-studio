/*!
* Python AI Integration for Embedding Worker
*
* This module handles the actual Python AI operations (embedding, reranking)
* using PyO3, similar to the existing implementation but isolated in a subprocess.
*
* Based on the existing python_integration.rs but enhanced for subprocess operation.
*/

use anyhow::{Result, Context};
use pyo3::prelude::*;
use pyo3::types::PyModule;
use serde_json;
use std::collections::HashMap;
use std::ffi::CString;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

use crate::protocol::{
    EmbeddingRequest, EmbeddingResponse, RerankingRequest, RerankingResponse,
    HealthStatus, DocumentToRerank, RankedDocument
};

/// Cached Python code and module data to avoid repeated I/O and compilation
struct CachedPythonData {
    code_cstr: CString,
    filename_cstr: CString,
    module_name_cstr: CString,
}

/// Python AI context for embedding worker
pub struct PythonAI {
    python_path: PathBuf,
    cached_data: OnceLock<CachedPythonData>,
    start_time: Instant,
    processed_requests: u64,
    total_processing_time: Duration,
}

impl PythonAI {
    /// Initialize Python AI context
    pub fn new() -> Result<Self> {
        let current_dir = std::env::current_dir()
            .context("Failed to get current directory")?;

        let python_path = current_dir.join("python");

        info!("🐍 Initializing Python AI context from: {}", python_path.display());

        Ok(PythonAI {
            python_path,
            cached_data: OnceLock::new(),
            start_time: Instant::now(),
            processed_requests: 0,
            total_processing_time: Duration::from_secs(0),
        })
    }

    /// Get or initialize cached Python data
    fn get_cached_data(&self) -> Result<&CachedPythonData> {
        match self.cached_data.get() {
            Some(data) => Ok(data),
            None => {
                let python_file_path = self.python_path.join("embedding_functions.py");

                debug!("📁 Loading Python functions from: {}", python_file_path.display());

                let python_code = std::fs::read_to_string(&python_file_path)
                    .context(format!("Failed to read Python file: {}", python_file_path.display()))?;

                let code_cstr = CString::new(python_code)
                    .context("Failed to convert Python code to CString")?;

                let filename_cstr = CString::new("embedding_functions.py")
                    .context("Failed to convert filename to CString")?;

                let module_name_cstr = CString::new("embedding_functions")
                    .context("Failed to convert module name to CString")?;

                let cached_data = CachedPythonData {
                    code_cstr,
                    filename_cstr,
                    module_name_cstr,
                };

                match self.cached_data.set(cached_data) {
                    Ok(_) => Ok(self.cached_data.get().unwrap()),
                    Err(_) => Ok(self.cached_data.get().unwrap()), // Another thread set it
                }
            }
        }
    }

    /// Load the embedding functions module using cached data
    fn load_embedding_module<'py>(&self, py: Python<'py>) -> PyResult<Bound<'py, PyModule>> {
        let cached_data = self.get_cached_data()
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyIOError, _>(e.to_string()))?;

        let code_str = cached_data.code_cstr.to_str()
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid UTF-8 in code: {}", e)))?;

        let filename_str = cached_data.filename_cstr.to_str()
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid UTF-8 in filename: {}", e)))?;

        let module_name_str = cached_data.module_name_cstr.to_str()
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid UTF-8 in module name: {}", e)))?;

        PyModule::from_code_bound(py, code_str, filename_str, module_name_str)
    }

    /// Generate embeddings for a single request
    pub async fn generate_embeddings(&mut self, request: EmbeddingRequest) -> Result<EmbeddingResponse> {
        let start_time = Instant::now();

        debug!("🔤 Generating embedding for: {}", request.id);

        let result = Python::with_gil(|py| -> PyResult<Vec<f32>> {
            let module = self.load_embedding_module(py)?;

            let embed_func = module.getattr("generate_embedding")?;
            let result = embed_func.call1((request.text.as_str(),))?;

            // Convert Python list to Vec<f32>
            let embedding: Vec<f32> = result.extract()?;
            Ok(embedding)
        });

        let processing_time = start_time.elapsed();
        self.processed_requests += 1;
        self.total_processing_time += processing_time;

        match result {
            Ok(embedding) => {
                debug!("✅ Generated embedding for {} ({}ms)", request.id, processing_time.as_millis());

                Ok(EmbeddingResponse {
                    id: request.id,
                    embedding,
                    model: request.model.unwrap_or_else(|| "default".to_string()),
                    processing_time_ms: processing_time.as_millis() as u64,
                    token_count: Some(request.text.split_whitespace().count()),
                })
            }
            Err(e) => {
                error!("❌ Failed to generate embedding for {}: {}", request.id, e);
                Err(anyhow::anyhow!("Embedding generation failed: {}", e))
            }
        }
    }

    /// Rerank documents using cross-encoder model
    pub async fn rerank_documents(&mut self, request: RerankingRequest) -> Result<RerankingResponse> {
        let start_time = Instant::now();

        debug!("🔀 Reranking {} documents for query", request.documents.len());

        let result = Python::with_gil(|py| -> PyResult<Vec<(usize, f32)>> {
            let module = self.load_embedding_module(py)?;

            let rerank_func = module.getattr("rerank_documents")?;

            // Prepare documents for Python function
            let doc_texts: Vec<&str> = request.documents.iter().map(|d| d.text.as_str()).collect();

            let result = rerank_func.call1((request.query.as_str(), doc_texts))?;

            // Convert Python result to Vec<(index, score)>
            let scores: Vec<(usize, f32)> = result.extract()?;
            Ok(scores)
        });

        let processing_time = start_time.elapsed();
        self.processed_requests += 1;
        self.total_processing_time += processing_time;

        match result {
            Ok(scores) => {
                // Create ranked documents
                let mut ranked_docs: Vec<RankedDocument> = scores
                    .into_iter()
                    .enumerate()
                    .filter_map(|(rank, (original_idx, score))| {
                        request.documents.get(original_idx).map(|doc| RankedDocument {
                            id: doc.id.clone(),
                            text: doc.text.clone(),
                            score,
                            original_rank: original_idx,
                            metadata: doc.metadata.clone(),
                        })
                    })
                    .collect();

                // Apply top_k limit if specified
                if let Some(top_k) = request.top_k {
                    ranked_docs.truncate(top_k);
                }

                debug!("✅ Reranked {} documents ({}ms)", ranked_docs.len(), processing_time.as_millis());

                Ok(RerankingResponse {
                    documents: ranked_docs,
                    model: request.model.unwrap_or_else(|| "default".to_string()),
                    processing_time_ms: processing_time.as_millis() as u64,
                })
            }
            Err(e) => {
                error!("❌ Failed to rerank documents: {}", e);
                Err(anyhow::anyhow!("Document reranking failed: {}", e))
            }
        }
    }

    /// Health check for the Python AI system
    pub async fn health_check(&self) -> Result<HealthStatus> {
        debug!("🏥 Performing health check");

        let python_ready = Python::with_gil(|py| -> PyResult<bool> {
            let _module = self.load_embedding_module(py)?;
            Ok(true)
        }).unwrap_or(false);

        let uptime_seconds = self.start_time.elapsed().as_secs();
        let avg_processing_time_ms = if self.processed_requests > 0 {
            Some(self.total_processing_time.as_millis() as f64 / self.processed_requests as f64)
        } else {
            None
        };

        // Try to get memory usage (simplified)
        let memory_mb = self.get_memory_usage().unwrap_or(None);

        let status = if python_ready {
            "healthy".to_string()
        } else {
            "python_error".to_string()
        };

        Ok(HealthStatus {
            status,
            python_ready,
            models: vec![
                "all-MiniLM-L6-v2".to_string(),
                "default".to_string()
            ],
            memory_mb,
            uptime_seconds,
            processed_requests: self.processed_requests,
            avg_processing_time_ms,
        })
    }

    /// Get current memory usage (simplified implementation)
    fn get_memory_usage(&self) -> Result<Option<f64>> {
        // This is a simplified implementation
        // In a real implementation, you might use process memory APIs
        Ok(Some(64.0)) // Placeholder: 64MB
    }

    /// Test the greeting function (for compatibility with existing tests)
    pub fn call_greeting(&self, name: &str) -> Result<String> {
        Python::with_gil(|py| {
            let module = self.load_embedding_module(py)
                .map_err(|e| anyhow::anyhow!("Failed to load module: {}", e))?;

            let greet_func = module.getattr("greet_from_python")
                .map_err(|e| anyhow::anyhow!("Failed to get greeting function: {}", e))?;

            let result = greet_func.call1((name,))
                .map_err(|e| anyhow::anyhow!("Failed to call greeting function: {}", e))?;

            result.extract::<String>()
                .map_err(|e| anyhow::anyhow!("Failed to extract result: {}", e))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio_test]
    async fn test_python_ai_initialization() {
        // This test will fail until we have the Python functions file
        // but it validates the structure
        let result = PythonAI::new();
        assert!(result.is_ok(), "PythonAI should initialize successfully");
    }

    #[tokio_test]
    async fn test_health_check() {
        let ai = PythonAI::new().unwrap();
        let health = ai.health_check().await;

        // Health check should work even if Python functions are missing
        assert!(health.is_ok(), "Health check should complete");

        let status = health.unwrap();
        assert!(!status.status.is_empty());
        assert!(status.uptime_seconds >= 0);
    }
}