/*!
 * Cache Service Implementation
 *
 * Provides simple memory caching with dashmap TTL for MVP Phase 1.2.
 * Implements basic request-level caching with TTL-based eviction.
 * Clear upgrade path to layered caching architecture post-MVP.
 */

use dashmap::DashMap;
use std::hash::Hash;
use std::sync::Arc;
use std::time::{Duration, Instant};
use serde::{Serialize, Deserialize};
use thiserror::Error;
use tracing::{debug, info};
use tokio::sync::RwLock;
use tokio::time::interval;

/// Cache Service Error Types
#[derive(Debug, Error)]
pub enum CacheError {
    #[error("Cache key not found: {0}")]
    KeyNotFound(String),

    #[error("Cache entry expired: {0}")]
    EntryExpired(String),

    #[error("Serialization failed: {0}")]
    SerializationFailed(String),

    #[error("Cache operation failed: {0}")]
    OperationFailed(String),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}

/// Cache configuration
#[derive(Debug, Clone)]
pub struct CacheConfig {
    /// Default TTL for cache entries in seconds
    pub default_ttl_secs: u64,
    /// Maximum number of entries before eviction
    pub max_entries: usize,
    /// How often to run cleanup in seconds
    pub cleanup_interval_secs: u64,
    /// Whether to enable automatic cleanup
    pub auto_cleanup: bool,
}

impl CacheConfig {
    /// Create MVP cache config with reasonable defaults
    pub fn new_mvp() -> Self {
        Self {
            default_ttl_secs: 300, // 5 minutes default TTL
            max_entries: 1000,     // 1K entries max for MVP
            cleanup_interval_secs: 60, // Cleanup every minute
            auto_cleanup: true,
        }
    }

    /// Create test config with smaller limits
    pub fn new_test() -> Self {
        Self {
            default_ttl_secs: 30, // 30 seconds for tests
            max_entries: 100,     // 100 entries max for tests
            cleanup_interval_secs: 5, // Cleanup every 5 seconds
            auto_cleanup: true,
        }
    }

    /// Create high-performance config for production
    pub fn new_production() -> Self {
        Self {
            default_ttl_secs: 600, // 10 minutes default TTL
            max_entries: 10000,    // 10K entries max
            cleanup_interval_secs: 30, // Cleanup every 30 seconds
            auto_cleanup: true,
        }
    }
}

/// Cache entry with expiration
#[derive(Debug, Clone)]
struct CacheEntry<V> {
    value: V,
    created_at: Instant,
    ttl_secs: u64,
    access_count: u64,
    last_accessed: Instant,
}

impl<V> CacheEntry<V> {
    fn new(value: V, ttl_secs: u64) -> Self {
        let now = Instant::now();
        Self {
            value,
            created_at: now,
            ttl_secs,
            access_count: 0,
            last_accessed: now,
        }
    }

    fn is_expired(&self) -> bool {
        self.created_at.elapsed().as_secs() > self.ttl_secs
    }

    fn access(&mut self) -> &V {
        self.access_count += 1;
        self.last_accessed = Instant::now();
        &self.value
    }
}

/// Cache statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub total_entries: usize,
    pub hit_count: u64,
    pub miss_count: u64,
    pub hit_rate: f64,
    pub expired_entries: u64,
    pub evicted_entries: u64,
    pub memory_usage_estimate: u64,
}

/// Cache metrics for a specific key pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheMetrics {
    pub key_pattern: String,
    pub hit_count: u64,
    pub miss_count: u64,
    pub average_ttl_secs: u64,
    pub total_size_estimate: u64,
}

/// Simple memory cache service with TTL using DashMap
pub struct CacheService<K, V>
where
    K: Clone + Eq + Hash + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    config: CacheConfig,
    cache: Arc<DashMap<K, CacheEntry<V>>>,
    stats: Arc<RwLock<CacheStats>>,
    cleanup_handle: Option<tokio::task::JoinHandle<()>>,
}

impl<K, V> CacheService<K, V>
where
    K: Clone + Eq + Hash + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    /// Initialize cache service with configuration
    pub async fn new(config: CacheConfig) -> Result<Self, CacheError> {
        info!("Initializing CacheService with config: {:?}", config);

        let cache = Arc::new(DashMap::with_capacity(config.max_entries));
        let stats = Arc::new(RwLock::new(CacheStats {
            total_entries: 0,
            hit_count: 0,
            miss_count: 0,
            hit_rate: 0.0,
            expired_entries: 0,
            evicted_entries: 0,
            memory_usage_estimate: 0,
        }));

        let mut service = Self {
            config: config.clone(),
            cache: cache.clone(),
            stats: stats.clone(),
            cleanup_handle: None,
        };

        // Start automatic cleanup if enabled
        if config.auto_cleanup {
            let cleanup_cache = cache.clone();
            let cleanup_stats = stats.clone();
            let cleanup_interval = config.cleanup_interval_secs;

            let handle = tokio::spawn(async move {
                let mut interval = interval(Duration::from_secs(cleanup_interval));
                loop {
                    interval.tick().await;
                    Self::cleanup_expired_entries(&cleanup_cache, &cleanup_stats).await;
                }
            });

            service.cleanup_handle = Some(handle);
        }

        info!("CacheService initialized successfully");
        Ok(service)
    }

    /// Store value in cache with default TTL
    pub async fn put(&self, key: K, value: V) -> Result<(), CacheError> {
        self.put_with_ttl(key, value, self.config.default_ttl_secs).await
    }

    /// Store value in cache with custom TTL
    pub async fn put_with_ttl(&self, key: K, value: V, ttl_secs: u64) -> Result<(), CacheError> {
        // Check if we need to evict entries to make space
        if self.cache.len() >= self.config.max_entries {
            self.evict_lru_entries(self.config.max_entries / 10).await; // Evict 10% of entries
        }

        let entry = CacheEntry::new(value, ttl_secs);
        self.cache.insert(key, entry);

        // Update stats
        let mut stats = self.stats.write().await;
        stats.total_entries = self.cache.len();

        debug!("Cached entry with TTL: {} seconds", ttl_secs);
        Ok(())
    }

    /// Retrieve value from cache
    pub async fn get(&self, key: &K) -> Result<V, CacheError> {
        if let Some(mut entry_ref) = self.cache.get_mut(key) {
            if entry_ref.is_expired() {
                // Remove expired entry
                drop(entry_ref);
                self.cache.remove(key);

                // Update stats
                let mut stats = self.stats.write().await;
                stats.miss_count += 1;
                stats.expired_entries += 1;
                stats.total_entries = self.cache.len();
                Self::update_hit_rate(&mut stats);

                return Err(CacheError::EntryExpired("Cache entry expired".to_string()));
            }

            // Access the entry and clone the value
            let value = entry_ref.access().clone();

            // Update stats
            let mut stats = self.stats.write().await;
            stats.hit_count += 1;
            Self::update_hit_rate(&mut stats);

            debug!("Cache hit");
            return Ok(value);
        }

        // Cache miss
        let mut stats = self.stats.write().await;
        stats.miss_count += 1;
        Self::update_hit_rate(&mut stats);

        debug!("Cache miss");
        Err(CacheError::KeyNotFound("Key not found in cache".to_string()))
    }

    /// Check if key exists and is not expired
    pub async fn contains_key(&self, key: &K) -> bool {
        if let Some(entry) = self.cache.get(key) {
            !entry.is_expired()
        } else {
            false
        }
    }

    /// Remove entry from cache
    pub async fn remove(&self, key: &K) -> Result<V, CacheError> {
        if let Some((_, entry)) = self.cache.remove(key) {
            // Update stats
            let mut stats = self.stats.write().await;
            stats.total_entries = self.cache.len();

            debug!("Removed cache entry");
            Ok(entry.value)
        } else {
            Err(CacheError::KeyNotFound("Key not found for removal".to_string()))
        }
    }

    /// Clear all entries from cache
    pub async fn clear(&self) -> Result<(), CacheError> {
        let count = self.cache.len();
        self.cache.clear();

        // Update stats
        let mut stats = self.stats.write().await;
        stats.total_entries = 0;
        stats.evicted_entries += count as u64;

        info!("Cleared cache: {} entries removed", count);
        Ok(())
    }

    /// Get cache statistics
    pub async fn get_stats(&self) -> CacheStats {
        let stats = self.stats.read().await;
        let mut result = stats.clone();
        result.total_entries = self.cache.len();

        // Estimate memory usage (rough calculation)
        result.memory_usage_estimate = (result.total_entries * 100) as u64; // ~100 bytes per entry estimate

        result
    }

    /// Get cache size
    pub fn len(&self) -> usize {
        self.cache.len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.cache.is_empty()
    }

    /// Cleanup expired entries manually
    pub async fn cleanup_expired(&self) -> Result<u64, CacheError> {
        let removed_count = Self::cleanup_expired_entries(&self.cache, &self.stats).await;
        info!("Manual cleanup completed: {} expired entries removed", removed_count);
        Ok(removed_count)
    }

    /// Internal cleanup method
    async fn cleanup_expired_entries(
        cache: &Arc<DashMap<K, CacheEntry<V>>>,
        stats: &Arc<RwLock<CacheStats>>,
    ) -> u64 {
        let mut expired_keys = Vec::new();

        // Collect expired keys
        for entry in cache.iter() {
            if entry.value().is_expired() {
                expired_keys.push(entry.key().clone());
            }
        }

        // Remove expired entries
        let removed_count = expired_keys.len() as u64;
        for key in expired_keys {
            cache.remove(&key);
        }

        if removed_count > 0 {
            // Update stats
            let mut stats_guard = stats.write().await;
            stats_guard.expired_entries += removed_count;
            stats_guard.total_entries = cache.len();

            debug!("Cleaned up {} expired cache entries", removed_count);
        }

        removed_count
    }

    /// Evict LRU entries when cache is full
    async fn evict_lru_entries(&self, count: usize) -> u64 {
        let mut entries_to_evict = Vec::new();

        // Collect entries sorted by last accessed time
        for entry in self.cache.iter() {
            entries_to_evict.push((entry.key().clone(), entry.value().last_accessed));
        }

        // Sort by last accessed time (oldest first)
        entries_to_evict.sort_by(|a, b| a.1.cmp(&b.1));

        // Remove the oldest entries
        let evict_count = std::cmp::min(count, entries_to_evict.len());
        for i in 0..evict_count {
            self.cache.remove(&entries_to_evict[i].0);
        }

        // Update stats
        let mut stats = self.stats.write().await;
        stats.evicted_entries += evict_count as u64;
        stats.total_entries = self.cache.len();

        if evict_count > 0 {
            debug!("Evicted {} LRU cache entries", evict_count);
        }

        evict_count as u64
    }

    /// Update hit rate in stats
    fn update_hit_rate(stats: &mut CacheStats) {
        let total_requests = stats.hit_count + stats.miss_count;
        stats.hit_rate = if total_requests > 0 {
            (stats.hit_count as f64 / total_requests as f64) * 100.0
        } else {
            0.0
        };
    }
}

impl<K, V> Drop for CacheService<K, V>
where
    K: Clone + Eq + Hash + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    fn drop(&mut self) {
        if let Some(handle) = self.cleanup_handle.take() {
            handle.abort();
        }
    }
}

/// Specialized string cache for common use cases
pub type StringCache = CacheService<String, String>;

/// Specialized bytes cache for binary data
pub type BytesCache = CacheService<String, Vec<u8>>;

/// JSON cache for structured data
pub type JsonCache = CacheService<String, serde_json::Value>;

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_cache_service_initialization() {
        let config = CacheConfig::new_test();
        let cache: StringCache = CacheService::new(config).await.unwrap();

        assert!(cache.is_empty());
        assert_eq!(cache.len(), 0);
    }

    #[tokio::test]
    async fn test_put_and_get() {
        let config = CacheConfig::new_test();
        let cache: StringCache = CacheService::new(config).await.unwrap();

        // Put a value
        cache.put("key1".to_string(), "value1".to_string()).await.unwrap();

        // Get the value
        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, "value1");

        // Verify contains_key
        assert!(cache.contains_key(&"key1".to_string()).await);
        assert!(!cache.contains_key(&"nonexistent".to_string()).await);
    }

    #[tokio::test]
    async fn test_ttl_expiration() {
        let config = CacheConfig::new_test();
        let cache: StringCache = CacheService::new(config).await.unwrap();

        // Put a value with short TTL
        cache.put_with_ttl("key1".to_string(), "value1".to_string(), 1).await.unwrap();

        // Should be accessible immediately
        assert!(cache.get(&"key1".to_string()).await.is_ok());

        // Wait for expiration
        sleep(Duration::from_secs(2)).await;

        // Should be expired now
        let result = cache.get(&"key1".to_string()).await;
        assert!(matches!(result, Err(CacheError::EntryExpired(_))));
    }

    #[tokio::test]
    async fn test_cache_stats() {
        let config = CacheConfig::new_test();
        let cache: StringCache = CacheService::new(config).await.unwrap();

        // Initial stats
        let stats = cache.get_stats().await;
        assert_eq!(stats.total_entries, 0);
        assert_eq!(stats.hit_count, 0);
        assert_eq!(stats.miss_count, 0);

        // Put and access values
        cache.put("key1".to_string(), "value1".to_string()).await.unwrap();
        let _ = cache.get(&"key1".to_string()).await.unwrap(); // Hit
        let _ = cache.get(&"nonexistent".to_string()).await.err(); // Miss

        let stats = cache.get_stats().await;
        assert_eq!(stats.total_entries, 1);
        assert_eq!(stats.hit_count, 1);
        assert_eq!(stats.miss_count, 1);
        assert!((stats.hit_rate - 50.0).abs() < f64::EPSILON); // 50% hit rate
    }

    #[tokio::test]
    async fn test_remove_and_clear() {
        let config = CacheConfig::new_test();
        let cache: StringCache = CacheService::new(config).await.unwrap();

        // Put values
        cache.put("key1".to_string(), "value1".to_string()).await.unwrap();
        cache.put("key2".to_string(), "value2".to_string()).await.unwrap();

        assert_eq!(cache.len(), 2);

        // Remove one value
        let removed = cache.remove(&"key1".to_string()).await.unwrap();
        assert_eq!(removed, "value1");
        assert_eq!(cache.len(), 1);

        // Clear all values
        cache.clear().await.unwrap();
        assert_eq!(cache.len(), 0);
        assert!(cache.is_empty());
    }

    #[tokio::test]
    async fn test_manual_cleanup() {
        let mut config = CacheConfig::new_test();
        config.auto_cleanup = false; // Disable automatic cleanup

        let cache: StringCache = CacheService::new(config).await.unwrap();

        // Put values with short TTL
        cache.put_with_ttl("key1".to_string(), "value1".to_string(), 1).await.unwrap();
        cache.put_with_ttl("key2".to_string(), "value2".to_string(), 1).await.unwrap();

        assert_eq!(cache.len(), 2);

        // Wait for expiration
        sleep(Duration::from_secs(2)).await;

        // Manual cleanup
        let removed_count = cache.cleanup_expired().await.unwrap();
        assert_eq!(removed_count, 2);
        assert_eq!(cache.len(), 0);
    }

    #[tokio::test]
    async fn test_different_cache_types() {
        // String cache
        let config = CacheConfig::new_test();
        let string_cache: StringCache = CacheService::new(config.clone()).await.unwrap();
        string_cache.put("str_key".to_string(), "string_value".to_string()).await.unwrap();

        // Bytes cache
        let bytes_cache: BytesCache = CacheService::new(config.clone()).await.unwrap();
        bytes_cache.put("bytes_key".to_string(), vec![1, 2, 3, 4]).await.unwrap();

        // JSON cache
        let json_cache: JsonCache = CacheService::new(config).await.unwrap();
        let json_value = serde_json::json!({"test": "value", "number": 42});
        json_cache.put("json_key".to_string(), json_value.clone()).await.unwrap();

        // Verify all work correctly
        assert_eq!(string_cache.get(&"str_key".to_string()).await.unwrap(), "string_value");
        assert_eq!(bytes_cache.get(&"bytes_key".to_string()).await.unwrap(), vec![1, 2, 3, 4]);
        assert_eq!(json_cache.get(&"json_key".to_string()).await.unwrap(), json_value);
    }
}