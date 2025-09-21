/*!
 * Knowledge Base Domain Module
 *
 * Business logic for Knowledge Base operations following domain-driven design principles.
 */

pub mod service;
pub mod models;
pub mod schema;
pub mod errors;

// Re-export public types
pub use service::{KbService, KbServiceImpl};
pub use models::*;
pub use schema::*;
pub use errors::KbError;