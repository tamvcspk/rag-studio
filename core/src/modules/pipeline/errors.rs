/*!
 * Pipeline Error Types
 *
 * Comprehensive error handling for Pipeline operations following
 * the established error pattern from other core modules.
 */

use thiserror::Error;
use serde::{Deserialize, Serialize};

pub type PipelineResult<T> = Result<T, PipelineError>;

#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum PipelineError {
    #[error("Pipeline not found: {id}")]
    NotFound { id: String },

    #[error("Pipeline validation failed: {details}")]
    ValidationFailed { details: String },

    #[error("Pipeline execution failed at step '{step}': {message}")]
    ExecutionFailed { step: String, message: String },

    #[error("Step '{step_type}' is not implemented")]
    StepNotImplemented { step_type: String },

    #[error("Invalid step configuration for '{step}': {reason}")]
    InvalidStepConfig { step: String, reason: String },

    #[error("Step dependency error: {details}")]
    DependencyError { details: String },

    #[error("Template not found: {template_id}")]
    TemplateNotFound { template_id: String },

    #[error("Parameter validation failed: {parameter}: {reason}")]
    ParameterValidationFailed { parameter: String, reason: String },

    #[error("Model not available: {model_id} - {suggestion}")]
    ModelNotAvailable { model_id: String, suggestion: String },

    #[error("Model error for {model_id}: {message} - fallback: {fallback}")]
    ModelError { model_id: String, message: String, fallback: String },

    #[error("Pipeline timeout after {timeout_seconds} seconds")]
    Timeout { timeout_seconds: u64 },

    #[error("Pipeline cancelled by user")]
    Cancelled,

    #[error("Resource limit exceeded: {resource}: {current}/{limit}")]
    ResourceLimitExceeded { resource: String, current: u64, limit: u64 },

    #[error("IO error: {message}")]
    IoError { message: String },

    #[error("JSON serialization error: {message}")]
    JsonError { message: String },

    #[error("Database error: {message}")]
    DatabaseError { message: String },

    #[error("Storage error: {message}")]
    StorageError { message: String },

    #[error("Embedding service error: {message}")]
    EmbeddingError { message: String },

    #[error("Cache error: {message}")]
    CacheError { message: String },

    #[error("Internal error: {message}")]
    Internal { message: String },
}

impl From<std::io::Error> for PipelineError {
    fn from(err: std::io::Error) -> Self {
        PipelineError::IoError { message: err.to_string() }
    }
}

impl From<serde_json::Error> for PipelineError {
    fn from(err: serde_json::Error) -> Self {
        PipelineError::JsonError { message: err.to_string() }
    }
}

// Integration with other core service errors
impl From<crate::SqlError> for PipelineError {
    fn from(err: crate::SqlError) -> Self {
        PipelineError::DatabaseError { message: err.to_string() }
    }
}

impl From<crate::StorageError> for PipelineError {
    fn from(err: crate::StorageError) -> Self {
        PipelineError::StorageError { message: err.to_string() }
    }
}

impl From<crate::CacheError> for PipelineError {
    fn from(err: crate::CacheError) -> Self {
        PipelineError::CacheError { message: err.to_string() }
    }
}

// Validation warning types for model compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationWarning {
    SuboptimalModel {
        current: String,
        suggested: String,
        reason: String,
    },
    ModelDownloading {
        model_id: String,
        progress: f32,
        eta_seconds: u64,
    },
    PerformanceWarning {
        step: String,
        message: String,
        level: WarningLevel,
    },
    CompatibilityWarning {
        component: String,
        message: String,
        level: WarningLevel,
    },
    ParameterValidationFailed {
        parameter: String,
        reason: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WarningLevel {
    Low,
    Medium,
    High,
}