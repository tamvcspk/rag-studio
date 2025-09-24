/*!
 * Manager - Composition Root
 *
 * Following CORE_DESIGN.md architecture:
 * - DI Services: Initialized from config with hot-reload support
 * - State Management: Arc<RwLock<AppState>> pattern for MVP
 * - Real-time Updates: Tauri events for frontend sync
 */

use std::sync::Arc;
use serde_json;
use tauri::{AppHandle, Emitter};
use tracing::{info, error};

// Core imports
use rag_core::{
    SqlService, SqlConfig, SqlError,
    modules::kb::{KbService, KbServiceImpl, KbConfig, KbStats, KbInfo, KbError},
    services::vector::{VectorDbService, VectorDbConfig, VectorDbError},
    state::{AppState, StateManager, StateDelta, KnowledgeBaseState, KnowledgeBaseStatus},
    CoreError, CoreResult,
};

// Removed duplicate AppState and related types - now using canonical types from core crate

/// Manager - Main composition root following CORE_DESIGN.md
/// Manager - Main composition root following CORE_DESIGN.md
#[derive(Clone)]
pub struct Manager {
    pub state_manager: Arc<StateManager>,
    pub sql_service: Arc<SqlService>,
    pub vector_service: Arc<VectorDbService>,
    pub kb_service: Arc<KbServiceImpl>,
    pub app_handle: Option<AppHandle>,
}

impl Manager {
    /// Initialize Manager with MVP configuration following CORE_DESIGN.md
    pub async fn new() -> CoreResult<Self> {
        info!("Initializing Manager with MVP configuration");

        // Initialize SQL service with MVP config
        let sql_config = SqlConfig::new_mvp("./rag_studio.db");
        let sql_service = Arc::new(SqlService::new(sql_config).await.map_err(|e| CoreError::Service(e.to_string()))?);

        // Run migrations
        sql_service.run_migrations().await.map_err(|e| CoreError::Service(e.to_string()))?;
        info!("SQL service initialized and migrations completed");

        // Initialize Vector service with MVP config (graceful fallback)
        let vector_config = VectorDbConfig::default(); // MVP with fallback
        let vector_service = Arc::new(VectorDbService::new(vector_config).await.map_err(|e| CoreError::Service(e.to_string()))?);
        info!("Vector service initialized with MVP configuration");

        // Initialize State Manager - canonical from core crate
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

        Ok(Self {
            state_manager,
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

    /// Get state manager for reading/writing application state
    pub fn get_state_manager(&self) -> Arc<StateManager> {
        self.state_manager.clone()
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

    /// Load initial state from database using StateManager pattern
    pub async fn load_initial_state(&self) -> CoreResult<()> {
        info!("Loading initial state from database");

        // Load KBs from SQL service
        let kb_stats = self.kb_service.get_stats(None, None).await.map_err(|e| CoreError::Service(e.to_string()))?;
        let kb_list = self.kb_service.list_collections(None).await.map_err(|e| CoreError::Service(e.to_string()))?;

        // Convert KbInfo to KnowledgeBaseState for the canonical state
        let kb_count = kb_list.len();
        for kb_info in kb_list {
            let status = match kb_info.health_score {
                score if score > 0.8 => KnowledgeBaseStatus::Active,
                score if score > 0.0 => KnowledgeBaseStatus::Building,
                _ => KnowledgeBaseStatus::Error("Health check failed".to_string()),
            };

            let kb_state = KnowledgeBaseState {
                id: kb_info.id.clone(),
                name: kb_info.name,
                version: kb_info.version,
                status,
                embedder_model: "sentence-transformers/all-MiniLM-L6-v2".to_string(), // MVP default
                health_score: kb_info.health_score,
                document_count: 0, // Will be loaded separately
                chunk_count: 0,    // Will be loaded separately
                last_updated: chrono::Utc::now(),
                metadata: serde_json::json!({
                    "description": kb_info.description,
                    "product": "default"
                }),
            };

            // Add KB to state using StateManager
            self.state_manager.mutate(StateDelta::KnowledgeBaseAdd { kb: kb_state })
                .map_err(|e| CoreError::State(e))?;
        }

        info!("Initial state loaded: {} KBs, {} documents",
              kb_count, kb_stats.document_count);

        Ok(())
    }

    /// Update KB status using StateManager pattern
    pub async fn update_kb_status(&self, kb_id: &str, status: KnowledgeBaseStatus) -> CoreResult<()> {
        // Update state using StateManager
        let updates = serde_json::json!({
            "status": status,
            "last_updated": chrono::Utc::now()
        });

        self.state_manager.mutate(StateDelta::KnowledgeBaseUpdate {
            id: kb_id.to_string(),
            updates
        }).map_err(|e| CoreError::State(e))?;

        // Emit delta to frontend
        self.emit_state_delta("kb_status_updated", serde_json::json!({
            "kb_id": kb_id,
            "status": status
        })).await;

        Ok(())
    }

    /// Health check for all services
    pub async fn health_check(&self) -> CoreResult<serde_json::Value> {
        let sql_health = self.sql_service.health_check().await.map_err(|e| CoreError::Service(e.to_string()))?;
        let vector_health = self.vector_service.health_check().await.map_err(|e| CoreError::Service(e.to_string()))?;

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