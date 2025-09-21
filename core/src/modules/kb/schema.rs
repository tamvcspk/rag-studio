/*!
 * Knowledge Base Domain Schema
 *
 * Domain-specific schema definitions for Knowledge Base operations.
 */

// Note: This module would contain KB-specific database schema definitions
// For now, we re-export from the shared schema module to maintain compatibility

pub use crate::schemas::{
    SearchResult,
    CitationInfo,
    VectorSchema,
    SearchQuery,
    SearchType
};

// KB-specific schema extensions can be added here as needed
// Example:
// pub struct KbMetadataSchema {
//     pub id: String,
//     pub name: String,
//     pub status: String,
//     pub version: i32,
//     pub health_score: f64,
// }