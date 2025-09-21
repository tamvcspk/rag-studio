/*!
 * Knowledge Base Domain Errors
 *
 * Domain-specific error types for Knowledge Base operations.
 */

use crate::services::sql::SqlError;
use crate::services::vector::VectorDbError;

/// Knowledge Base Domain Error Types
#[derive(Debug, thiserror::Error)]
pub enum KbError {
    #[error("SQL service error: {0}")]
    SqlError(#[from] SqlError),

    #[error("Vector database error: {0}")]
    VectorError(#[from] VectorDbError),

    #[error("KB not found: {0}")]
    KbNotFound(String),

    #[error("Invalid search query: {0}")]
    InvalidQuery(String),

    #[error("Citation generation failed: {0}")]
    CitationError(String),

    #[error("Hybrid search failed: {0}")]
    HybridSearchError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("State error: {0}")]
    StateError(String),
}