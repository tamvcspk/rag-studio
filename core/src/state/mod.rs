/*!
 * Application State Management Module
 *
 * Centralized state management for the RAG Studio application.
 */

pub mod app_state;
pub mod manager;

// Re-export public types
pub use app_state::*;
pub use manager::StateManager;