/*!
 * Knowledge Base Domain Service
 *
 * Core business logic for KB operations following the CORE_DESIGN.md architecture:
 * - Hybrid Search: Vector (LanceDB) + BM25 (tantivy) with reranking
 * - Versioning: Atomic promotion with generation management
 * - Citations: Mandatory citation enrichment
 * - State Integration: Arc<RwLock<AppState>> for MVP
 */

use std::collections::HashMap;
use std::sync::Arc;
use async_trait::async_trait;
use tracing;

// Domain imports
use super::models::*;
use super::schema::*;
use super::errors::KbError;

// Infrastructure service imports
use crate::services::sql::SqlService;
use crate::services::vector::{VectorDbService, VectorDbServiceTrait, HealthStatus as VectorHealthStatus};
use crate::state::StateManager;

/// Knowledge Base Service trait for dependency injection
#[async_trait]
pub trait KbService: Send + Sync {
    /// Hybrid search combining vector and BM25
    async fn hybrid_search(
        &self,
        collection: &str,
        query: &str,
        top_k: usize,
        filters: Option<HashMap<String, serde_json::Value>>,
        cache_ttl: Option<u64>,
    ) -> Result<Vec<SearchResult>, KbError>;

    /// Get document by ID with optional range
    async fn get_document(
        &self,
        doc_id: &str,
        range: Option<(usize, usize)>,
    ) -> Result<DocumentInfo, KbError>;

    /// Resolve citations for chunk IDs
    async fn resolve_citations(
        &self,
        chunk_ids: Vec<String>,
    ) -> Result<Vec<CitationInfo>, KbError>;

    /// Get KB statistics and health
    async fn get_stats(
        &self,
        collection: Option<String>,
        version: Option<i32>,
    ) -> Result<KbStats, KbError>;

    /// List available knowledge bases
    async fn list_collections(
        &self,
        filters: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<Vec<KbInfo>, KbError>;

    /// Create a new collection
    async fn create_collection(
        &self,
        name: &str,
        config: KbCreateConfig,
    ) -> Result<String, KbError>;

    /// Health check
    async fn health_check(&self) -> Result<HealthStatus, KbError>;
}

/// KB Service implementation with dependency injection
pub struct KbServiceImpl {
    sql_service: Arc<SqlService>,
    vector_service: Arc<VectorDbService>,
    state_manager: Arc<StateManager>,
    config: KbConfig,
}

impl KbServiceImpl {
    /// Create new KB service with injected dependencies
    pub fn new(
        sql_service: Arc<SqlService>,
        vector_service: Arc<VectorDbService>,
        state_manager: Arc<StateManager>,
        config: KbConfig,
    ) -> Self {
        Self {
            sql_service,
            vector_service,
            state_manager,
            config,
        }
    }

    /// MVP constructor with basic services
    pub fn new_mvp(
        sql_service: Arc<SqlService>,
        vector_service: Arc<VectorDbService>,
        state_manager: Arc<StateManager>,
    ) -> Self {
        Self::new(
            sql_service,
            vector_service,
            state_manager,
            KbConfig::mvp(),
        )
    }

    /// Validate search query
    fn validate_query(&self, query: &str, top_k: usize) -> Result<(), KbError> {
        if query.trim().is_empty() {
            return Err(KbError::InvalidQuery("Query cannot be empty".to_string()));
        }

        if top_k == 0 || top_k > self.config.max_results {
            return Err(KbError::InvalidQuery(
                format!("top_k must be between 1 and {}", self.config.max_results)
            ));
        }

        Ok(())
    }

    /// Get KB state from StateManager (MVP pattern)
    fn get_kb_state(&self, collection: &str) -> Result<KbStateInfo, KbError> {
        let state = self.state_manager.read_state();

        // MVP: Simple lookup in knowledge_bases HashMap
        if let Some(kb) = state.knowledge_bases.get(collection) {
            Ok(KbStateInfo {
                id: kb.id.clone(),
                name: kb.name.clone(),
                status: format!("{:?}", kb.status),
                health_score: kb.health_score,
                version: kb.version,
            })
        } else {
            Err(KbError::KbNotFound(collection.to_string()))
        }
    }

    /// Enrich results with citations (mandatory for MVP)
    async fn enrich_with_citations(
        &self,
        mut results: Vec<SearchResult>,
    ) -> Result<Vec<SearchResult>, KbError> {
        if !self.config.enable_citations {
            return Ok(results);
        }

        for result in &mut results {
            // Get document metadata for citation
            let doc_info = self.get_document_info(&result.document_id).await?;

            result.citation = CitationInfo {
                title: doc_info.title,
                source_path: doc_info.source_path,
                license: doc_info.license_info,
                version: Some(doc_info.version.to_string()),
                anchor: Some(format!("chunk_{}", result.chunk_id)),
                page_number: None, // TODO: Extract from metadata
            };
        }

        Ok(results)
    }

    /// Get document info for citation
    async fn get_document_info(&self, document_id: &str) -> Result<DocumentInfo, KbError> {
        // This is a placeholder - would query SQL service for document metadata
        Ok(DocumentInfo {
            id: document_id.to_string(),
            title: format!("Document {}", document_id),
            source_path: format!("/documents/{}", document_id),
            license_info: Some("MIT".to_string()),
            version: 1,
            chunk_count: 10,
            size_bytes: 1024,
        })
    }

    // Helper search methods
    async fn vector_only_search(
        &self,
        _collection: &str,
        _query: &str,
        top_k: usize,
        _filters: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<Vec<SearchResult>, KbError> {
        // TODO: Generate embedding for query
        let query_vector = vec![0.1, 0.2, 0.3, 0.4]; // Placeholder

        // Search vector database using trait method
        let vector_docs = self.vector_service.search("default_kb", &query_vector, top_k, None).await?;

        // Convert to SearchResult format
        let mut results = Vec::new();
        for (i, doc) in vector_docs.into_iter().enumerate() {
            results.push(SearchResult {
                chunk_id: doc.chunk_id,
                document_id: doc.document_id,
                kb_id: doc.kb_id,
                score: 1.0 - (i as f32 * 0.1), // Simple scoring
                content: doc.content.clone(),
                snippet: doc.content[..std::cmp::min(200, doc.content.len())].to_string(),
                metadata: doc.metadata,
                citation: CitationInfo {
                    title: "".to_string(),
                    source_path: "".to_string(),
                    license: None,
                    version: None,
                    anchor: None,
                    page_number: None,
                },
            });
        }

        Ok(results)
    }

    async fn vector_search(
        &self,
        _collection: &str,
        _query: &str,
        top_k: usize,
        _filters: &Option<HashMap<String, serde_json::Value>>,
    ) -> Result<Vec<SearchResult>, KbError> {
        // MVP: Placeholder vector search
        let mut results = Vec::new();
        for i in 0..std::cmp::min(top_k, 5) {
            results.push(SearchResult {
                chunk_id: format!("chunk_vector_{}", i),
                document_id: format!("doc_{}", i),
                kb_id: "test_kb".to_string(),
                score: 0.9 - (i as f32 * 0.1),
                content: format!("Vector search result {}", i),
                snippet: format!("Vector snippet {}", i),
                metadata: serde_json::json!({"source": "vector"}),
                citation: CitationInfo {
                    title: "".to_string(),
                    source_path: "".to_string(),
                    license: None,
                    version: None,
                    anchor: None,
                    page_number: None,
                },
            });
        }
        Ok(results)
    }

    async fn bm25_search(
        &self,
        _collection: &str,
        _query: &str,
        top_k: usize,
        _filters: &Option<HashMap<String, serde_json::Value>>,
    ) -> Result<Vec<SearchResult>, KbError> {
        // MVP: Placeholder BM25 search
        let mut results = Vec::new();
        for i in 0..std::cmp::min(top_k, 5) {
            results.push(SearchResult {
                chunk_id: format!("chunk_bm25_{}", i),
                document_id: format!("doc_{}", i),
                kb_id: "test_kb".to_string(),
                score: 0.8 - (i as f32 * 0.1),
                content: format!("BM25 search result {}", i),
                snippet: format!("BM25 snippet {}", i),
                metadata: serde_json::json!({"source": "bm25"}),
                citation: CitationInfo {
                    title: "".to_string(),
                    source_path: "".to_string(),
                    license: None,
                    version: None,
                    anchor: None,
                    page_number: None,
                },
            });
        }
        Ok(results)
    }

    fn merge_search_results(
        &self,
        vector_results: Vec<SearchResult>,
        bm25_results: Vec<SearchResult>,
        top_k: usize,
    ) -> Result<Vec<SearchResult>, KbError> {
        let mut merged = HashMap::new();

        // MVP: Simple score combination (weight: vector 0.6, bm25 0.4)
        for result in vector_results {
            merged.insert(result.chunk_id.clone(), (result, 0.6, 0.0));
        }

        for result in bm25_results {
            if let Some((existing, vector_weight, _)) = merged.get_mut(&result.chunk_id) {
                // Combine scores
                let vw = *vector_weight;
                existing.score = existing.score * vw + result.score * 0.4;
                existing.metadata = serde_json::json!({
                    "sources": ["vector", "bm25"],
                    "vector_score": existing.score * vw,
                    "bm25_score": result.score * 0.4
                });
            } else {
                merged.insert(result.chunk_id.clone(), (result, 0.0, 0.4));
            }
        }

        let mut final_results: Vec<SearchResult> = merged.into_values()
            .map(|(result, _, _)| result)
            .collect();

        // Sort by score descending
        final_results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        final_results.truncate(top_k);

        Ok(final_results)
    }
}

#[async_trait]
impl KbService for KbServiceImpl {
    async fn hybrid_search(
        &self,
        collection: &str,
        query: &str,
        top_k: usize,
        filters: Option<HashMap<String, serde_json::Value>>,
        _cache_ttl: Option<u64>,
    ) -> Result<Vec<SearchResult>, KbError> {
        self.validate_query(query, top_k)?;

        // Check KB exists and get state
        let _kb_state = self.get_kb_state(collection)?;

        tracing::info!(
            "Starting hybrid search for collection: {}, query: {}, top_k: {}",
            collection, query, top_k
        );

        if !self.config.hybrid_search_enabled {
            // MVP: Simple vector search fallback
            return self.vector_only_search(collection, query, top_k, filters).await;
        }

        // MVP: Sequential search (upgrade path: parallel with tokio::join!)
        let vector_results = self.vector_search(collection, query, top_k * 2, &filters).await?;
        let bm25_results = self.bm25_search(collection, query, top_k * 2, &filters).await?;

        // Merge results with simple scoring (MVP)
        let merged_results = self.merge_search_results(vector_results, bm25_results, top_k)?;

        // Mandatory citation enrichment
        let enriched_results = self.enrich_with_citations(merged_results).await?;

        // Validate all results have citations (MVP requirement)
        if self.config.citation_required {
            for result in &enriched_results {
                if result.citation.title.is_empty() {
                    return Err(KbError::CitationError(
                        format!("Missing citation for chunk: {}", result.chunk_id)
                    ));
                }
            }
        }

        tracing::info!(
            "Hybrid search completed: {} results with citations",
            enriched_results.len()
        );

        Ok(enriched_results)
    }

    async fn get_document(
        &self,
        doc_id: &str,
        range: Option<(usize, usize)>,
    ) -> Result<DocumentInfo, KbError> {
        tracing::debug!("Getting document: {} with range: {:?}", doc_id, range);

        // MVP: Simple document retrieval
        self.get_document_info(doc_id).await
    }

    async fn resolve_citations(
        &self,
        chunk_ids: Vec<String>,
    ) -> Result<Vec<CitationInfo>, KbError> {
        let mut citations = Vec::new();

        for chunk_id in chunk_ids {
            // MVP: Simple citation resolution
            citations.push(CitationInfo {
                title: format!("Document for chunk {}", chunk_id),
                source_path: format!("/chunks/{}", chunk_id),
                license: Some("MIT".to_string()),
                version: Some("1".to_string()),
                anchor: Some(format!("chunk_{}", chunk_id)),
                page_number: None,
            });
        }

        Ok(citations)
    }

    async fn get_stats(
        &self,
        collection: Option<String>,
        version: Option<i32>,
    ) -> Result<KbStats, KbError> {
        match collection {
            Some(collection_name) => {
                let kb_state = self.get_kb_state(&collection_name)?;
                Ok(KbStats {
                    collection_name: Some(collection_name),
                    version: version.unwrap_or(kb_state.version),
                    document_count: 100, // TODO: Query from SQL
                    chunk_count: 1000,   // TODO: Query from SQL
                    size_bytes: 1024000, // TODO: Query from SQL
                    health_score: kb_state.health_score,
                    embedder_version: "sentence-transformers/all-MiniLM-L6-v2".to_string(),
                    last_updated: chrono::Utc::now(),
                })
            }
            None => {
                // Global stats
                Ok(KbStats {
                    collection_name: None,
                    version: 1,
                    document_count: 500,
                    chunk_count: 5000,
                    size_bytes: 5120000,
                    health_score: 0.95,
                    embedder_version: "sentence-transformers/all-MiniLM-L6-v2".to_string(),
                    last_updated: chrono::Utc::now(),
                })
            }
        }
    }

    async fn list_collections(
        &self,
        _filters: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<Vec<KbInfo>, KbError> {
        let state = self.state_manager.read_state();

        let mut kbs = Vec::new();
        for (id, kb) in &state.knowledge_bases {
            kbs.push(KbInfo {
                id: id.clone(),
                name: kb.name.clone(),
                version: kb.version,
                status: format!("{:?}", kb.status),
                description: None, // TODO: Add description field to state
                health_score: kb.health_score,
                pinned: false, // TODO: Add pinned_version field to state
                flows: Vec::new(), // TODO: Get associated flows
            });
        }

        Ok(kbs)
    }

    async fn create_collection(
        &self,
        name: &str,
        config: KbCreateConfig,
    ) -> Result<String, KbError> {
        tracing::info!("Creating collection: {} with config: {:?}", name, config);

        // MVP: Basic collection creation
        let kb_id = format!("kb_{}", uuid::Uuid::new_v4().to_string().replace('-', "")[..8].to_lowercase());

        // TODO: Create in SQL database
        // TODO: Create vector collection
        // TODO: Update state

        Ok(kb_id)
    }

    async fn health_check(&self) -> Result<HealthStatus, KbError> {
        // Check services health
        let sql_health = self.sql_service.health_check().await
            .map_err(|e| KbError::StateError(format!("SQL health check failed: {}", e)))?;

        let vector_health = self.vector_service.health_check().await
            .map_err(|e| KbError::StateError(format!("Vector health check failed: {}", e)))?;

        // Check health based on metrics
        let is_sql_healthy = sql_health.app_db_size > 0;
        let is_vector_healthy = matches!(vector_health, VectorHealthStatus::Healthy);

        match (is_sql_healthy, is_vector_healthy) {
            (true, true) => Ok(HealthStatus::Healthy),
            _ => Ok(HealthStatus::Degraded),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::sync::Arc;
    use crate::state::StateManager;

    #[tokio::test]
    async fn test_validation_empty_query() {
        let temp_dir = TempDir::new().unwrap();
        let sql_service = Arc::new(
            crate::services::sql::SqlService::new(
                crate::services::sql::SqlConfig::test_config(temp_dir.path())
            ).await.unwrap()
        );
        let vector_service = Arc::new(
            crate::services::vector::VectorDbService::new(
                crate::services::vector::VectorDbConfig::test_config(temp_dir.path())
            ).await.unwrap()
        );
        let state_manager = Arc::new(StateManager::new());

        let kb_service = KbServiceImpl::new_mvp(sql_service, vector_service, state_manager);

        let result = kb_service.validate_query("", 10);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("empty"));
    }

    #[tokio::test]
    async fn test_validation_excessive_top_k() {
        let temp_dir = TempDir::new().unwrap();
        let sql_service = Arc::new(
            crate::services::sql::SqlService::new(
                crate::services::sql::SqlConfig::test_config(temp_dir.path())
            ).await.unwrap()
        );
        let vector_service = Arc::new(
            crate::services::vector::VectorDbService::new(
                crate::services::vector::VectorDbConfig::test_config(temp_dir.path())
            ).await.unwrap()
        );
        let state_manager = Arc::new(StateManager::new());

        let kb_service = KbServiceImpl::new_mvp(sql_service, vector_service, state_manager);

        let result = kb_service.validate_query("test query", 1000);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("top_k"));
    }

    #[tokio::test]
    async fn test_merge_search_results() {
        let temp_dir = TempDir::new().unwrap();
        let sql_service = Arc::new(
            crate::services::sql::SqlService::new(
                crate::services::sql::SqlConfig::test_config(temp_dir.path())
            ).await.unwrap()
        );
        let vector_service = Arc::new(
            crate::services::vector::VectorDbService::new(
                crate::services::vector::VectorDbConfig::test_config(temp_dir.path())
            ).await.unwrap()
        );
        let state_manager = Arc::new(StateManager::new());

        let kb_service = KbServiceImpl::new_mvp(sql_service, vector_service, state_manager);

        let vector_results = vec![
            SearchResult {
                chunk_id: "chunk_1".to_string(),
                document_id: "doc_1".to_string(),
                kb_id: "kb_1".to_string(),
                score: 0.9,
                content: "content".to_string(),
                snippet: "snippet".to_string(),
                metadata: serde_json::json!({}),
                citation: CitationInfo {
                    title: "".to_string(),
                    source_path: "".to_string(),
                    license: None,
                    version: None,
                    anchor: None,
                    page_number: None,
                },
            }
        ];

        let bm25_results = vec![
            SearchResult {
                chunk_id: "chunk_1".to_string(),
                document_id: "doc_1".to_string(),
                kb_id: "kb_1".to_string(),
                score: 0.8,
                content: "content".to_string(),
                snippet: "snippet".to_string(),
                metadata: serde_json::json!({}),
                citation: CitationInfo {
                    title: "".to_string(),
                    source_path: "".to_string(),
                    license: None,
                    version: None,
                    anchor: None,
                    page_number: None,
                },
            }
        ];

        let merged = kb_service.merge_search_results(vector_results, bm25_results, 10).unwrap();
        assert_eq!(merged.len(), 1);

        // Check combined score: 0.9 * 0.6 + 0.8 * 0.4 = 0.54 + 0.32 = 0.86
        assert!((merged[0].score - 0.86).abs() < 0.01);
    }
}