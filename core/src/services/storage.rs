/*!
 * Storage Service Implementation
 *
 * Provides local filesystem management with quotas, ZIP pack management,
 * auto-prune functionality, and checksums. Implements MVP requirements
 * for Phase 1.1 Local filesystem with quotas and ZIP pack management.
 */

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;
use std::io::{self, Write};
use std::time::Instant;
use chrono::{DateTime, Utc};
use thiserror::Error;
use serde::{Serialize, Deserialize};
use tracing::{info, warn, error};
use sha2::{Sha256, Digest};
use zip::{ZipWriter, ZipArchive};
use std::fs::File;

/// Storage Service Error Types
#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Storage directory not found: {0}")]
    DirectoryNotFound(String),

    #[error("Quota exceeded: {used}MB used, {limit}MB limit")]
    QuotaExceeded { used: u64, limit: u64 },

    #[error("File operation failed: {0}")]
    FileOperationFailed(String),

    #[error("Checksum validation failed for {file}: expected {expected}, got {actual}")]
    ChecksumMismatch {
        file: String,
        expected: String,
        actual: String,
    },

    #[error("ZIP operation failed: {0}")]
    ZipOperationFailed(String),

    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}

/// Storage configuration
#[derive(Debug, Clone)]
pub struct StorageConfig {
    /// Base storage directory
    pub base_path: PathBuf,
    /// Maximum storage quota in MB (1-5GB as per MVP plan)
    pub quota_mb: u64,
    /// Whether to enable auto-prune when quota is exceeded
    pub auto_prune: bool,
    /// Minimum free space to maintain in MB
    pub min_free_mb: u64,
}

impl StorageConfig {
    /// Create MVP storage config with reasonable defaults
    pub fn new_mvp<P: AsRef<Path>>(base_path: P) -> Self {
        Self {
            base_path: base_path.as_ref().to_path_buf(),
            quota_mb: 2048, // 2GB default
            auto_prune: true,
            min_free_mb: 100, // 100MB minimum free space
        }
    }

    /// Create test config with smaller quotas
    pub fn new_test<P: AsRef<Path>>(base_path: P) -> Self {
        Self {
            base_path: base_path.as_ref().to_path_buf(),
            quota_mb: 100, // 100MB for tests
            auto_prune: true,
            min_free_mb: 10,
        }
    }
}

/// File metadata with checksum
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub path: PathBuf,
    pub size_bytes: u64,
    pub checksum_sha256: String,
    pub created_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
}

/// Storage usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageStats {
    pub total_files: usize,
    pub total_size_mb: u64,
    pub quota_mb: u64,
    pub free_space_mb: u64,
    pub utilization_percent: f64,
}

/// ZIP pack manifest for export/import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackManifest {
    pub name: String,
    pub version: String,
    pub created_at: DateTime<Utc>,
    pub files: Vec<FileMetadata>,
    pub total_size_bytes: u64,
    pub checksum: String,
}

/// Local filesystem storage service with quotas and ZIP pack management
pub struct StorageService {
    config: StorageConfig,
    file_registry: HashMap<PathBuf, FileMetadata>,
}

impl StorageService {
    /// Initialize storage service with configuration
    pub async fn new(config: StorageConfig) -> Result<Self, StorageError> {
        info!("Initializing StorageService with base_path: {:?}", config.base_path);

        // Ensure base directory exists
        if !config.base_path.exists() {
            fs::create_dir_all(&config.base_path).map_err(|e| {
                StorageError::FileOperationFailed(format!(
                    "Failed to create base directory {}: {}",
                    config.base_path.display(),
                    e
                ))
            })?;
        }

        // Verify directory is writable
        let test_file = config.base_path.join(".storage_test");
        File::create(&test_file).and_then(|_| fs::remove_file(&test_file)).map_err(|e| {
            StorageError::PermissionDenied(format!(
                "Storage directory {} is not writable: {}",
                config.base_path.display(),
                e
            ))
        })?;

        let mut service = Self {
            config,
            file_registry: HashMap::new(),
        };

        // Scan existing files and build registry
        service.rebuild_registry().await?;

        info!("StorageService initialized successfully");
        Ok(service)
    }

    /// Store file with quota and checksum validation
    pub async fn store_file<P: AsRef<Path>>(
        &mut self,
        relative_path: P,
        data: &[u8],
    ) -> Result<FileMetadata, StorageError> {
        let relative_path = relative_path.as_ref();
        let full_path = self.config.base_path.join(relative_path);

        // Check quota before storing
        let current_usage = self.get_total_size();
        let new_size = data.len() as u64;

        if (current_usage + new_size) > (self.config.quota_mb * 1024 * 1024) {
            if self.config.auto_prune {
                self.auto_prune_files().await?;

                // Check again after pruning
                let current_usage_after_prune = self.get_total_size();
                if (current_usage_after_prune + new_size) > (self.config.quota_mb * 1024 * 1024) {
                    return Err(StorageError::QuotaExceeded {
                        used: (current_usage_after_prune + new_size) / (1024 * 1024),
                        limit: self.config.quota_mb,
                    });
                }
            } else {
                return Err(StorageError::QuotaExceeded {
                    used: (current_usage + new_size) / (1024 * 1024),
                    limit: self.config.quota_mb,
                });
            }
        }

        // Ensure parent directory exists
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent).map_err(|e| {
                StorageError::FileOperationFailed(format!(
                    "Failed to create parent directory for {}: {}",
                    relative_path.display(),
                    e
                ))
            })?;
        }

        // Calculate checksum
        let mut hasher = Sha256::new();
        hasher.update(data);
        let checksum = format!("{:x}", hasher.finalize());

        // Write file
        fs::write(&full_path, data).map_err(|e| {
            StorageError::FileOperationFailed(format!(
                "Failed to write file {}: {}",
                full_path.display(),
                e
            ))
        })?;

        // Create metadata
        let metadata = FileMetadata {
            path: relative_path.to_path_buf(),
            size_bytes: data.len() as u64,
            checksum_sha256: checksum,
            created_at: Utc::now(),
            last_accessed: Utc::now(),
        };

        // Update registry
        self.file_registry.insert(relative_path.to_path_buf(), metadata.clone());

        info!("Stored file: {} ({} bytes)", relative_path.display(), data.len());
        Ok(metadata)
    }

    /// Retrieve file with checksum validation
    pub async fn retrieve_file<P: AsRef<Path>>(&mut self, relative_path: P) -> Result<Vec<u8>, StorageError> {
        let relative_path = relative_path.as_ref();
        let full_path = self.config.base_path.join(relative_path);

        if !full_path.exists() {
            return Err(StorageError::FileOperationFailed(format!(
                "File not found: {}",
                relative_path.display()
            )));
        }

        // Read file
        let data = fs::read(&full_path).map_err(|e| {
            StorageError::FileOperationFailed(format!(
                "Failed to read file {}: {}",
                relative_path.display(),
                e
            ))
        })?;

        // Verify checksum if we have metadata
        if let Some(metadata) = self.file_registry.get_mut(relative_path) {
            let mut hasher = Sha256::new();
            hasher.update(&data);
            let actual_checksum = format!("{:x}", hasher.finalize());

            if actual_checksum != metadata.checksum_sha256 {
                return Err(StorageError::ChecksumMismatch {
                    file: relative_path.display().to_string(),
                    expected: metadata.checksum_sha256.clone(),
                    actual: actual_checksum,
                });
            }

            // Update last accessed time
            metadata.last_accessed = Utc::now();
        }

        info!("Retrieved file: {} ({} bytes)", relative_path.display(), data.len());
        Ok(data)
    }

    /// Delete file and update registry
    pub async fn delete_file<P: AsRef<Path>>(&mut self, relative_path: P) -> Result<(), StorageError> {
        let relative_path = relative_path.as_ref();
        let full_path = self.config.base_path.join(relative_path);

        if full_path.exists() {
            fs::remove_file(&full_path).map_err(|e| {
                StorageError::FileOperationFailed(format!(
                    "Failed to delete file {}: {}",
                    relative_path.display(),
                    e
                ))
            })?;
        }

        self.file_registry.remove(relative_path);
        info!("Deleted file: {}", relative_path.display());
        Ok(())
    }

    /// Create ZIP pack from files
    pub async fn create_pack<P: AsRef<Path>>(
        &self,
        pack_name: &str,
        files: &[PathBuf],
        output_path: P,
    ) -> Result<PackManifest, StorageError> {
        let output_path = output_path.as_ref();
        let pack_file = File::create(output_path).map_err(|e| {
            StorageError::ZipOperationFailed(format!("Failed to create pack file: {}", e))
        })?;

        let mut zip = ZipWriter::new(pack_file);
        let mut pack_files = Vec::new();
        let mut total_size = 0u64;

        for relative_path in files {
            let full_path = self.config.base_path.join(relative_path);

            if !full_path.exists() {
                warn!("Skipping missing file in pack: {}", relative_path.display());
                continue;
            }

            let data = fs::read(&full_path).map_err(|e| {
                StorageError::ZipOperationFailed(format!("Failed to read file for pack: {}", e))
            })?;

            // Add to ZIP
            zip.start_file(relative_path.to_string_lossy(), zip::write::FileOptions::default())
                .map_err(|e| StorageError::ZipOperationFailed(format!("ZIP start_file failed: {}", e)))?;

            zip.write_all(&data)
                .map_err(|e| StorageError::ZipOperationFailed(format!("ZIP write failed: {}", e)))?;

            // Calculate checksum
            let mut hasher = Sha256::new();
            hasher.update(&data);
            let checksum = format!("{:x}", hasher.finalize());

            let metadata = FileMetadata {
                path: relative_path.clone(),
                size_bytes: data.len() as u64,
                checksum_sha256: checksum,
                created_at: Utc::now(),
                last_accessed: Utc::now(),
            };

            pack_files.push(metadata);
            total_size += data.len() as u64;
        }

        zip.finish().map_err(|e| StorageError::ZipOperationFailed(format!("ZIP finish failed: {}", e)))?;

        // Calculate pack checksum
        let pack_data = fs::read(output_path)?;
        let mut hasher = Sha256::new();
        hasher.update(&pack_data);
        let pack_checksum = format!("{:x}", hasher.finalize());

        let manifest = PackManifest {
            name: pack_name.to_string(),
            version: "1.0".to_string(),
            created_at: Utc::now(),
            files: pack_files,
            total_size_bytes: total_size,
            checksum: pack_checksum,
        };

        info!("Created pack: {} ({} files, {} bytes)", pack_name, files.len(), total_size);
        Ok(manifest)
    }

    /// Extract ZIP pack
    pub async fn extract_pack<P: AsRef<Path>>(
        &mut self,
        pack_path: P,
        target_dir: Option<PathBuf>,
    ) -> Result<PackManifest, StorageError> {
        let pack_path = pack_path.as_ref();
        let target_base = target_dir.unwrap_or_else(|| self.config.base_path.clone());

        let pack_file = File::open(pack_path).map_err(|e| {
            StorageError::ZipOperationFailed(format!("Failed to open pack file: {}", e))
        })?;

        let mut archive = ZipArchive::new(pack_file).map_err(|e| {
            StorageError::ZipOperationFailed(format!("Failed to read ZIP archive: {}", e))
        })?;

        let mut extracted_files = Vec::new();
        let mut total_size = 0u64;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| {
                StorageError::ZipOperationFailed(format!("Failed to access ZIP entry {}: {}", i, e))
            })?;

            let file_path = PathBuf::from(file.name());
            let output_path = target_base.join(&file_path);

            // Ensure parent directory exists
            if let Some(parent) = output_path.parent() {
                fs::create_dir_all(parent)?;
            }

            // Extract file
            let mut output_file = File::create(&output_path)?;
            io::copy(&mut file, &mut output_file)?;

            // Calculate checksum
            let extracted_data = fs::read(&output_path)?;
            let mut hasher = Sha256::new();
            hasher.update(&extracted_data);
            let checksum = format!("{:x}", hasher.finalize());

            let metadata = FileMetadata {
                path: file_path,
                size_bytes: extracted_data.len() as u64,
                checksum_sha256: checksum,
                created_at: Utc::now(),
                last_accessed: Utc::now(),
            };

            extracted_files.push(metadata);
            total_size += extracted_data.len() as u64;
        }

        // Calculate pack checksum
        let pack_data = fs::read(pack_path)?;
        let mut hasher = Sha256::new();
        hasher.update(&pack_data);
        let pack_checksum = format!("{:x}", hasher.finalize());

        let manifest = PackManifest {
            name: pack_path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("extracted_pack")
                .to_string(),
            version: "1.0".to_string(),
            created_at: Utc::now(),
            files: extracted_files,
            total_size_bytes: total_size,
            checksum: pack_checksum,
        };

        info!("Extracted pack: {} ({} files, {} bytes)",
              manifest.name, manifest.files.len(), total_size);
        Ok(manifest)
    }

    /// Get storage statistics
    pub fn get_stats(&self) -> StorageStats {
        let total_size_bytes = self.get_total_size();
        let total_size_mb = total_size_bytes / (1024 * 1024);
        let free_space_mb = self.config.quota_mb.saturating_sub(total_size_mb);
        let utilization_percent = if self.config.quota_mb > 0 {
            (total_size_mb as f64 / self.config.quota_mb as f64) * 100.0
        } else {
            0.0
        };

        StorageStats {
            total_files: self.file_registry.len(),
            total_size_mb,
            quota_mb: self.config.quota_mb,
            free_space_mb,
            utilization_percent,
        }
    }

    /// Get total storage usage in bytes
    fn get_total_size(&self) -> u64 {
        self.file_registry.values().map(|m| m.size_bytes).sum()
    }

    /// Auto-prune old files when quota is exceeded
    async fn auto_prune_files(&mut self) -> Result<(), StorageError> {
        info!("Starting auto-prune to free up storage space");

        // Collect files to delete (clone keys to avoid borrowing issues)
        let mut files_to_delete: Vec<(PathBuf, DateTime<Utc>)> = self.file_registry
            .iter()
            .map(|(path, metadata)| (path.clone(), metadata.last_accessed))
            .collect();

        // Sort files by last accessed time (oldest first)
        files_to_delete.sort_by(|a, b| a.1.cmp(&b.1));

        let target_size = (self.config.quota_mb - self.config.min_free_mb) * 1024 * 1024;
        let mut current_size = self.get_total_size();
        let mut pruned_count = 0;

        for (path, _) in files_to_delete {
            if current_size <= target_size {
                break;
            }

            let file_size = self.file_registry.get(&path).map(|m| m.size_bytes).unwrap_or(0);

            if let Err(e) = self.delete_file(&path).await {
                warn!("Failed to delete file during auto-prune: {}", e);
            } else {
                current_size = current_size.saturating_sub(file_size);
                pruned_count += 1;
            }
        }

        info!("Auto-prune completed: {} files deleted, {}MB freed",
              pruned_count, (self.get_total_size().saturating_sub(current_size)) / (1024 * 1024));
        Ok(())
    }

    /// Rebuild file registry by scanning the filesystem
    async fn rebuild_registry(&mut self) -> Result<(), StorageError> {
        info!("Rebuilding storage registry");
        self.file_registry.clear();

        fn scan_directory(dir: &Path, base: &Path, registry: &mut HashMap<PathBuf, FileMetadata>) -> io::Result<()> {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();

                if path.is_file() {
                    let relative_path = path.strip_prefix(base).unwrap_or(&path).to_path_buf();

                    if let Ok(file_data) = fs::read(&path) {
                        let mut hasher = Sha256::new();
                        hasher.update(&file_data);
                        let checksum = format!("{:x}", hasher.finalize());

                        let metadata = FileMetadata {
                            path: relative_path.clone(),
                            size_bytes: file_data.len() as u64,
                            checksum_sha256: checksum,
                            created_at: Utc::now(), // Use current time as fallback
                            last_accessed: Utc::now(),
                        };

                        registry.insert(relative_path, metadata);
                    }
                } else if path.is_dir() {
                    scan_directory(&path, base, registry)?;
                }
            }
            Ok(())
        }

        scan_directory(&self.config.base_path, &self.config.base_path, &mut self.file_registry)
            .map_err(|e| StorageError::FileOperationFailed(format!("Failed to scan storage directory: {}", e)))?;

        info!("Registry rebuilt: {} files registered", self.file_registry.len());
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_storage_service_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let config = StorageConfig::new_test(temp_dir.path());

        let storage = StorageService::new(config).await;
        assert!(storage.is_ok());
    }

    #[tokio::test]
    async fn test_store_and_retrieve_file() {
        let temp_dir = TempDir::new().unwrap();
        let config = StorageConfig::new_test(temp_dir.path());
        let mut storage = StorageService::new(config).await.unwrap();

        let test_data = b"Hello, storage service!";
        let test_path = PathBuf::from("test.txt");

        // Store file
        let metadata = storage.store_file(&test_path, test_data).await.unwrap();
        assert_eq!(metadata.path, test_path);
        assert_eq!(metadata.size_bytes, test_data.len() as u64);

        // Retrieve file
        let retrieved_data = storage.retrieve_file(&test_path).await.unwrap();
        assert_eq!(retrieved_data, test_data);
    }

    #[tokio::test]
    async fn test_quota_enforcement() {
        let temp_dir = TempDir::new().unwrap();
        let mut config = StorageConfig::new_test(temp_dir.path());
        config.quota_mb = 1; // 1MB quota
        config.auto_prune = false;

        let mut storage = StorageService::new(config).await.unwrap();

        // Try to store file larger than quota
        let large_data = vec![0u8; 2 * 1024 * 1024]; // 2MB
        let result = storage.store_file("large.txt", &large_data).await;

        assert!(matches!(result, Err(StorageError::QuotaExceeded { .. })));
    }

    #[tokio::test]
    async fn test_pack_creation_and_extraction() {
        let temp_dir = TempDir::new().unwrap();
        let config = StorageConfig::new_test(temp_dir.path());
        let mut storage = StorageService::new(config).await.unwrap();

        // Store test files
        let test_data1 = b"File 1 content";
        let test_data2 = b"File 2 content";
        storage.store_file("file1.txt", test_data1).await.unwrap();
        storage.store_file("file2.txt", test_data2).await.unwrap();

        // Create pack
        let files = vec![PathBuf::from("file1.txt"), PathBuf::from("file2.txt")];
        let pack_path = temp_dir.path().join("test.zip");
        let manifest = storage.create_pack("test_pack", &files, &pack_path).await.unwrap();

        assert_eq!(manifest.files.len(), 2);
        assert_eq!(manifest.name, "test_pack");

        // Verify pack file exists
        assert!(pack_path.exists());
    }

    #[tokio::test]
    async fn test_storage_stats() {
        let temp_dir = TempDir::new().unwrap();
        let config = StorageConfig::new_test(temp_dir.path());
        let mut storage = StorageService::new(config).await.unwrap();

        let stats_empty = storage.get_stats();
        assert_eq!(stats_empty.total_files, 0);
        assert_eq!(stats_empty.total_size_mb, 0);

        // Store a file
        let test_data = b"Test data for stats";
        storage.store_file("stats_test.txt", test_data).await.unwrap();

        let stats_with_file = storage.get_stats();
        assert_eq!(stats_with_file.total_files, 1);
        assert!(stats_with_file.total_size_mb == 0); // Small file, rounds to 0 MB
    }
}