/*!
 * Core crate for RAG Studio
 *
 * Provides domain modules, infrastructure services, and shared utilities
 * following Rust conventions and domain-driven design principles.
 */

// Domain modules (business logic)
pub mod modules;

// Infrastructure services (cross-cutting concerns)
pub mod services;

// Application state management
pub mod state;

// Shared components
pub mod models;
pub mod schemas;
pub mod errors;
pub mod utils;

// Re-export commonly used domain types
pub use modules::kb::{KbService, KbServiceImpl, KbError, KbConfig, DocumentInfo, KbStats, KbInfo};
pub use modules::pipeline::{
    PipelineService, PipelineServiceImpl, PipelineError, PipelineResult,
    Pipeline, PipelineRun, PipelineTemplate, ETLStepType, PipelineStatus,
    PipelineExecutor, ExecutionContext, StepResult, KB_CREATION_TEMPLATES,
    get_kb_creation_template, PipelineRunStatus, PipelineSpec, PipelineRunMetrics,
    RunTrigger, PipelineStep
};

// Re-export commonly used infrastructure services
pub use services::sql::{SqlService, SqlConfig, SqlError};
pub use services::vector::{
    VectorDbService, VectorDbConfig, VectorDbError,
    HybridConfig, GenerationManager
};
pub use services::embedding::{
    EmbeddingService, EmbeddingConfig, EmbeddingRequest, EmbeddingResponse,
    DocumentToRerank, RankedDocument, HealthStatus as EmbeddingHealthStatus
};
pub use services::cache::{CacheService, CacheConfig, CacheError, CacheStats, StringCache, BytesCache, JsonCache};
pub use services::storage::{StorageService, StorageConfig, StorageError, StorageStats, FileMetadata, PackManifest};
pub use services::model::{
    ModelService, ModelConfig, ModelError, ModelMetadata, ModelType, ModelSource,
    ModelStatus, PerformanceMetrics, ModelStorageStats, ValidationWarning
};
pub use schemas::{VectorSchema, SearchResult, SearchQuery, SearchType, CitationInfo};

// Re-export state management
pub use state::{AppState, StateManager};

// Re-export shared types
pub use models::common::*;
pub use errors::{CoreError, CoreResult};

// Re-export external types that are used throughout the application
pub use chrono::{DateTime, Utc, NaiveDateTime};
pub use serde::{Deserialize, Serialize};
pub use uuid::Uuid;