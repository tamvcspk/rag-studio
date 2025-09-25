/*!
* Embedding Worker Tauri Commands
*
* Commands for managing the embedding worker subprocess and performing
* AI operations (embedding generation, document reranking).
*/

use std::sync::Arc;
use tauri::{State, AppHandle, Manager as TauriManager};
use tracing::{info, error, debug};

use crate::manager::Manager;
use rag_core::services::embedding::{DocumentToRerank, RankedDocument};

/// Start the embedding worker subprocess
#[tauri::command]
pub async fn start_embedding_worker(
    app: AppHandle,
) -> Result<String, String> {
    info!("🚀 Starting embedding worker subprocess via Tauri command");

    let manager = app.state::<Arc<Manager>>();

    match manager.start_embedding_worker().await {
        Ok(_) => {
            info!("✅ Embedding worker started successfully");
            Ok("Embedding worker started successfully".to_string())
        }
        Err(e) => {
            error!("❌ Failed to start embedding worker: {}", e);
            Err(format!("Failed to start embedding worker: {}", e))
        }
    }
}

/// Stop the embedding worker subprocess
#[tauri::command]
pub async fn stop_embedding_worker(
    app: AppHandle,
) -> Result<String, String> {
    info!("🛑 Stopping embedding worker subprocess via Tauri command");

    let manager = app.state::<Arc<Manager>>();

    match manager.stop_embedding_worker().await {
        Ok(_) => {
            info!("✅ Embedding worker stopped successfully");
            Ok("Embedding worker stopped successfully".to_string())
        }
        Err(e) => {
            error!("❌ Failed to stop embedding worker: {}", e);
            Err(format!("Failed to stop embedding worker: {}", e))
        }
    }
}

/// Get embedding worker health status
#[tauri::command]
pub async fn get_embedding_worker_status(
    app: AppHandle,
) -> Result<serde_json::Value, String> {
    debug!("📊 Getting embedding worker status");

    let manager = app.state::<Arc<Manager>>();
    let embedding_service = manager.get_embedding_service();

    let worker_running = embedding_service.is_worker_running();
    let stats = embedding_service.get_worker_stats();

    let mut status = serde_json::json!({
        "worker_running": worker_running,
        "service_available": true
    });

    // Add stats if available
    if let Some(worker_stats) = stats {
        status["uptime_seconds"] = serde_json::json!(worker_stats.uptime_seconds);
        status["request_count"] = serde_json::json!(worker_stats.request_count);
    }

    // Try to get detailed health status
    match embedding_service.health_check().await {
        Ok(health) => {
            status["health"] = serde_json::json!({
                "status": health.status,
                "python_ready": health.python_ready,
                "models": health.models,
                "memory_mb": health.memory_mb,
                "processed_requests": health.processed_requests,
                "avg_processing_time_ms": health.avg_processing_time_ms
            });
        }
        Err(e) => {
            status["health_error"] = serde_json::json!(e.to_string());
        }
    }

    Ok(status)
}

/// Generate embedding for text
#[tauri::command]
pub async fn generate_embedding(
    app: AppHandle,
    text: String,
    model: Option<String>,
) -> Result<Vec<f32>, String> {
    debug!("🔤 Generating embedding for text (length: {})", text.len());

    let manager = app.state::<Arc<Manager>>();
    let embedding_service = manager.get_embedding_service();

    match embedding_service.generate_embedding(text, model).await {
        Ok(embedding) => {
            debug!("✅ Generated embedding with {} dimensions", embedding.len());
            Ok(embedding)
        }
        Err(e) => {
            error!("❌ Failed to generate embedding: {}", e);
            Err(format!("Failed to generate embedding: {}", e))
        }
    }
}

/// Rerank documents using query
#[tauri::command]
pub async fn rerank_documents(
    app: AppHandle,
    query: String,
    documents: Vec<DocumentRequest>,
    top_k: Option<usize>,
) -> Result<Vec<RankedDocumentResponse>, String> {
    debug!("🔀 Reranking {} documents", documents.len());

    let manager = app.state::<Arc<Manager>>();
    let embedding_service = manager.get_embedding_service();

    // Convert frontend document format to service format
    let service_documents: Vec<DocumentToRerank> = documents
        .into_iter()
        .map(|doc| DocumentToRerank {
            id: doc.id,
            text: doc.text,
            metadata: doc.metadata,
        })
        .collect();

    match embedding_service.rerank_documents(query, service_documents, top_k).await {
        Ok(ranked_docs) => {
            debug!("✅ Reranked to {} documents", ranked_docs.len());

            // Convert service format to frontend format
            let response_docs: Vec<RankedDocumentResponse> = ranked_docs
                .into_iter()
                .map(|doc| RankedDocumentResponse {
                    id: doc.id,
                    text: doc.text,
                    score: doc.score,
                    original_rank: doc.original_rank,
                    metadata: doc.metadata,
                })
                .collect();

            Ok(response_docs)
        }
        Err(e) => {
            error!("❌ Failed to rerank documents: {}", e);
            Err(format!("Failed to rerank documents: {}", e))
        }
    }
}

/// Test embedding worker with simple greeting
#[tauri::command]
pub async fn test_embedding_worker(
    app: AppHandle,
    name: String,
) -> Result<String, String> {
    debug!("🧪 Testing embedding worker with greeting");

    let manager = app.state::<Arc<Manager>>();
    let embedding_service = manager.get_embedding_service();

    // For now, we'll generate a test embedding to verify the worker is functional
    let test_text = format!("Hello, {}! This is a test.", name);

    match embedding_service.generate_embedding(test_text.clone(), None).await {
        Ok(embedding) => {
            let response = format!(
                "🐍 Embedding worker test successful for '{}' - Generated {} dimensions",
                name,
                embedding.len()
            );
            debug!("✅ {}", response);
            Ok(response)
        }
        Err(e) => {
            error!("❌ Embedding worker test failed: {}", e);
            Err(format!("Embedding worker test failed: {}", e))
        }
    }
}

/// Restart embedding worker (stop + start)
#[tauri::command]
pub async fn restart_embedding_worker(
    app: AppHandle,
) -> Result<String, String> {
    info!("🔄 Restarting embedding worker subprocess");

    let manager = app.state::<Arc<Manager>>();

    // Stop current worker
    if let Err(e) = manager.stop_embedding_worker().await {
        error!("⚠️  Error stopping worker during restart: {}", e);
        // Continue anyway to try starting a new one
    }

    // Start new worker
    match manager.start_embedding_worker().await {
        Ok(_) => {
            info!("✅ Embedding worker restarted successfully");
            Ok("Embedding worker restarted successfully".to_string())
        }
        Err(e) => {
            error!("❌ Failed to restart embedding worker: {}", e);
            Err(format!("Failed to restart embedding worker: {}", e))
        }
    }
}

// Frontend-specific types for Tauri commands
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentRequest {
    pub id: String,
    pub text: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankedDocumentResponse {
    pub id: String,
    pub text: String,
    pub score: f32,
    pub original_rank: usize,
    pub metadata: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_request_serialization() {
        let doc = DocumentRequest {
            id: "test-1".to_string(),
            text: "Test document".to_string(),
            metadata: Some(serde_json::json!({"category": "test"})),
        };

        let json = serde_json::to_string(&doc).unwrap();
        let parsed: DocumentRequest = serde_json::from_str(&json).unwrap();

        assert_eq!(doc.id, parsed.id);
        assert_eq!(doc.text, parsed.text);
        assert_eq!(doc.metadata, parsed.metadata);
    }

    #[test]
    fn test_ranked_document_response_serialization() {
        let ranked_doc = RankedDocumentResponse {
            id: "test-1".to_string(),
            text: "Test document".to_string(),
            score: 0.85,
            original_rank: 2,
            metadata: Some(serde_json::json!({"category": "test"})),
        };

        let json = serde_json::to_string(&ranked_doc).unwrap();
        let parsed: RankedDocumentResponse = serde_json::from_str(&json).unwrap();

        assert_eq!(ranked_doc.id, parsed.id);
        assert_eq!(ranked_doc.score, parsed.score);
        assert_eq!(ranked_doc.original_rank, parsed.original_rank);
    }
}