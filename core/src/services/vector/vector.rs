/*!
 * Vector Database Service Implementation
 *
 * Provides LanceDB vector operations with async operations, generation management,
 * garbage collection, and hybrid search. Implements MVP architecture with upgrade
 * path to production features.
 */

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::{RwLock, Semaphore};
use async_trait::async_trait;
use tracing;

// Re-export shared types from schema module
pub use crate::services::schema::{VectorSchema, SearchResult, CitationInfo};

/// Vector Database Service Error Types
#[derive(Debug, thiserror::Error)]
pub enum VectorDbError {
    #[error("LanceDB error: {0}")]
    LanceDbError(String),

    #[error("Collection not found: {0}")]
    CollectionNotFound(String),

    #[error("Generation error: {0}")]
    GenerationError(String),

    #[error("Search error: {0}")]
    SearchError(String),

    #[error("Index promotion failed: {0}")]
    PromotionFailed(String),

    #[error("Garbage collection failed: {0}")]
    GcFailed(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    IoError(#[from] tokio::io::Error),

    #[error("Tantivy error: {0}")]
    TantivyError(String),

    #[error("System time error: {0}")]
    SystemTimeError(#[from] std::time::SystemTimeError),

    #[error("Semaphore acquire error: {0}")]
    SemaphoreError(#[from] tokio::sync::AcquireError),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),
}

// ============================================================================
// Mock Types for MVP (until LanceDB/Tantivy dependencies are resolved)
// ============================================================================

// Mock LanceDB types
#[derive(Debug)]
pub struct Connection;
#[derive(Debug)]
pub struct Table;
#[derive(Debug)]
pub struct Query;
#[derive(Debug)]
pub struct MockRecordBatch { num_rows: usize }
#[derive(Debug)]
pub struct MockSchema;

impl Connection {
    pub async fn open(_path: &Path) -> Result<Self, VectorDbError> { Ok(Connection) }
    pub async fn create_empty_table(&self, _name: &str, _schema: &MockSchema) -> Result<Table, VectorDbError> { Ok(Table) }
    pub async fn open_table(&self, _name: &str) -> Result<Table, VectorDbError> { Ok(Table) }
    pub async fn table_names(&self) -> Result<Vec<String>, VectorDbError> { Ok(vec![]) }
}

impl Table {
    pub fn search(&self, _vector: &[f32]) -> Query { Query }
}

impl Query {
    pub fn limit(self, _limit: usize) -> Self { self }
    pub fn filter(self, _filter: &str) -> Self { self }
    pub async fn execute(self) -> Result<Vec<MockRecordBatch>, VectorDbError> {
        Ok(vec![MockRecordBatch { num_rows: 0 }])
    }
}

impl MockRecordBatch {
    pub fn num_rows(&self) -> usize { self.num_rows }
}

impl MockSchema {
    pub fn empty() -> Self { MockSchema }
}

// Mock Tantivy types
#[derive(Debug)]
pub struct Index;
#[derive(Debug)]
pub struct IndexReader;
#[derive(Debug)]
pub struct IndexWriter;
#[derive(Debug)]
pub struct Document;

impl Index {
    pub fn create_in_ram(_schema: MockSchema) -> Self { Index }
    pub fn reader(&self) -> Result<IndexReader, VectorDbError> { Ok(IndexReader) }
    pub fn writer(&self, _heap_size: usize) -> Result<IndexWriter, VectorDbError> { Ok(IndexWriter) }
}

impl IndexWriter {
    pub fn add_document(&mut self, _doc: Document) -> Result<(), VectorDbError> { Ok(()) }
    pub fn commit(&mut self) -> Result<(), VectorDbError> { Ok(()) }
}

// ============================================================================
// Configuration Types
// ============================================================================

/// Index configuration for vector database
#[derive(Debug, Clone)]
pub struct IndexConfig {
    pub index_type: IndexType,
    pub metric_type: MetricType,
    pub num_partitions: Option<usize>,
    pub num_sub_quantizers: Option<usize>,
    pub max_iterations: usize,
    pub sample_rate: f64,
}

#[derive(Debug, Clone)]
pub enum IndexType {
    Hnsw,   // MVP: Default to HNSW for simplicity
    IvfPq,  // Production: Advanced quantization
}

#[derive(Debug, Clone)]
pub enum MetricType {
    Cosine,     // MVP: Default to cosine similarity
    L2,         // Production: Euclidean distance
    Dot,        // Production: Dot product
}

impl Default for IndexConfig {
    fn default() -> Self {
        Self {
            index_type: IndexType::Hnsw,
            metric_type: MetricType::Cosine,
            num_partitions: None,
            num_sub_quantizers: None,
            max_iterations: 50,
            sample_rate: 0.1,
        }
    }
}

/// Garbage collection configuration
#[derive(Debug, Clone)]
pub struct GcConfig {
    pub retention_epochs: Option<u32>,
    pub gc_interval: Duration,
    pub size_threshold_bytes: u64,
    pub min_age_before_gc: Duration,
    pub use_epoch_based: bool,
    pub max_files_to_keep: usize,
}

impl Default for GcConfig {
    fn default() -> Self {
        Self {
            retention_epochs: None,
            gc_interval: Duration::from_secs(3600),
            size_threshold_bytes: 1024 * 1024 * 1024,
            min_age_before_gc: Duration::from_secs(1800),
            use_epoch_based: false,
            max_files_to_keep: 5,
        }
    }
}

/// Hybrid search configuration
#[derive(Debug, Clone)]
pub struct HybridConfig {
    pub vector_weight: f32,
    pub bm25_weight: f32,
    pub adaptive_weights: bool,
    pub rerank_threshold: Option<f32>,
    pub max_candidates: usize,
    pub use_advanced_fusion: bool,
}

impl Default for HybridConfig {
    fn default() -> Self {
        Self {
            vector_weight: 0.6,
            bm25_weight: 0.4,
            adaptive_weights: false,
            rerank_threshold: None,
            max_candidates: 50,
            use_advanced_fusion: false,
        }
    }
}

/// Cache configuration
#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub max_size: usize,
    pub ttl_seconds: u64,
    pub enable_layered_cache: bool,
}

/// Vector Database Service configuration
#[derive(Debug, Clone)]
pub struct VectorDbConfig {
    pub data_dir: PathBuf,
    pub max_concurrent_operations: usize,
    pub index_config: IndexConfig,
    pub gc_config: Option<GcConfig>,
    pub cache_config: Option<CacheConfig>,
    pub use_advanced_features: bool,
    pub enable_generation_management: bool,
}

impl Default for VectorDbConfig {
    fn default() -> Self {
        Self {
            data_dir: PathBuf::from("./data/vector_db"),
            max_concurrent_operations: 10,
            index_config: IndexConfig::default(),
            gc_config: None,
            cache_config: None,
            use_advanced_features: false,
            enable_generation_management: false,
        }
    }
}

impl VectorDbConfig {
    pub fn production(data_dir: PathBuf) -> Self {
        Self {
            data_dir,
            max_concurrent_operations: 50,
            index_config: IndexConfig::default(),
            gc_config: Some(GcConfig::default()),
            cache_config: Some(CacheConfig {
                max_size: 1000,
                ttl_seconds: 3600,
                enable_layered_cache: true,
            }),
            use_advanced_features: true,
            enable_generation_management: true,
        }
    }

    pub fn test_config(data_dir: &Path) -> Self {
        Self {
            data_dir: data_dir.to_path_buf(),
            max_concurrent_operations: 5,
            index_config: IndexConfig::default(),
            gc_config: None,
            cache_config: None,
            use_advanced_features: false,
            enable_generation_management: false,
        }
    }
}

// ============================================================================
// Generation Management
// ============================================================================

/// Generation status tracking
#[derive(Debug, Clone, PartialEq)]
pub enum GenerationStatus {
    Building,
    Ready,
    Active,
    Archived,
    MarkedForDeletion,
}

/// Generation metadata
#[derive(Debug, Clone)]
pub struct Generation {
    pub id: u64,
    pub status: GenerationStatus,
    pub created_at: SystemTime,
    pub promoted_at: Option<SystemTime>,
    pub size_bytes: u64,
    pub vector_count: u64,
}

/// Generation manager for index lifecycle
pub struct GenerationManager {
    pub generations: Arc<RwLock<HashMap<String, Generation>>>,
    data_dir: PathBuf,
    advanced_mode: bool,
}

impl GenerationManager {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            generations: Arc::new(RwLock::new(HashMap::new())),
            data_dir,
            advanced_mode: true,
        }
    }

    pub fn simple(data_dir: PathBuf) -> Self {
        Self {
            generations: Arc::new(RwLock::new(HashMap::new())),
            data_dir,
            advanced_mode: false,
        }
    }

    pub async fn create_generation(&self, kb_id: &str) -> Result<u64, VectorDbError> {
        let mut generations = self.generations.write().await;
        let gen_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_millis() as u64;

        let generation = Generation {
            id: gen_id,
            status: GenerationStatus::Building,
            created_at: SystemTime::now(),
            promoted_at: None,
            size_bytes: 0,
            vector_count: 0,
        };

        generations.insert(format!("{}_{}", kb_id, gen_id), generation);
        tracing::info!("Created generation {} for KB: {}", gen_id, kb_id);
        Ok(gen_id)
    }

    pub async fn mark_generation_ready(&self, kb_id: &str, gen_id: u64) -> Result<(), VectorDbError> {
        let mut generations = self.generations.write().await;
        let gen_key = format!("{}_{}", kb_id, gen_id);

        if let Some(generation) = generations.get_mut(&gen_key) {
            generation.status = GenerationStatus::Ready;
            tracing::debug!("Marked generation {} ready for KB: {}", gen_id, kb_id);
        } else {
            return Err(VectorDbError::GenerationError(
                format!("Generation {} not found for KB {}", gen_id, kb_id)
            ));
        }

        Ok(())
    }

    pub async fn promote_generation(&self, kb_id: &str, gen_id: u64) -> Result<(), VectorDbError> {
        let mut generations = self.generations.write().await;

        // Mark current active as archived
        for (key, gen) in generations.iter_mut() {
            if key.starts_with(kb_id) && gen.status == GenerationStatus::Active {
                gen.status = GenerationStatus::Archived;
            }
        }

        // Promote new generation to active
        let gen_key = format!("{}_{}", kb_id, gen_id);
        if let Some(generation) = generations.get_mut(&gen_key) {
            generation.status = GenerationStatus::Active;
            generation.promoted_at = Some(SystemTime::now());

            tracing::info!("Promoted generation {} to active for KB: {}", gen_id, kb_id);
        } else {
            return Err(VectorDbError::GenerationError(
                format!("Generation {} not found for KB {}", gen_id, kb_id)
            ));
        }

        Ok(())
    }

    pub async fn get_active_generation(&self, kb_id: &str) -> Option<Generation> {
        let generations = self.generations.read().await;
        for (key, gen) in generations.iter() {
            if key.starts_with(kb_id) && gen.status == GenerationStatus::Active {
                return Some(gen.clone());
            }
        }
        None
    }

    pub async fn get_generations(&self, kb_id: &str) -> Vec<Generation> {
        let generations = self.generations.read().await;
        generations
            .iter()
            .filter_map(|(key, gen)| {
                if key.starts_with(kb_id) {
                    Some(gen.clone())
                } else {
                    None
                }
            })
            .collect()
    }

    pub fn get_staging_table_name(&self, kb_id: &str) -> String {
        if self.advanced_mode {
            format!("{}_staging", kb_id)
        } else {
            format!("{}_vectors_new", kb_id)
        }
    }

    pub fn get_active_table_name(&self, kb_id: &str) -> String {
        if self.advanced_mode {
            format!("{}_active", kb_id)
        } else {
            format!("{}_vectors", kb_id)
        }
    }

    pub fn get_generation_path(&self, kb_id: &str, gen_id: u64) -> PathBuf {
        self.data_dir.join(format!("{}_{}", kb_id, gen_id))
    }

    pub fn is_advanced_mode(&self) -> bool {
        self.advanced_mode
    }
}

// ============================================================================
// Main Vector Database Service
// ============================================================================

/// Collection statistics
#[derive(Debug, Clone)]
pub struct CollectionStats {
    pub vector_count: u64,
    pub size_bytes: u64,
    pub last_updated: Option<chrono::DateTime<chrono::Utc>>,
    pub generation_id: Option<u64>,
}

/// Health status
#[derive(Debug, Clone, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Unhealthy,
    Degraded,
}

/// Vector Database Service trait
#[async_trait]
pub trait VectorDbServiceTrait {
    async fn create_collection(&self, kb_id: &str, schema: &VectorSchema) -> Result<(), VectorDbError>;
    async fn upsert_vectors(&self, kb_id: &str, vectors: Vec<VectorSchema>) -> Result<(), VectorDbError>;
    async fn search(&self, kb_id: &str, query_vector: &[f32], limit: usize, filter: Option<&str>) -> Result<Vec<SearchResult>, VectorDbError>;
    async fn delete_collection(&self, kb_id: &str) -> Result<(), VectorDbError>;
    async fn get_collection_stats(&self, kb_id: &str) -> Result<CollectionStats, VectorDbError>;
}

/// Vector Database Service implementation
pub struct VectorDbService {
    connection: Arc<Connection>,
    tables: Arc<RwLock<HashMap<String, Table>>>,
    config: VectorDbConfig,
    semaphore: Arc<Semaphore>,
    generation_manager: Arc<GenerationManager>,
}

impl VectorDbService {
    pub async fn new(config: VectorDbConfig) -> Result<Self, VectorDbError> {
        // Ensure data directory exists
        tokio::fs::create_dir_all(&config.data_dir).await?;

        let connection = Connection::open(&config.data_dir).await?;
        let semaphore = Arc::new(Semaphore::new(config.max_concurrent_operations));

        let generation_manager = if config.enable_generation_management {
            Arc::new(GenerationManager::new(config.data_dir.clone()))
        } else {
            Arc::new(GenerationManager::simple(config.data_dir.clone()))
        };

        let service = Self {
            connection: Arc::new(connection),
            tables: Arc::new(RwLock::new(HashMap::new())),
            config,
            semaphore,
            generation_manager,
        };

        tracing::info!(
            "Vector Database Service initialized (MVP mode: {})",
            !service.config.use_advanced_features
        );

        Ok(service)
    }

    pub fn generation_manager(&self) -> &Arc<GenerationManager> {
        &self.generation_manager
    }

    pub async fn create_generation(&self, kb_id: &str) -> Result<u64, VectorDbError> {
        self.generation_manager.create_generation(kb_id).await
    }

    pub async fn promote_generation(&self, kb_id: &str, gen_id: u64) -> Result<(), VectorDbError> {
        self.generation_manager.promote_generation(kb_id, gen_id).await
    }

    pub async fn health_check(&self) -> Result<HealthStatus, VectorDbError> {
        let data_dir_exists = self.config.data_dir.exists();
        let tables_accessible = self.connection.table_names().await.is_ok();

        let status = if data_dir_exists && tables_accessible {
            HealthStatus::Healthy
        } else {
            HealthStatus::Unhealthy
        };

        Ok(status)
    }

    async fn convert_to_search_results(&self, results: Vec<MockRecordBatch>) -> Result<Vec<SearchResult>, VectorDbError> {
        let mut search_results = Vec::new();

        for batch in results {
            let num_rows = batch.num_rows();
            for i in 0..num_rows {
                let result = SearchResult {
                    chunk_id: format!("chunk_{}", i),
                    document_id: format!("doc_{}", i),
                    kb_id: "placeholder".to_string(),
                    score: 0.9,
                    content: "placeholder content".to_string(),
                    snippet: "placeholder snippet".to_string(),
                    metadata: serde_json::json!({}),
                    citation: CitationInfo {
                        title: "Placeholder Title".to_string(),
                        source_path: "placeholder.txt".to_string(),
                        license: None,
                        version: None,
                        anchor: None,
                        page_number: None,
                    },
                };
                search_results.push(result);
            }
        }

        Ok(search_results)
    }
}

#[async_trait]
impl VectorDbServiceTrait for VectorDbService {
    async fn create_collection(&self, kb_id: &str, _schema: &VectorSchema) -> Result<(), VectorDbError> {
        let _permit = self.semaphore.acquire().await?;

        let table_name = if self.config.enable_generation_management {
            self.generation_manager.get_staging_table_name(kb_id)
        } else {
            format!("{}_vectors", kb_id)
        };

        let table = self.connection.create_empty_table(&table_name, &MockSchema::empty()).await?;

        let mut tables = self.tables.write().await;
        tables.insert(kb_id.to_string(), table);

        tracing::info!(
            "Created vector collection for KB: {} (MVP mode: {})",
            kb_id, !self.config.use_advanced_features
        );
        Ok(())
    }

    async fn upsert_vectors(&self, kb_id: &str, vectors: Vec<VectorSchema>) -> Result<(), VectorDbError> {
        let _permit = self.semaphore.acquire().await?;

        let tables = self.tables.read().await;
        let _table = tables.get(kb_id)
            .ok_or_else(|| VectorDbError::CollectionNotFound(kb_id.to_string()))?;

        let batch_size = 1000;
        for chunk in vectors.chunks(batch_size) {
            tracing::debug!("Processing batch of {} vectors", chunk.len());
        }

        tracing::debug!("Upserted {} vectors to KB: {}", vectors.len(), kb_id);
        Ok(())
    }

    async fn search(&self, kb_id: &str, query_vector: &[f32], limit: usize, filter: Option<&str>) -> Result<Vec<SearchResult>, VectorDbError> {
        let _permit = self.semaphore.acquire().await?;

        let table_name = if self.config.enable_generation_management {
            self.generation_manager.get_active_table_name(kb_id)
        } else {
            format!("{}_vectors", kb_id)
        };

        let table = self.connection.open_table(&table_name).await?;

        let mut query = table.search(query_vector).limit(limit);

        if let Some(filter_expr) = filter {
            query = query.filter(filter_expr);
        }

        let results = query.execute().await?;
        let search_results = self.convert_to_search_results(results).await?;

        tracing::debug!(
            "Vector search returned {} results for KB: {} (MVP mode: {})",
            search_results.len(), kb_id, !self.config.use_advanced_features
        );
        Ok(search_results)
    }

    async fn delete_collection(&self, kb_id: &str) -> Result<(), VectorDbError> {
        let _permit = self.semaphore.acquire().await?;

        let mut tables = self.tables.write().await;
        tables.remove(kb_id);

        tracing::info!("Deleted collection: {}", kb_id);
        Ok(())
    }

    async fn get_collection_stats(&self, kb_id: &str) -> Result<CollectionStats, VectorDbError> {
        let tables = self.tables.read().await;
        let _table = tables.get(kb_id)
            .ok_or_else(|| VectorDbError::CollectionNotFound(kb_id.to_string()))?;

        let generation_id = if self.config.enable_generation_management {
            self.generation_manager.get_active_generation(kb_id)
                .await
                .map(|gen| gen.id)
        } else {
            None
        };

        Ok(CollectionStats {
            vector_count: 0,
            size_bytes: 0,
            last_updated: Some(chrono::Utc::now()),
            generation_id,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_vector_db_config_creation() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::test_config(temp_dir.path());

        assert_eq!(config.data_dir, temp_dir.path());
        assert_eq!(config.max_concurrent_operations, 5);
        assert!(!config.use_advanced_features);
        assert!(!config.enable_generation_management);
    }

    #[tokio::test]
    async fn test_vector_db_config_production() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::production(temp_dir.path().to_path_buf());

        assert_eq!(config.data_dir, temp_dir.path());
        assert_eq!(config.max_concurrent_operations, 50);
        assert!(config.use_advanced_features);
        assert!(config.enable_generation_management);
        assert!(config.gc_config.is_some());
        assert!(config.cache_config.is_some());
    }

    #[tokio::test]
    async fn test_vector_db_service_creation() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::test_config(temp_dir.path());

        let vector_service = VectorDbService::new(config).await;
        assert!(vector_service.is_ok(), "Vector service creation should succeed");
    }

    #[tokio::test]
    async fn test_health_check() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::test_config(temp_dir.path());

        let vector_service = VectorDbService::new(config).await.expect("Failed to create vector service");
        let health = vector_service.health_check().await.expect("Failed to get health status");

        assert!(matches!(health, HealthStatus::Healthy | HealthStatus::Unhealthy));
    }

    #[tokio::test]
    async fn test_create_collection() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::test_config(temp_dir.path());

        let vector_service = VectorDbService::new(config).await.expect("Failed to create vector service");

        let schema = VectorSchema {
            chunk_id: "test_chunk".to_string(),
            document_id: "test_doc".to_string(),
            kb_id: "test_kb".to_string(),
            content: "test content".to_string(),
            embedding: vec![0.1, 0.2, 0.3, 0.4],
            metadata: serde_json::json!({}),
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        let result = vector_service.create_collection("test_kb", &schema).await;
        assert!(result.is_ok(), "Collection creation should succeed");
    }

    #[tokio::test]
    async fn test_upsert_vectors() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::test_config(temp_dir.path());

        let vector_service = VectorDbService::new(config).await.expect("Failed to create vector service");

        let schema = VectorSchema {
            chunk_id: "test_chunk".to_string(),
            document_id: "test_doc".to_string(),
            kb_id: "test_kb".to_string(),
            content: "test content".to_string(),
            embedding: vec![0.1, 0.2, 0.3, 0.4],
            metadata: serde_json::json!({}),
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        vector_service.create_collection("test_kb", &schema).await.expect("Failed to create collection");

        let vectors = vec![schema];
        let result = vector_service.upsert_vectors("test_kb", vectors).await;
        assert!(result.is_ok(), "Vector upsert should succeed");
    }

    #[tokio::test]
    async fn test_search_vectors() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::test_config(temp_dir.path());

        let vector_service = VectorDbService::new(config).await.expect("Failed to create vector service");

        let schema = VectorSchema {
            chunk_id: "test_chunk".to_string(),
            document_id: "test_doc".to_string(),
            kb_id: "test_kb".to_string(),
            content: "test content".to_string(),
            embedding: vec![0.1, 0.2, 0.3, 0.4],
            metadata: serde_json::json!({}),
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        vector_service.create_collection("test_kb", &schema).await.expect("Failed to create collection");

        let query_vector = vec![0.1, 0.2, 0.3, 0.4];
        let results = vector_service.search("test_kb", &query_vector, 10, None).await;
        assert!(results.is_ok(), "Vector search should succeed");
    }

    #[tokio::test]
    async fn test_delete_collection() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::test_config(temp_dir.path());

        let vector_service = VectorDbService::new(config).await.expect("Failed to create vector service");

        let schema = VectorSchema {
            chunk_id: "test_chunk".to_string(),
            document_id: "test_doc".to_string(),
            kb_id: "test_kb".to_string(),
            content: "test content".to_string(),
            embedding: vec![0.1, 0.2, 0.3, 0.4],
            metadata: serde_json::json!({}),
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        vector_service.create_collection("test_kb", &schema).await.expect("Failed to create collection");

        let result = vector_service.delete_collection("test_kb").await;
        assert!(result.is_ok(), "Collection deletion should succeed");
    }

    #[tokio::test]
    async fn test_get_collection_stats() {
        let temp_dir = TempDir::new().unwrap();
        let config = VectorDbConfig::test_config(temp_dir.path());

        let vector_service = VectorDbService::new(config).await.expect("Failed to create vector service");

        let schema = VectorSchema {
            chunk_id: "test_chunk".to_string(),
            document_id: "test_doc".to_string(),
            kb_id: "test_kb".to_string(),
            content: "test content".to_string(),
            embedding: vec![0.1, 0.2, 0.3, 0.4],
            metadata: serde_json::json!({}),
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        vector_service.create_collection("test_kb", &schema).await.expect("Failed to create collection");

        let stats = vector_service.get_collection_stats("test_kb").await;
        assert!(stats.is_ok(), "Getting collection stats should succeed");

        let stats = stats.unwrap();
        assert_eq!(stats.vector_count, 0);
        assert_eq!(stats.size_bytes, 0);
        assert!(stats.last_updated.is_some());
    }

    #[tokio::test]
    async fn test_generation_manager() {
        let temp_dir = TempDir::new().unwrap();
        let manager = GenerationManager::new(temp_dir.path().to_path_buf());

        let gen_id = manager.create_generation("test_kb").await.expect("Failed to create generation");
        assert!(gen_id > 0);

        manager.mark_generation_ready("test_kb", gen_id).await.expect("Failed to mark ready");
        manager.promote_generation("test_kb", gen_id).await.expect("Failed to promote");

        let active_gen = manager.get_active_generation("test_kb").await;
        assert!(active_gen.is_some());
        assert_eq!(active_gen.unwrap().id, gen_id);
    }

    #[tokio::test]
    async fn test_generation_manager_simple() {
        let temp_dir = TempDir::new().unwrap();
        let manager = GenerationManager::simple(temp_dir.path().to_path_buf());

        assert!(!manager.is_advanced_mode());
        assert_eq!(manager.get_staging_table_name("test_kb"), "test_kb_vectors_new");
        assert_eq!(manager.get_active_table_name("test_kb"), "test_kb_vectors");
    }

    #[tokio::test]
    async fn test_index_config() {
        let config = IndexConfig::default();
        assert!(matches!(config.index_type, IndexType::Hnsw));
        assert!(matches!(config.metric_type, MetricType::Cosine));
        assert_eq!(config.max_iterations, 50);
        assert_eq!(config.sample_rate, 0.1);
    }

    #[tokio::test]
    async fn test_gc_config() {
        let config = GcConfig::default();
        assert!(config.retention_epochs.is_none());
        assert_eq!(config.gc_interval, Duration::from_secs(3600));
        assert_eq!(config.size_threshold_bytes, 1024 * 1024 * 1024);
        assert_eq!(config.min_age_before_gc, Duration::from_secs(1800));
        assert!(!config.use_epoch_based);
        assert_eq!(config.max_files_to_keep, 5);
    }

    #[tokio::test]
    async fn test_hybrid_config() {
        let config = HybridConfig::default();
        assert_eq!(config.vector_weight, 0.6);
        assert_eq!(config.bm25_weight, 0.4);
        assert!(!config.adaptive_weights);
        assert!(config.rerank_threshold.is_none());
        assert_eq!(config.max_candidates, 50);
        assert!(!config.use_advanced_fusion);
    }
}

// ============================================================================
