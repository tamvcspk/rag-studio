/*!
 * Vector Database module for RAG Studio
 *
 * Provides LanceDB integration with vector storage, search, and management.
 * Follows consistent service structure with SQL service pattern.
 */

pub mod vector;

// Re-export main types following SQL service pattern
pub use vector::*;