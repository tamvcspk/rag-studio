/*!
* Model Management Service Implementation
*
* Provides dynamic model lifecycle management integrated with the embedding worker subprocess,
* supporting HuggingFace downloads, local discovery, and manual imports while maintaining
* the system's local-first and performance-focused design.
*
* Implements MVP requirements for Phase 2.3 Model Management System.
*/

use dashmap::DashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::fs;
use chrono::{DateTime, Utc};
use thiserror::Error;
use serde::{Serialize, Deserialize};
use tracing::{info, warn, error};
use tokio::sync::RwLock;

use crate::services::storage::{StorageService, StorageError};
use crate::services::embedding::{EmbeddingService};

/// Model Service Error Types
#[derive(Debug, Error)]
pub enum ModelError {
    #[error("Model not found: {0}")]
    ModelNotFound(String),

    #[error("Model loading failed: {0}")]
    ModelLoadingFailed(String),

    #[error("Model validation failed: {model_id}: {reason}")]
    ModelValidationFailed { model_id: String, reason: String },

    #[error("Storage quota exceeded for models: {used_gb}GB used, {limit_gb}GB limit")]
    StorageQuotaExceeded { used_gb: f64, limit_gb: f64 },

    #[error("Model cache full: {count} models loaded, {memory_gb}GB used")]
    ModelCacheFull { count: usize, memory_gb: f64 },

    #[error("Download failed for model {model_id}: {reason}")]
    DownloadFailed { model_id: String, reason: String },

    #[error("Checksum validation failed for model {model_id}: expected {expected}, got {actual}")]
    ChecksumMismatch { model_id: String, expected: String, actual: String },

    #[error("Storage error: {0}")]
    StorageError(#[from] StorageError),

    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}

/// Model service configuration
#[derive(Debug, Clone)]
pub struct ModelConfig {
    /// Base models directory (./models/)
    pub models_directory: PathBuf,
    /// Auto-detect from available space, 50% usage with 2GB minimum free
    pub cache_size_gb: Option<u64>,
    /// Minimum free space to maintain (2GB)
    pub min_free_space_gb: u64,
    /// Auto-cleanup threshold (0.8 = cleanup at 80% full)
    pub auto_cleanup_threshold: f32,
    /// Embedding worker memory limit (2GB default)
    pub worker_memory_limit_gb: f64,
    /// Enable HuggingFace integration for model downloads
    pub auto_download: bool,
    /// Air-gapped operation mode
    pub offline_mode: bool,
    /// Models shipped with application
    pub bundled_models: Vec<String>,
}

impl ModelConfig {
    /// Create MVP model config with reasonable defaults
    pub fn new_mvp<P: AsRef<Path>>(models_dir: P) -> Self {
        Self {
            models_directory: models_dir.as_ref().to_path_buf(),
            cache_size_gb: None, // Auto-detect
            min_free_space_gb: 2048, // 2GB minimum free space
            auto_cleanup_threshold: 0.8,
            worker_memory_limit_gb: 2.0, // 2GB default for embedding worker
            auto_download: false, // Disabled for MVP air-gapped mode
            offline_mode: true,   // MVP focuses on local-first operation
            bundled_models: vec!["sentence-transformers/all-MiniLM-L6-v2".to_string()],
        }
    }

    /// Create test config with smaller limits
    pub fn new_test<P: AsRef<Path>>(models_dir: P) -> Self {
        Self {
            models_directory: models_dir.as_ref().to_path_buf(),
            cache_size_gb: Some(100), // 100MB for tests
            min_free_space_gb: 10,     // 10MB minimum
            auto_cleanup_threshold: 0.5,
            worker_memory_limit_gb: 0.1, // 100MB for tests
            auto_download: false,
            offline_mode: true,
            bundled_models: vec![],
        }
    }
}

/// Model type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ModelType {
    #[serde(rename = "embedding")]
    Embedding,
    #[serde(rename = "reranking")]
    Reranking,
    #[serde(rename = "combined")]
    Combined,
}

/// Model source type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ModelSource {
    #[serde(rename = "huggingface")]
    HuggingFace,
    #[serde(rename = "local")]
    Local,
    #[serde(rename = "bundled")]
    Bundled,
    #[serde(rename = "manual")]
    Manual,
}

/// Model availability status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ModelStatus {
    #[serde(rename = "available")]
    Available,
    #[serde(rename = "downloading")]
    Downloading { progress: u8, eta_seconds: Option<u64> },
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "not_downloaded")]
    NotDownloaded,
}

/// Model performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    /// Model loading latency in milliseconds
    pub load_time_ms: Option<u64>,
    /// Embedding generation speed (vectors per second)
    pub throughput_vecs_per_sec: Option<f64>,
    /// Benchmark accuracy score (0.0-1.0)
    pub accuracy_score: Option<f64>,
    /// Memory usage estimate in MB
    pub memory_usage_mb: Option<u64>,
    /// Last benchmarked timestamp
    pub benchmarked_at: Option<DateTime<Utc>>,
}

impl Default for PerformanceMetrics {
    fn default() -> Self {
        Self {
            load_time_ms: None,
            throughput_vecs_per_sec: None,
            accuracy_score: None,
            memory_usage_mb: None,
            benchmarked_at: None,
        }
    }
}

/// Complete model metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMetadata {
    /// Model identifier (e.g., "sentence-transformers/all-MiniLM-L6-v2")
    pub id: String,
    /// Display name for UI
    pub name: String,
    /// Model description
    pub description: String,
    /// Model type classification
    pub model_type: ModelType,
    /// Model size in MB
    pub size_mb: u64,
    /// Vector dimensions (384, 768, 1024, etc.)
    pub dimensions: u32,
    /// Maximum sequence length in tokens
    pub max_sequence_length: u32,
    /// Model source type
    pub source: ModelSource,
    /// Current availability status
    pub status: ModelStatus,
    /// Local filesystem path (if available)
    pub local_path: Option<PathBuf>,
    /// SHA-256 checksum for integrity verification
    pub checksum: Option<String>,
    /// Performance benchmarks
    pub performance_metrics: PerformanceMetrics,
    /// Last used timestamp for LRU cleanup
    pub last_used: Option<DateTime<Utc>>,
    /// Supported frameworks (sentence-transformers, transformers, etc.)
    pub compatibility: Vec<String>,
    /// Model creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last update timestamp
    pub updated_at: DateTime<Utc>,
}

impl ModelMetadata {
    /// Create bundled model metadata for all-MiniLM-L6-v2
    pub fn bundled_mini_lm() -> Self {
        Self {
            id: "sentence-transformers/all-MiniLM-L6-v2".to_string(),
            name: "All MiniLM L6 v2".to_string(),
            description: "Lightweight sentence transformer optimized for speed and efficiency".to_string(),
            model_type: ModelType::Embedding,
            size_mb: 90,
            dimensions: 384,
            max_sequence_length: 256,
            source: ModelSource::Bundled,
            status: ModelStatus::Available,
            local_path: None,
            checksum: None,
            performance_metrics: PerformanceMetrics::default(),
            last_used: None,
            compatibility: vec!["sentence-transformers".to_string()],
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    /// Update last used timestamp for LRU tracking
    pub fn touch(&mut self) {
        self.last_used = Some(Utc::now());
        self.updated_at = Utc::now();
    }
}

/// Model storage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelStorageStats {
    /// Total models in registry
    pub total_models: usize,
    /// Available models count
    pub available_models: usize,
    /// Total storage used in MB
    pub storage_used_mb: u64,
    /// Storage limit in MB
    pub storage_limit_mb: u64,
    /// Storage usage percentage (0.0-1.0)
    pub usage_percentage: f32,
    /// Models cached in embedding worker
    pub cached_models: usize,
    /// Worker memory usage in MB
    pub worker_memory_mb: u64,
}

/// Main Model Management Service
pub struct ModelService {
    /// Service configuration
    config: ModelConfig,
    /// Concurrent model metadata cache using DashMap
    model_cache: Arc<DashMap<String, ModelMetadata>>,
    /// Storage service integration
    storage_service: Arc<RwLock<StorageService>>,
    /// Embedding service integration
    embedding_service: Arc<EmbeddingService>,
    /// Model directory paths
    models_dir: PathBuf,
    cache_dir: PathBuf,
    local_dir: PathBuf,
    bundled_dir: PathBuf,
}

impl ModelService {
    /// Create new ModelService with configuration
    pub async fn new(
        config: ModelConfig,
        storage_service: Arc<RwLock<StorageService>>,
        embedding_service: Arc<EmbeddingService>,
    ) -> Result<Self, ModelError> {
        info!("🤖 Initializing ModelService with configuration");

        // Setup directory structure
        let models_dir = config.models_directory.clone();
        let cache_dir = models_dir.join("cache").join("huggingface");
        let local_dir = models_dir.join("local");
        let bundled_dir = models_dir.join("bundled");

        // Create directories
        fs::create_dir_all(&models_dir)?;
        fs::create_dir_all(&cache_dir)?;
        fs::create_dir_all(&local_dir)?;
        fs::create_dir_all(&bundled_dir)?;

        let service = Self {
            config,
            model_cache: Arc::new(DashMap::new()),
            storage_service,
            embedding_service,
            models_dir,
            cache_dir,
            local_dir,
            bundled_dir,
        };

        // Initialize bundled models
        service.initialize_bundled_models().await?;

        // Scan for existing local models
        service.scan_local_models().await?;

        info!("✅ ModelService initialized successfully");
        Ok(service)
    }

    /// Initialize bundled models that ship with the application
    async fn initialize_bundled_models(&self) -> Result<(), ModelError> {
        info!("📦 Initializing bundled models");

        for model_id in &self.config.bundled_models {
            match model_id.as_str() {
                "sentence-transformers/all-MiniLM-L6-v2" => {
                    let mut metadata = ModelMetadata::bundled_mini_lm();
                    metadata.local_path = Some(self.bundled_dir.join("all-MiniLM-L6-v2"));

                    self.model_cache.insert(model_id.clone(), metadata);
                    info!("✅ Registered bundled model: {}", model_id);
                }
                _ => {
                    warn!("⚠️  Unknown bundled model: {}", model_id);
                }
            }
        }

        Ok(())
    }

    /// Scan local directories for installed models
    pub async fn scan_local_models(&self) -> Result<Vec<ModelMetadata>, ModelError> {
        info!("🔍 Scanning local models in {:?}", self.local_dir);

        let mut discovered_models = Vec::new();

        if !self.local_dir.exists() {
            return Ok(discovered_models);
        }

        let entries = fs::read_dir(&self.local_dir)?;
        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                if let Ok(metadata) = self.detect_model_metadata(&path).await {
                    self.model_cache.insert(metadata.id.clone(), metadata.clone());
                    discovered_models.push(metadata);
                }
            }
        }

        info!("✅ Discovered {} local models", discovered_models.len());
        Ok(discovered_models)
    }

    /// Detect model metadata from directory structure
    async fn detect_model_metadata(&self, model_path: &Path) -> Result<ModelMetadata, ModelError> {
        let model_name = model_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Basic model metadata detection (expandable)
        let metadata = ModelMetadata {
            id: format!("local/{}", model_name),
            name: model_name.clone(),
            description: format!("Locally imported model: {}", model_name),
            model_type: ModelType::Embedding, // Default assumption
            size_mb: self.calculate_directory_size_sync(model_path)? / 1_048_576, // Convert to MB
            dimensions: 384, // Default assumption
            max_sequence_length: 512, // Default assumption
            source: ModelSource::Local,
            status: ModelStatus::Available,
            local_path: Some(model_path.to_path_buf()),
            checksum: None,
            performance_metrics: PerformanceMetrics::default(),
            last_used: None,
            compatibility: vec!["sentence-transformers".to_string()],
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        Ok(metadata)
    }

    /// Calculate total directory size in bytes
    fn calculate_directory_size_sync(&self, dir_path: &Path) -> Result<u64, ModelError> {
        let mut total_size = 0;

        if dir_path.is_dir() {
            let entries = fs::read_dir(dir_path)?;
            for entry in entries {
                let entry = entry?;
                let path = entry.path();

                if path.is_file() {
                    if let Ok(metadata) = fs::metadata(&path) {
                        total_size += metadata.len();
                    }
                } else if path.is_dir() {
                    total_size += self.calculate_directory_size_sync(&path)?;
                }
            }
        }

        Ok(total_size)
    }

    /// Get model metadata by ID
    pub async fn get_model(&self, model_id: &str) -> Option<ModelMetadata> {
        self.model_cache.get(model_id).map(|entry| entry.clone())
    }

    /// Get all registered models
    pub async fn list_models(&self) -> Vec<ModelMetadata> {
        self.model_cache.iter().map(|entry| entry.clone()).collect()
    }

    /// Get models by type
    pub async fn list_models_by_type(&self, model_type: ModelType) -> Vec<ModelMetadata> {
        self.model_cache
            .iter()
            .filter(|entry| entry.model_type == model_type)
            .map(|entry| entry.clone())
            .collect()
    }

    /// Get available (ready-to-use) models
    pub async fn list_available_models(&self) -> Vec<ModelMetadata> {
        self.model_cache
            .iter()
            .filter(|entry| matches!(entry.status, ModelStatus::Available))
            .map(|entry| entry.clone())
            .collect()
    }

    /// Get model status
    pub async fn get_model_status(&self, model_id: &str) -> Result<ModelStatus, ModelError> {
        match self.model_cache.get(model_id) {
            Some(metadata) => Ok(metadata.status.clone()),
            None => Err(ModelError::ModelNotFound(model_id.to_string())),
        }
    }

    /// Update model metadata
    pub async fn update_model(&self, model_id: &str, metadata: ModelMetadata) -> Result<(), ModelError> {
        if self.model_cache.contains_key(model_id) {
            self.model_cache.insert(model_id.to_string(), metadata);
            Ok(())
        } else {
            Err(ModelError::ModelNotFound(model_id.to_string()))
        }
    }

    /// Mark model as used (for LRU tracking)
    pub async fn touch_model(&self, model_id: &str) -> Result<(), ModelError> {
        if let Some(mut entry) = self.model_cache.get_mut(model_id) {
            entry.touch();
            Ok(())
        } else {
            Err(ModelError::ModelNotFound(model_id.to_string()))
        }
    }

    /// Get storage statistics
    pub async fn get_storage_stats(&self) -> Result<ModelStorageStats, ModelError> {
        let models: Vec<_> = self.model_cache.iter().map(|entry| entry.clone()).collect();
        let total_models = models.len();
        let available_models = models.iter().filter(|m| matches!(m.status, ModelStatus::Available)).count();

        let storage_used_mb: u64 = models.iter().map(|m| m.size_mb).sum();
        let storage_limit_mb = self.config.cache_size_gb.unwrap_or(2048) * 1024; // Default 2GB -> MB
        let usage_percentage = (storage_used_mb as f32) / (storage_limit_mb as f32);

        Ok(ModelStorageStats {
            total_models,
            available_models,
            storage_used_mb,
            storage_limit_mb,
            usage_percentage,
            cached_models: 0, // TODO: Query embedding worker cache
            worker_memory_mb: 0, // TODO: Query embedding worker memory
        })
    }

    /// Get fallback model recommendation for a given model type
    pub async fn get_fallback_model(&self, model_type: &ModelType) -> Result<String, ModelError> {
        let available_models = self.list_models_by_type(model_type.clone()).await;

        // Prioritize bundled models for fallback
        for model in &available_models {
            if matches!(model.source, ModelSource::Bundled) && matches!(model.status, ModelStatus::Available) {
                return Ok(model.id.clone());
            }
        }

        // Fall back to any available model of the right type
        for model in &available_models {
            if matches!(model.status, ModelStatus::Available) {
                return Ok(model.id.clone());
            }
        }

        Err(ModelError::ModelNotFound(format!("No fallback model available for type {:?}", model_type)))
    }

    /// Validate model availability for pipeline step
    pub async fn validate_model_dependencies(&self, model_id: &str) -> Result<Vec<ValidationWarning>, ModelError> {
        let mut warnings = Vec::new();

        match self.get_model_status(model_id).await? {
            ModelStatus::Available => {
                // Model is ready - no warnings needed
            }
            ModelStatus::NotDownloaded => {
                return Err(ModelError::ModelNotFound(format!(
                    "Model {} not downloaded. Please download or use fallback model",
                    model_id
                )));
            }
            ModelStatus::Downloading { progress, eta_seconds } => {
                warnings.push(ValidationWarning::ModelDownloading {
                    model_id: model_id.to_string(),
                    progress,
                    eta_seconds,
                });
            }
            ModelStatus::Error { message } => {
                return Err(ModelError::ModelValidationFailed {
                    model_id: model_id.to_string(),
                    reason: message,
                });
            }
        }

        Ok(warnings)
    }

    /// Remove model from registry and storage
    pub async fn remove_model(&self, model_id: &str) -> Result<(), ModelError> {
        if let Some((_, metadata)) = self.model_cache.remove(model_id) {
            // Remove local files if they exist
            if let Some(local_path) = metadata.local_path {
                if local_path.exists() {
                    fs::remove_dir_all(&local_path)?;
                    info!("🗑️  Removed model files: {:?}", local_path);
                }
            }

            info!("✅ Removed model from registry: {}", model_id);
            Ok(())
        } else {
            Err(ModelError::ModelNotFound(model_id.to_string()))
        }
    }
}

/// Validation warning for pipeline pre-validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationWarning {
    ModelDownloading {
        model_id: String,
        progress: u8,
        eta_seconds: Option<u64>,
    },
    SuboptimalModel {
        current: String,
        suggested: String,
        reason: String,
    },
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use tokio::test;
    use crate::services::storage::{StorageService, StorageConfig};
    use crate::services::embedding::{EmbeddingService, EmbeddingConfig};

    #[test]
    async fn test_model_service_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let models_dir = temp_dir.path().join("models");
        let storage_dir = temp_dir.path().join("storage");

        // Create dependencies
        let storage_config = StorageConfig::new_test(storage_dir);
        let storage_service = Arc::new(RwLock::new(StorageService::new(storage_config).await.unwrap()));

        let embedding_config = EmbeddingConfig::test();
        let embedding_service = Arc::new(EmbeddingService::new(embedding_config));

        // Create model service
        let model_config = ModelConfig::new_test(models_dir);
        let model_service = ModelService::new(model_config, storage_service, embedding_service).await.unwrap();

        // Verify bundled models are registered
        let models = model_service.list_models().await;
        assert!(!models.is_empty());

        // Check for bundled MiniLM model
        let mini_lm = model_service.get_model("sentence-transformers/all-MiniLM-L6-v2").await;
        assert!(mini_lm.is_some());

        let mini_lm = mini_lm.unwrap();
        assert_eq!(mini_lm.model_type, ModelType::Embedding);
        assert_eq!(mini_lm.source, ModelSource::Bundled);
        assert!(matches!(mini_lm.status, ModelStatus::Available));
    }

    #[test]
    async fn test_model_metadata_operations() {
        let temp_dir = TempDir::new().unwrap();
        let models_dir = temp_dir.path().join("models");
        let storage_dir = temp_dir.path().join("storage");

        let storage_config = StorageConfig::new_test(storage_dir);
        let storage_service = Arc::new(RwLock::new(StorageService::new(storage_config).await.unwrap()));

        let embedding_config = EmbeddingConfig::test();
        let embedding_service = Arc::new(EmbeddingService::new(embedding_config));

        let model_config = ModelConfig::new_test(models_dir);
        let model_service = ModelService::new(model_config, storage_service, embedding_service).await.unwrap();

        // Test touch model (LRU update)
        let model_id = "sentence-transformers/all-MiniLM-L6-v2";
        model_service.touch_model(model_id).await.unwrap();

        let model = model_service.get_model(model_id).await.unwrap();
        assert!(model.last_used.is_some());
    }

    #[test]
    async fn test_model_filtering() {
        let temp_dir = TempDir::new().unwrap();
        let models_dir = temp_dir.path().join("models");
        let storage_dir = temp_dir.path().join("storage");

        let storage_config = StorageConfig::new_test(storage_dir);
        let storage_service = Arc::new(RwLock::new(StorageService::new(storage_config).await.unwrap()));

        let embedding_config = EmbeddingConfig::test();
        let embedding_service = Arc::new(EmbeddingService::new(embedding_config));

        let model_config = ModelConfig::new_test(models_dir);
        let model_service = ModelService::new(model_config, storage_service, embedding_service).await.unwrap();

        // Test filtering by type
        let embedding_models = model_service.list_models_by_type(ModelType::Embedding).await;
        assert!(!embedding_models.is_empty());

        // Test available models
        let available_models = model_service.list_available_models().await;
        assert!(!available_models.is_empty());

        // Test storage stats
        let stats = model_service.get_storage_stats().await.unwrap();
        assert!(stats.total_models > 0);
        assert!(stats.available_models > 0);
    }

    #[test]
    async fn test_fallback_model_selection() {
        let temp_dir = TempDir::new().unwrap();
        let models_dir = temp_dir.path().join("models");
        let storage_dir = temp_dir.path().join("storage");

        let storage_config = StorageConfig::new_test(storage_dir);
        let storage_service = Arc::new(RwLock::new(StorageService::new(storage_config).await.unwrap()));

        let embedding_config = EmbeddingConfig::test();
        let embedding_service = Arc::new(EmbeddingService::new(embedding_config));

        let model_config = ModelConfig::new_test(models_dir);
        let model_service = ModelService::new(model_config, storage_service, embedding_service).await.unwrap();

        // Test fallback model selection
        let fallback = model_service.get_fallback_model(&ModelType::Embedding).await.unwrap();
        assert!(!fallback.is_empty());

        // Should prioritize bundled models
        assert!(fallback.contains("sentence-transformers/all-MiniLM-L6-v2"));
    }

    #[test]
    async fn test_model_validation() {
        let temp_dir = TempDir::new().unwrap();
        let models_dir = temp_dir.path().join("models");
        let storage_dir = temp_dir.path().join("storage");

        let storage_config = StorageConfig::new_test(storage_dir);
        let storage_service = Arc::new(RwLock::new(StorageService::new(storage_config).await.unwrap()));

        let embedding_config = EmbeddingConfig::test();
        let embedding_service = Arc::new(EmbeddingService::new(embedding_config));

        let model_config = ModelConfig::new_test(models_dir);
        let model_service = ModelService::new(model_config, storage_service, embedding_service).await.unwrap();

        // Test validation for available model
        let warnings = model_service
            .validate_model_dependencies("sentence-transformers/all-MiniLM-L6-v2")
            .await
            .unwrap();
        assert!(warnings.is_empty());

        // Test validation for non-existent model
        let result = model_service
            .validate_model_dependencies("non-existent-model")
            .await;
        assert!(result.is_err());
    }
}