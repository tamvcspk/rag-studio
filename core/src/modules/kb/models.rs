/*!
 * Knowledge Base Domain Models
 *
 * Data structures specific to the Knowledge Base domain.
 */

use serde::{Deserialize, Serialize};

/// Knowledge Base Configuration
#[derive(Debug, Clone)]
pub struct KbConfig {
    pub enable_citations: bool,         // MVP: Always true (mandatory citations)
    pub hybrid_search_enabled: bool,    // MVP: True for BM25 + Vector
    pub rerank_enabled: bool,           // MVP: False (simple scoring)
    pub cache_enabled: bool,            // MVP: Basic caching
    pub max_results: usize,             // Default: 100
    pub citation_required: bool,        // MVP: Always true
}

impl Default for KbConfig {
    fn default() -> Self {
        Self {
            enable_citations: true,
            hybrid_search_enabled: true,
            rerank_enabled: false,      // MVP: Disable complex reranking
            cache_enabled: true,
            max_results: 100,
            citation_required: true,    // MVP: "No citation → no answer"
        }
    }
}

impl KbConfig {
    /// MVP configuration for development
    pub fn mvp() -> Self {
        Self {
            enable_citations: true,
            hybrid_search_enabled: true,
            rerank_enabled: false,
            cache_enabled: true,
            max_results: 50,           // Conservative for MVP
            citation_required: true,
        }
    }

    /// Production configuration
    pub fn production() -> Self {
        Self {
            enable_citations: true,
            hybrid_search_enabled: true,
            rerank_enabled: true,      // Enable advanced reranking
            cache_enabled: true,
            max_results: 100,
            citation_required: true,
        }
    }

    /// Test configuration
    pub fn test() -> Self {
        Self {
            enable_citations: true,
            hybrid_search_enabled: false,  // Simple for testing
            rerank_enabled: false,
            cache_enabled: false,
            max_results: 10,
            citation_required: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KbCreateConfig {
    pub description: Option<String>,
    pub embedder_model: String,
    pub chunk_size: usize,
    pub chunk_overlap: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct DocumentInfo {
    pub id: String,
    pub title: String,
    pub source_path: String,
    pub license_info: Option<String>,
    pub version: i32,
    pub chunk_count: i32,
    pub size_bytes: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct KbStats {
    pub collection_name: Option<String>,
    pub version: i32,
    pub document_count: usize,
    pub chunk_count: usize,
    pub size_bytes: u64,
    pub health_score: f64,
    pub embedder_version: String,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct KbInfo {
    pub id: String,
    pub name: String,
    pub version: i32,
    pub status: String,
    pub description: Option<String>,
    pub health_score: f64,
    pub pinned: bool,
    pub flows: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct KbStateInfo {
    pub id: String,
    pub name: String,
    pub status: String,
    pub health_score: f64,
    pub version: i32,
}

#[derive(Debug, Clone, Serialize)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kb_config_variants() {
        let mvp = KbConfig::mvp();
        assert!(mvp.citation_required);
        assert!(!mvp.rerank_enabled);
        assert_eq!(mvp.max_results, 50);

        let prod = KbConfig::production();
        assert!(prod.citation_required);
        assert!(prod.rerank_enabled);
        assert_eq!(prod.max_results, 100);

        let test = KbConfig::test();
        assert!(test.citation_required);
        assert!(!test.hybrid_search_enabled);
        assert_eq!(test.max_results, 10);
    }

    #[test]
    fn test_kb_create_config() {
        let config = KbCreateConfig {
            description: Some("Test KB".to_string()),
            embedder_model: "sentence-transformers/all-MiniLM-L6-v2".to_string(),
            chunk_size: 512,
            chunk_overlap: 50,
        };

        assert_eq!(config.chunk_size, 512);
        assert_eq!(config.chunk_overlap, 50);
    }
}