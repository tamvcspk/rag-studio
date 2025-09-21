/*!
 * Manager - Composition Root
 *
 * Following CORE_DESIGN.md architecture:
 * - DI Services: Initialized from config with hot-reload support
 * - State Management: Arc<RwLock<AppState>> pattern for MVP
 * - Real-time Updates: Tauri events for frontend sync
 */

use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Emitter};
use tracing::{info, error};

// Core imports
use rag_core::{
    SqlService, SqlConfig,
    modules::kb::{KbService, KbServiceImpl, KbConfig},
    services::vector::{VectorDbService, VectorDbConfig},
    StateManager,
};

/// Application State for MVP
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub knowledge_bases: Vec<KnowledgeBase>,
    pub runs: Vec<IngestRun>,
    pub metrics: AppMetrics,
    pub is_loading: bool,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeBase {
    pub id: String,
    pub name: String,
    pub product: String,
    pub version: String,
    pub description: Option<String>,
    pub status: KnowledgeBaseStatus,
    pub document_count: u32,
    pub chunk_count: u32,
    pub index_size: u64,
    pub health_score: f32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KnowledgeBaseStatus {
    #[serde(rename = "indexed")]
    Indexed,
    #[serde(rename = "indexing")]
    Indexing,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "pending")]
    Pending,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngestRun {
    pub id: String,
    pub kb_id: String,
    pub status: String,
    pub progress: f32,
    pub documents_processed: u32,
    pub total_documents: u32,
    pub started_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppMetrics {
    pub total_kbs: u32,
    pub indexed_kbs: u32,
    pub indexing_kbs: u32,
    pub failed_kbs: u32,
    pub total_documents: u32,
    pub total_chunks: u32,
    pub avg_query_latency_ms: f32,
    pub cache_hit_rate: f32,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            knowledge_bases: Vec::new(),
            runs: Vec::new(),
            metrics: AppMetrics::default(),
            is_loading: false,
            last_error: None,
        }
    }
}

impl Default for AppMetrics {
    fn default() -> Self {
        Self {
            total_kbs: 0,
            indexed_kbs: 0,
            indexing_kbs: 0,
            failed_kbs: 0,
            total_documents: 0,
            total_chunks: 0,
            avg_query_latency_ms: 0.0,
            cache_hit_rate: 0.0,
        }
    }
}

/// Manager - Main composition root following CORE_DESIGN.md
#[derive(Clone)]
pub struct Manager {
    pub app_state: Arc<RwLock<AppState>>,
    pub sql_service: Arc<SqlService>,
    pub vector_service: Arc<VectorDbService>,
    pub kb_service: Arc<KbServiceImpl>,
    pub app_handle: Option<AppHandle>,
}

impl Manager {
    /// Initialize Manager with MVP configuration
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        info!("Initializing Manager with MVP configuration");

        // Initialize SQL service with MVP config
        let sql_config = SqlConfig::new_mvp("./rag_studio.db");
        let sql_service = Arc::new(SqlService::new(sql_config).await?);

        // Run migrations
        sql_service.run_migrations().await?;
        info!("SQL service initialized and migrations completed");

        // Initialize Vector service with MVP config (graceful fallback)
        let vector_config = VectorDbConfig::default(); // MVP with fallback
        let vector_service = Arc::new(VectorDbService::new(vector_config).await?);
        info!("Vector service initialized with MVP configuration");

        // Initialize State Manager
        let state_manager = Arc::new(StateManager::new());
        info!("State manager initialized");

        // Initialize KB service
        let kb_config = KbConfig::mvp();
        let kb_service = Arc::new(KbServiceImpl::new(
            sql_service.clone(),
            vector_service.clone(),
            state_manager.clone(),
            kb_config,
        ));
        info!("KB service initialized");

        // Initialize application state
        let app_state = Arc::new(RwLock::new(AppState::default()));

        Ok(Self {
            app_state,
            sql_service,
            vector_service,
            kb_service,
            app_handle: None,
        })
    }

    /// Set Tauri app handle for event emission
    pub fn set_app_handle(&mut self, app_handle: AppHandle) {
        self.app_handle = Some(app_handle);
        info!("Tauri app handle set for real-time events");
    }

    /// Emit state delta to frontend (real-time sync)
    pub async fn emit_state_delta(&self, delta_type: &str, payload: serde_json::Value) {
        if let Some(app_handle) = &self.app_handle {
            let event_data = serde_json::json!({
                "type": delta_type,
                "payload": payload,
                "timestamp": chrono::Utc::now().to_rfc3339()
            });

            if let Err(e) = app_handle.emit("state_delta", event_data) {
                error!("Failed to emit state delta: {}", e);
            }
        }
    }

    /// Load initial state from database
    pub async fn load_initial_state(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("Loading initial state from database");

        // Load KBs from SQL service
        let kb_stats = self.kb_service.get_stats(None, None).await?;

        let mut state = self.app_state.write().await;

        // Update metrics (using available fields from KbStats)
        state.metrics.total_kbs = 0; // Will be computed from loaded KBs
        state.metrics.total_documents = kb_stats.document_count as u32;
        state.metrics.total_chunks = kb_stats.chunk_count as u32;
        state.metrics.avg_query_latency_ms = 0.0; // Will be updated by queries
        state.metrics.cache_hit_rate = 0.0; // Will be updated by cache service

        // Load KB list
        let kb_list = self.kb_service.list_collections(None).await?;
        state.knowledge_bases = kb_list.into_iter().map(|kb_info| {
            let status = match kb_info.health_score {
                score if score > 0.8 => KnowledgeBaseStatus::Indexed,
                score if score > 0.0 => KnowledgeBaseStatus::Indexing,
                _ => KnowledgeBaseStatus::Failed,
            };

            KnowledgeBase {
                id: kb_info.id,
                name: kb_info.name,
                product: "default".to_string(), // MVP default
                version: kb_info.version.to_string(),
                description: kb_info.description,
                status,
                document_count: 0, // Will be loaded separately
                chunk_count: 0,    // Will be loaded separately
                index_size: 0,     // Will be loaded separately
                health_score: kb_info.health_score as f32,
                created_at: chrono::Utc::now().to_rfc3339(), // MVP fallback
                updated_at: chrono::Utc::now().to_rfc3339(), // MVP fallback
            }
        }).collect();

        // Update computed metrics
        state.metrics.indexed_kbs = state.knowledge_bases.iter()
            .filter(|kb| matches!(kb.status, KnowledgeBaseStatus::Indexed))
            .count() as u32;
        state.metrics.indexing_kbs = state.knowledge_bases.iter()
            .filter(|kb| matches!(kb.status, KnowledgeBaseStatus::Indexing))
            .count() as u32;
        state.metrics.failed_kbs = state.knowledge_bases.iter()
            .filter(|kb| matches!(kb.status, KnowledgeBaseStatus::Failed))
            .count() as u32;

        info!("Initial state loaded: {} KBs, {} documents",
              state.knowledge_bases.len(), state.metrics.total_documents);

        Ok(())
    }

    /// Update KB status and emit delta
    pub async fn update_kb_status(&self, kb_id: &str, status: KnowledgeBaseStatus) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        {
            let mut state = self.app_state.write().await;
            if let Some(kb) = state.knowledge_bases.iter_mut().find(|kb| kb.id == kb_id) {
                kb.status = status.clone();
                kb.updated_at = chrono::Utc::now().to_rfc3339();
            }
        }

        // Emit delta to frontend
        self.emit_state_delta("kb_status_updated", serde_json::json!({
            "kb_id": kb_id,
            "status": status
        })).await;

        Ok(())
    }

    /// Health check for all services
    pub async fn health_check(&self) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
        let sql_health = self.sql_service.health_check().await?;
        let vector_health = self.vector_service.health_check().await?;

        Ok(serde_json::json!({
            "sql": {
                "status": "healthy",
                "app_db_size": sql_health.app_db_size,
                "is_split_database": sql_health.is_split_database
            },
            "vector": {
                "status": match vector_health {
                    rag_core::services::vector::HealthStatus::Healthy => "healthy",
                    rag_core::services::vector::HealthStatus::Degraded => "degraded",
                    rag_core::services::vector::HealthStatus::Unhealthy => "unhealthy",
                },
                "mode": format!("{:?}", vector_health)
            },
            "overall": "healthy"
        }))
    }
}