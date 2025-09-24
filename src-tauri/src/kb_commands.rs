/*!
 * KB Tauri Commands
 *
 * Tauri commands for Knowledge Base operations following Phase 3.1 specifications.
 * Integrates with core KB service and provides real-time updates.
 */

use std::collections::HashMap;
use tauri::State;
use serde::{Serialize, Deserialize};
use tracing::{info, error};

// Import KbService trait for method calls
use rag_core::modules::kb::KbService;

use crate::manager::{Manager, KnowledgeBase, KnowledgeBaseStatus};

/// Request/Response types for frontend integration

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateKBRequest {
    pub name: String,
    pub product: String,
    pub version: String,
    pub description: Option<String>,
    pub content_source: String,
    pub source_url: Option<String>,
    pub embedding_model: String,
    pub chunk_size: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRequest {
    pub collection: String,
    pub query: String,
    pub top_k: Option<usize>,
    pub filters: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub chunk_id: String,
    pub score: f32,
    pub snippet: String,
    pub title: String,
    pub document_id: String,
    pub citation: CitationInfo,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CitationInfo {
    pub title: String,
    pub url: Option<String>,
    pub license: Option<String>,
    pub version: Option<String>,
    pub anchor: Option<String>,
}

/// Get all knowledge bases with current status
#[tauri::command]
pub async fn get_knowledge_bases(
    manager: State<'_, Manager>,
) -> Result<Vec<KnowledgeBase>, String> {
    info!("Getting knowledge bases list");

    let state = manager.app_state.read().await;
    let kbs = state.knowledge_bases.clone();

    info!("Retrieved {} knowledge bases", kbs.len());
    Ok(kbs)
}

/// Create a new knowledge base
#[tauri::command]
pub async fn create_knowledge_base(
    manager: State<'_, Manager>,
    request: CreateKBRequest,
) -> Result<KnowledgeBase, String> {
    info!("Creating knowledge base: {}", request.name);

    // Generate unique ID
    let kb_id = format!("kb_{}", uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_lowercase());

    // Create KB via service (this is a simplified version for MVP)
    // In real implementation, this would start an async ingest process
    let new_kb = KnowledgeBase {
        id: kb_id.clone(),
        name: request.name.clone(),
        product: request.product.clone(),
        version: request.version.clone(),
        description: request.description.clone(),
        status: KnowledgeBaseStatus::Pending,
        document_count: 0,
        chunk_count: 0,
        index_size: 0,
        health_score: 0.0,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    // Add to state
    {
        let mut state = manager.app_state.write().await;
        state.knowledge_bases.push(new_kb.clone());
        state.metrics.total_kbs += 1;
    }

    // Emit state delta
    manager.emit_state_delta("kb_created", serde_json::json!({
        "kb": new_kb
    })).await;

    // Start indexing process (simulated for MVP) - run in background
    let manager_clone = (*manager).clone();
    let kb_id_clone = kb_id.clone();
    tauri::async_runtime::spawn(async move {
        simulate_indexing_process(&manager_clone, &kb_id_clone).await;
    });

    info!("Knowledge base created: {}", kb_id);
    Ok(new_kb)
}

/// Search in knowledge base using hybrid search
#[tauri::command]
pub async fn search_knowledge_base(
    manager: State<'_, Manager>,
    request: SearchRequest,
) -> Result<Vec<SearchResult>, String> {
    info!("Searching in collection: {} with query: {}", request.collection, request.query);

    let start_time = std::time::Instant::now();

    // Call KB service for hybrid search
    let search_results = manager.kb_service
        .hybrid_search(
            &request.collection,
            &request.query,
            request.top_k.unwrap_or(10),
            request.filters,
            None, // No cache TTL for MVP
        )
        .await
        .map_err(|e| format!("Search failed: {}", e))?;

    let latency_ms = start_time.elapsed().as_millis() as f32;

    // Convert to frontend format
    let results: Vec<SearchResult> = search_results.into_iter().map(|result| {
        SearchResult {
            chunk_id: result.chunk_id,
            score: result.score,
            snippet: result.snippet,
            title: result.citation.title.clone(),
            document_id: result.document_id,
            citation: CitationInfo {
                title: result.citation.title,
                url: Some(result.citation.source_path), // Use source_path as URL
                license: result.citation.license,
                version: result.citation.version,
                anchor: result.citation.anchor,
            },
            metadata: result.metadata,
        }
    }).collect();

    // Update metrics
    {
        let mut state = manager.app_state.write().await;
        // Simple moving average for latency
        state.metrics.avg_query_latency_ms = (state.metrics.avg_query_latency_ms + latency_ms) / 2.0;
    }

    // Emit metrics update
    manager.emit_state_delta("search_completed", serde_json::json!({
        "collection": request.collection,
        "query": request.query,
        "results_count": results.len(),
        "latency_ms": latency_ms
    })).await;

    info!("Search completed: {} results in {}ms", results.len(), latency_ms);
    Ok(results)
}

/// Delete a knowledge base
#[tauri::command]
pub async fn delete_knowledge_base(
    manager: State<'_, Manager>,
    kb_id: String,
) -> Result<(), String> {
    info!("Deleting knowledge base: {}", kb_id);

    // Remove from state
    {
        let mut state = manager.app_state.write().await;
        let original_len = state.knowledge_bases.len();
        state.knowledge_bases.retain(|kb| kb.id != kb_id);

        if state.knowledge_bases.len() < original_len {
            state.metrics.total_kbs = state.knowledge_bases.len() as u32;
        } else {
            return Err("Knowledge base not found".to_string());
        }
    }

    // TODO: Call KB service to actually delete data

    // Emit state delta
    manager.emit_state_delta("kb_deleted", serde_json::json!({
        "kb_id": kb_id
    })).await;

    info!("Knowledge base deleted: {}", kb_id);
    Ok(())
}

/// Export knowledge base as .kbpack file
#[tauri::command]
pub async fn export_knowledge_base(
    manager: State<'_, Manager>,
    kb_id: String,
) -> Result<Vec<u8>, String> {
    info!("Exporting knowledge base: {}", kb_id);

    // Find KB
    let kb = {
        let state = manager.app_state.read().await;
        state.knowledge_bases.iter()
            .find(|kb| kb.id == kb_id)
            .cloned()
            .ok_or("Knowledge base not found")?
    };

    // TODO: Call KB service to export actual data
    // For MVP, return mock ZIP data
    let mock_export_data = format!(
        "{{\"kb_id\": \"{}\", \"name\": \"{}\", \"version\": \"{}\", \"exported_at\": \"{}\"}}",
        kb.id, kb.name, kb.version, chrono::Utc::now().to_rfc3339()
    );

    info!("Knowledge base exported: {}", kb_id);
    Ok(mock_export_data.into_bytes())
}

/// Start reindexing a knowledge base
#[tauri::command]
pub async fn reindex_knowledge_base(
    manager: State<'_, Manager>,
    kb_id: String,
) -> Result<(), String> {
    info!("Starting reindex for knowledge base: {}", kb_id);

    // Update status to indexing
    manager.update_kb_status(&kb_id, KnowledgeBaseStatus::Indexing).await
        .map_err(|e| format!("Failed to update KB status: {}", e))?;

    // Start reindexing process (simulated for MVP) - run in background
    let manager_clone = (*manager).clone();
    let kb_id_clone = kb_id.clone();
    tauri::async_runtime::spawn(async move {
        simulate_indexing_process(&manager_clone, &kb_id_clone).await;
    });

    info!("Reindexing started for knowledge base: {}", kb_id);
    Ok(())
}

/// Get application state for initial load
#[tauri::command]
pub async fn get_app_state(
    manager: State<'_, Manager>,
) -> Result<crate::manager::AppState, String> {
    let state = manager.app_state.read().await;
    Ok(state.clone())
}

/// Get health status of all services
#[tauri::command]
pub async fn get_health_status(
    manager: State<'_, Manager>,
) -> Result<serde_json::Value, String> {
    manager.health_check().await
        .map_err(|e| format!("Health check failed: {}", e))
}

/// Simulate indexing process for MVP (will be replaced with real implementation)
async fn simulate_indexing_process(manager: &Manager, kb_id: &str) {
    info!("Starting simulated indexing for KB: {}", kb_id);

    // Simulate indexing steps with progress
    let steps = vec![
        ("parsing", 0.2),
        ("chunking", 0.4),
        ("embedding", 0.7),
        ("indexing", 0.9),
        ("completed", 1.0),
    ];

    for (step, progress) in steps {
        // Simulate processing time
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // Emit progress update
        manager.emit_state_delta("kb_indexing_progress", serde_json::json!({
            "kb_id": kb_id,
            "step": step,
            "progress": progress
        })).await;

        info!("KB {} indexing progress: {} ({}%)", kb_id, step, (progress * 100.0) as u32);
    }

    // Mark as completed
    if let Err(e) = manager.update_kb_status(kb_id, KnowledgeBaseStatus::Indexed).await {
        error!("Failed to update KB status to indexed: {}", e);
        let _ = manager.update_kb_status(kb_id, KnowledgeBaseStatus::Failed).await;
    }

    // Update final metrics
    {
        let mut state = manager.app_state.write().await;
        if let Some(kb) = state.knowledge_bases.iter_mut().find(|kb| kb.id == kb_id) {
            kb.document_count = 25; // Simulated
            kb.chunk_count = 150;   // Simulated
            kb.index_size = 1024 * 1024; // 1MB simulated
            kb.health_score = 0.95; // High health score
        }

        // Recalculate metrics
        state.metrics.indexed_kbs = state.knowledge_bases.iter()
            .filter(|kb| matches!(kb.status, KnowledgeBaseStatus::Indexed))
            .count() as u32;
        state.metrics.indexing_kbs = state.knowledge_bases.iter()
            .filter(|kb| matches!(kb.status, KnowledgeBaseStatus::Indexing))
            .count() as u32;
        state.metrics.total_documents = state.knowledge_bases.iter()
            .map(|kb| kb.document_count)
            .sum();
        state.metrics.total_chunks = state.knowledge_bases.iter()
            .map(|kb| kb.chunk_count)
            .sum();
    }

    manager.emit_state_delta("kb_indexing_completed", serde_json::json!({
        "kb_id": kb_id
    })).await;

    info!("Simulated indexing completed for KB: {}", kb_id);
}