/*!
 * Pipeline Module - Core Pipeline System Implementation
 *
 * Implements unified ETL workflows as specified in CORE_DESIGN.md Section 3.1.
 * This module provides the foundation for Pipeline execution and KB creation
 * through Pipeline templates, eliminating the architectural overlap identified
 * in the current system.
 */

pub mod models;
pub mod service;
pub mod executor;
pub mod templates;
pub mod errors;

// Re-export public types
pub use models::*;
pub use service::{PipelineService, PipelineServiceImpl};
pub use executor::{PipelineExecutor, ExecutionContext, StepResult};
pub use templates::{KB_CREATION_TEMPLATES, get_kb_creation_template};
pub use errors::{PipelineError, PipelineResult};