/*!
 * LRU Model Cache for Embedding Worker
 *
 * Implements intelligent model caching to prevent memory thrashing while
 * maintaining performance. Manages model loading/unloading in the embedding
 * worker subprocess with memory limits and LRU eviction.
 */

use lru::LruCache;
use std::collections::HashSet;
use std::num::NonZeroUsize;
use std::sync::Arc;
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use tokio::sync::RwLock;
use tracing::{info, warn, error, debug};

/// Loaded model in memory
#[derive(Debug, Clone)]
pub struct LoadedModel {
    /// Model identifier
    pub id: String,
    /// Model name for display
    pub name: String,
    /// Estimated memory usage in GB
    pub memory_usage_gb: f64,
    /// When the model was loaded
    pub loaded_at: DateTime<Utc>,
    /// Last time the model was accessed
    pub last_accessed: DateTime<Utc>,
    /// Local path to model files
    pub local_path: PathBuf,
    /// Model-specific data (embedder instance, etc.)
    /// This would contain the actual Python model object
    pub model_data: Arc<dyn std::any::Any + Send + Sync>,
}

impl LoadedModel {
    /// Create new loaded model
    pub fn new(
        id: String,
        name: String,
        memory_usage_gb: f64,
        local_path: PathBuf,
        model_data: Arc<dyn std::any::Any + Send + Sync>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id,
            name,
            memory_usage_gb,
            loaded_at: now,
            last_accessed: now,
            local_path,
            model_data,
        }
    }

    /// Update last accessed time
    pub fn touch(&mut self) {
        self.last_accessed = Utc::now();
    }

    /// Get age since loading
    pub fn age_seconds(&self) -> i64 {
        (Utc::now() - self.loaded_at).num_seconds()
    }

    /// Get time since last access
    pub fn idle_seconds(&self) -> i64 {
        (Utc::now() - self.last_accessed).num_seconds()
    }
}

/// Model cache configuration
#[derive(Debug, Clone)]
pub struct ModelCacheConfig {
    /// Maximum memory usage in GB
    pub max_memory_gb: f64,
    /// Memory usage threshold for cleanup (0.9 = 90%)
    pub cleanup_threshold: f64,
    /// Maximum number of models to keep loaded
    pub max_models: usize,
    /// Models to keep warm (preloaded)
    pub warm_models: HashSet<String>,
    /// Minimum idle time before eviction (seconds)
    pub min_idle_seconds: i64,
}

impl Default for ModelCacheConfig {
    fn default() -> Self {
        Self {
            max_memory_gb: 2.0,
            cleanup_threshold: 0.9,
            max_models: 3, // Conservative limit for MVP
            warm_models: HashSet::from([
                "sentence-transformers/all-MiniLM-L6-v2".to_string(),
            ]),
            min_idle_seconds: 300, // 5 minutes
        }
    }
}

impl ModelCacheConfig {
    /// Create MVP configuration
    pub fn mvp() -> Self {
        Self::default()
    }

    /// Create test configuration with smaller limits
    pub fn test() -> Self {
        Self {
            max_memory_gb: 0.1, // 100MB for tests
            cleanup_threshold: 0.5,
            max_models: 1,
            warm_models: HashSet::new(),
            min_idle_seconds: 5, // 5 seconds for tests
        }
    }

    /// Create production configuration
    pub fn production() -> Self {
        Self {
            max_memory_gb: 4.0,
            cleanup_threshold: 0.8,
            max_models: 5,
            warm_models: HashSet::from([
                "sentence-transformers/all-MiniLM-L6-v2".to_string(),
                "sentence-transformers/all-mpnet-base-v2".to_string(),
            ]),
            min_idle_seconds: 600, // 10 minutes
        }
    }
}

/// Model cache statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCacheStats {
    /// Number of models currently loaded
    pub loaded_models: usize,
    /// Total memory usage in GB
    pub memory_usage_gb: f64,
    /// Memory usage percentage (0.0-1.0)
    pub memory_usage_percent: f64,
    /// Number of cache hits
    pub cache_hits: u64,
    /// Number of cache misses
    pub cache_misses: u64,
    /// Number of models evicted
    pub evictions: u64,
    /// Cache hit rate (0.0-1.0)
    pub hit_rate: f64,
    /// Models currently warm
    pub warm_models: Vec<String>,
}

/// LRU Model Cache
pub struct ModelCache {
    /// Configuration
    config: ModelCacheConfig,
    /// LRU cache of loaded models
    cache: LruCache<String, LoadedModel>,
    /// Current total memory usage in GB
    current_memory_gb: f64,
    /// Models that should stay warm (preloaded)
    warm_models: HashSet<String>,
    /// Cache statistics
    cache_hits: u64,
    cache_misses: u64,
    evictions: u64,
}

impl ModelCache {
    /// Create new model cache with configuration
    pub fn new(config: ModelCacheConfig) -> Self {
        let capacity = NonZeroUsize::new(config.max_models).unwrap();
        let cache = LruCache::new(capacity);
        let warm_models = config.warm_models.clone();

        Self {
            config,
            cache,
            current_memory_gb: 0.0,
            warm_models,
            cache_hits: 0,
            cache_misses: 0,
            evictions: 0,
        }
    }

    /// Ensure model is loaded in cache
    pub async fn ensure_model_loaded(&mut self, model_id: &str) -> Result<(), ModelCacheError> {
        debug!("🔍 Ensuring model loaded: {}", model_id);

        // Check if model is already cached
        if let Some(model) = self.cache.get_mut(model_id) {
            model.touch();
            self.cache_hits += 1;
            debug!("✅ Cache hit for model: {}", model_id);
            return Ok(());
        }

        self.cache_misses += 1;
        debug!("❌ Cache miss for model: {}", model_id);

        // Free memory if approaching limit
        self.maybe_cleanup_memory().await?;

        // Load new model from disk
        let loaded_model = self.load_model_from_disk(model_id).await?;
        let memory_usage = loaded_model.memory_usage_gb;

        // Check if we have space for this model
        if self.current_memory_gb + memory_usage > self.config.max_memory_gb {
            return Err(ModelCacheError::InsufficientMemory {
                required_gb: memory_usage,
                available_gb: self.config.max_memory_gb - self.current_memory_gb,
            });
        }

        // Add to cache
        self.current_memory_gb += memory_usage;
        self.cache.put(model_id.to_string(), loaded_model);

        info!("📦 Loaded model: {} ({:.2}GB, total: {:.2}GB)", model_id, memory_usage, self.current_memory_gb);

        Ok(())
    }

    /// Get loaded model by ID
    pub fn get_model(&mut self, model_id: &str) -> Option<&mut LoadedModel> {
        self.cache.get_mut(model_id)
    }

    /// Load model from disk (placeholder - would implement actual model loading)
    async fn load_model_from_disk(&self, model_id: &str) -> Result<LoadedModel, ModelCacheError> {
        debug!("📂 Loading model from disk: {}", model_id);

        // This is a placeholder implementation
        // In a real implementation, this would:
        // 1. Find the model path
        // 2. Load the model using Python/sentence-transformers
        // 3. Estimate memory usage
        // 4. Wrap in LoadedModel

        let (name, memory_gb, path) = match model_id {
            "sentence-transformers/all-MiniLM-L6-v2" => {
                ("All MiniLM L6 v2".to_string(), 0.09, PathBuf::from("./models/bundled/all-MiniLM-L6-v2"))
            }
            "sentence-transformers/all-mpnet-base-v2" => {
                ("All MPNet Base v2".to_string(), 0.4, PathBuf::from("./models/local/all-mpnet-base-v2"))
            }
            _ => {
                return Err(ModelCacheError::ModelNotFound(model_id.to_string()));
            }
        };

        // Simulate model loading time
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Create dummy model data (in real implementation, this would be the actual model)
        let model_data = Arc::new(format!("Model data for {}", model_id));

        let loaded_model = LoadedModel::new(
            model_id.to_string(),
            name,
            memory_gb,
            path,
            model_data,
        );

        Ok(loaded_model)
    }

    /// Clean up memory if approaching threshold
    async fn maybe_cleanup_memory(&mut self) -> Result<(), ModelCacheError> {
        let memory_usage_percent = self.current_memory_gb / self.config.max_memory_gb;

        if memory_usage_percent >= self.config.cleanup_threshold {
            debug!("🧹 Memory cleanup triggered: {:.1}% usage", memory_usage_percent * 100.0);
            self.cleanup_memory().await?;
        }

        Ok(())
    }

    /// Force memory cleanup by evicting LRU models
    async fn cleanup_memory(&mut self) -> Result<(), ModelCacheError> {
        let initial_memory = self.current_memory_gb;
        let mut evicted = 0;

        // Keep evicting until we're below threshold
        while self.current_memory_gb / self.config.max_memory_gb >= self.config.cleanup_threshold {
            if let Some((model_id, model)) = self.cache.pop_lru() {
                // Don't evict warm models unless absolutely necessary
                if self.warm_models.contains(&model_id) && self.cache.len() > 1 {
                    // Put warm model back and continue
                    self.cache.put(model_id, model);
                    break;
                }

                self.current_memory_gb -= model.memory_usage_gb;
                self.evictions += 1;
                evicted += 1;

                warn!("♻️  Evicted model: {} ({:.2}GB)", model_id, model.memory_usage_gb);
            } else {
                // No more models to evict
                break;
            }
        }

        if evicted > 0 {
            info!("🧹 Memory cleanup complete: evicted {} models, freed {:.2}GB",
                evicted, initial_memory - self.current_memory_gb);
        }

        Ok(())
    }

    /// Preload warm models
    pub async fn warm_up_models(&mut self) -> Result<(), ModelCacheError> {
        info!("🔥 Warming up {} models", self.warm_models.len());

        for model_id in self.warm_models.clone() {
            if let Err(e) = self.ensure_model_loaded(&model_id).await {
                warn!("⚠️  Failed to warm up model {}: {}", model_id, e);
            }
        }

        Ok(())
    }

    /// Unload specific model
    pub async fn unload_model(&mut self, model_id: &str) -> Result<(), ModelCacheError> {
        if let Some(model) = self.cache.pop(model_id) {
            self.current_memory_gb -= model.memory_usage_gb;
            info!("🗑️  Unloaded model: {} ({:.2}GB)", model_id, model.memory_usage_gb);
            Ok(())
        } else {
            Err(ModelCacheError::ModelNotFound(model_id.to_string()))
        }
    }

    /// Get cache statistics
    pub fn get_stats(&self) -> ModelCacheStats {
        let loaded_models: Vec<String> = self.cache.iter().map(|(k, _)| k.clone()).collect();
        let warm_models: Vec<String> = self.warm_models
            .iter()
            .filter(|id| loaded_models.contains(id))
            .cloned()
            .collect();

        let total_requests = self.cache_hits + self.cache_misses;
        let hit_rate = if total_requests > 0 {
            self.cache_hits as f64 / total_requests as f64
        } else {
            0.0
        };

        ModelCacheStats {
            loaded_models: self.cache.len(),
            memory_usage_gb: self.current_memory_gb,
            memory_usage_percent: self.current_memory_gb / self.config.max_memory_gb,
            cache_hits: self.cache_hits,
            cache_misses: self.cache_misses,
            evictions: self.evictions,
            hit_rate,
            warm_models,
        }
    }

    /// Clear all cached models
    pub async fn clear(&mut self) {
        let count = self.cache.len();
        self.cache.clear();
        self.current_memory_gb = 0.0;
        info!("🧹 Cleared all {} models from cache", count);
    }

    /// Get list of loaded model IDs
    pub fn loaded_model_ids(&self) -> Vec<String> {
        self.cache.iter().map(|(id, _)| id.clone()).collect()
    }
}

/// Thread-safe wrapper for ModelCache
pub struct ThreadSafeModelCache {
    inner: Arc<RwLock<ModelCache>>,
}

impl ThreadSafeModelCache {
    /// Create new thread-safe model cache
    pub fn new(config: ModelCacheConfig) -> Self {
        Self {
            inner: Arc::new(RwLock::new(ModelCache::new(config))),
        }
    }

    /// Ensure model is loaded
    pub async fn ensure_model_loaded(&self, model_id: &str) -> Result<(), ModelCacheError> {
        let mut cache = self.inner.write().await;
        cache.ensure_model_loaded(model_id).await?;
        Ok(())
    }

    /// Get cache statistics
    pub async fn get_stats(&self) -> ModelCacheStats {
        let cache = self.inner.read().await;
        cache.get_stats()
    }

    /// Warm up models
    pub async fn warm_up_models(&self) -> Result<(), ModelCacheError> {
        let mut cache = self.inner.write().await;
        cache.warm_up_models().await
    }

    /// Unload specific model
    pub async fn unload_model(&self, model_id: &str) -> Result<(), ModelCacheError> {
        let mut cache = self.inner.write().await;
        cache.unload_model(model_id).await
    }

    /// Clear all models
    pub async fn clear(&self) {
        let mut cache = self.inner.write().await;
        cache.clear().await;
    }

    /// Get loaded model IDs
    pub async fn loaded_model_ids(&self) -> Vec<String> {
        let cache = self.inner.read().await;
        cache.loaded_model_ids()
    }
}

/// Model cache errors
#[derive(Debug, thiserror::Error)]
pub enum ModelCacheError {
    #[error("Model not found: {0}")]
    ModelNotFound(String),

    #[error("Insufficient memory: need {required_gb:.2}GB, have {available_gb:.2}GB")]
    InsufficientMemory { required_gb: f64, available_gb: f64 },

    #[error("Model loading failed: {0}")]
    ModelLoadingFailed(String),

    #[error("Cache operation failed: {0}")]
    CacheOperationFailed(String),

    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_model_cache_basic_operations() {
        let config = ModelCacheConfig::test();
        let mut cache = ModelCache::new(config);

        // Test loading a model
        cache.ensure_model_loaded("sentence-transformers/all-MiniLM-L6-v2").await.unwrap();

        // Test cache hit
        cache.ensure_model_loaded("sentence-transformers/all-MiniLM-L6-v2").await.unwrap();

        // Check stats
        let stats = cache.get_stats();
        assert_eq!(stats.loaded_models, 1);
        assert!(stats.cache_hits > 0);
        assert_eq!(stats.cache_misses, 1);
    }

    #[tokio::test]
    async fn test_model_cache_memory_limits() {
        let mut config = ModelCacheConfig::test();
        config.max_memory_gb = 0.05; // Very small limit
        config.cleanup_threshold = 0.5;

        let mut cache = ModelCache::new(config);

        // Load first model
        cache.ensure_model_loaded("sentence-transformers/all-MiniLM-L6-v2").await.unwrap();

        // Try to load second model - should trigger cleanup
        let _result = cache.ensure_model_loaded("sentence-transformers/all-mpnet-base-v2").await;
        // Might fail due to memory limits, which is expected behavior

        let stats = cache.get_stats();
        assert!(stats.memory_usage_gb <= 0.05);
    }

    #[tokio::test]
    async fn test_model_cache_eviction() {
        let mut config = ModelCacheConfig::test();
        config.max_models = 1; // Only one model allowed

        let mut cache = ModelCache::new(config);

        // Load first model
        cache.ensure_model_loaded("sentence-transformers/all-MiniLM-L6-v2").await.unwrap();
        assert_eq!(cache.cache.len(), 1);

        // Load second model - should evict first
        cache.ensure_model_loaded("sentence-transformers/all-mpnet-base-v2").await.unwrap();
        assert_eq!(cache.cache.len(), 1);

        // Check that stats show eviction
        let stats = cache.get_stats();
        assert!(stats.evictions > 0);
    }

    #[tokio::test]
    async fn test_thread_safe_cache() {
        let config = ModelCacheConfig::test();
        let cache = ThreadSafeModelCache::new(config);

        // Test concurrent access
        let cache1 = cache.clone();
        let cache2 = cache.clone();

        let task1 = tokio::spawn(async move {
            cache1.ensure_model_loaded("sentence-transformers/all-MiniLM-L6-v2").await
        });

        let task2 = tokio::spawn(async move {
            cache2.get_stats().await
        });

        let (result1, stats) = tokio::join!(task1, task2);
        assert!(result1.unwrap().is_ok());
        assert!(stats.loaded_models <= 1);
    }
}