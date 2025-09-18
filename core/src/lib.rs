/*!
 * Core crate for RAG Studio
 *
 * Provides shared types, services, and utilities for the RAG Studio application.
 * This includes database services, state management, and common patterns.
 */

pub mod services;
pub mod state;

// Re-export commonly used types
pub use services::sql::{SqlService, SqlConfig, SqlError};
pub use state::AppState;

// Re-export external types that are used throughout the application
pub use chrono::{DateTime, Utc, NaiveDateTime};
pub use serde::{Deserialize, Serialize};
pub use uuid::Uuid;