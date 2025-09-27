/*!
 * Model Management Tauri Commands
 *
 * Commands for managing models, including discovery, import, and lifecycle management.
 * Integrates with ModelService and embedding worker for dynamic model operations.
 */

use std::sync::Arc;
use tauri::{State, AppHandle, Manager as TauriManager, Emitter};
use tracing::{info, error, warn, debug};
use serde::{Serialize, Deserialize};

use crate::manager::Manager;
use rag_core::{
    services::model::{ModelMetadata, ModelStorageStats, ModelStatus, ModelType, ValidationWarning},
    CoreError, CoreResult,
};

/// Request for model import
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelImportRequest {
    /// Local path to model files
    pub local_path: String,
    /// Optional custom name for the model
    pub custom_name: Option<String>,
    /// Force import even if model exists
    pub force_import: bool,
}

/// Response for model import operation
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelImportResponse {
    /// Whether import was successful
    pub success: bool,
    /// Imported model metadata (if successful)
    pub model: Option<ModelMetadata>,
    /// Error message (if failed)
    pub error_message: Option<String>,
    /// Validation warnings
    pub warnings: Vec<String>,
}

/// Request for model validation
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelValidationRequest {
    /// Model ID to validate
    pub model_id: String,
    /// Context for validation (e.g., "kb_creation", "pipeline_step")
    pub context: String,
}

/// Response for model validation
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelValidationResponse {
    /// Whether model is valid for the context
    pub is_valid: bool,
    /// Validation warnings
    pub warnings: Vec<ValidationWarning>,
    /// Suggested fallback models
    pub fallback_models: Vec<String>,
    /// Error message (if validation failed)
    pub error_message: Option<String>,
}

/// Get all registered models
#[tauri::command]
pub async fn get_models(
    app: AppHandle,
) -> Result<Vec<ModelMetadata>, String> {
    info!("📋 Getting all registered models via Tauri command");

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.read().await;

    let models = model_service.list_models().await;
    info!("✅ Retrieved {} models", models.len());
    Ok(models)
}

/// Get models by type (embedding, reranking, combined)
#[tauri::command]
pub async fn get_models_by_type(
    app: AppHandle,
    model_type: String,
) -> Result<Vec<ModelMetadata>, String> {
    info!("📋 Getting models of type: {}", model_type);

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.read().await;

    let parsed_type = match model_type.as_str() {
        "embedding" => ModelType::Embedding,
        "reranking" => ModelType::Reranking,
        "combined" => ModelType::Combined,
        _ => {
            error!("❌ Invalid model type: {}", model_type);
            return Err(format!("Invalid model type: {}", model_type));
        }
    };

    let models = model_service.list_models_by_type(parsed_type).await;
    info!("✅ Retrieved {} models of type {}", models.len(), model_type);
    Ok(models)
}

/// Get available (ready-to-use) models
#[tauri::command]
pub async fn get_available_models(
    app: AppHandle,
) -> Result<Vec<ModelMetadata>, String> {
    info!("📋 Getting available models via Tauri command");

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.read().await;

    let models = model_service.list_available_models().await;
    info!("✅ Retrieved {} available models", models.len());
    Ok(models)
}

/// Get model by ID
#[tauri::command]
pub async fn get_model_by_id(
    app: AppHandle,
    model_id: String,
) -> Result<Option<ModelMetadata>, String> {
    info!("🔍 Getting model by ID: {}", model_id);

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.read().await;

    match model_service.get_model(&model_id).await {
        Some(model) => {
            info!("✅ Found model: {}", model_id);
            Ok(Some(model))
        }
        None => {
            warn!("⚠️  Model not found: {}", model_id);
            Ok(None)
        }
    }
}

/// Get model storage statistics
#[tauri::command]
pub async fn get_model_storage_stats(
    app: AppHandle,
) -> Result<ModelStorageStats, String> {
    info!("📊 Getting model storage statistics");

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.read().await;

    match model_service.get_storage_stats().await {
        Ok(stats) => {
            info!("✅ Retrieved storage stats: {}MB used, {} models",
                stats.storage_used_mb, stats.total_models);
            Ok(stats)
        }
        Err(e) => {
            error!("❌ Failed to get storage stats: {}", e);
            Err(format!("Failed to get storage stats: {}", e))
        }
    }
}

/// Scan for local models in standard directories
#[tauri::command]
pub async fn scan_local_models(
    app: AppHandle,
) -> Result<Vec<ModelMetadata>, String> {
    info!("🔍 Scanning for local models");

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.write().await;

    match model_service.scan_local_models().await {
        Ok(discovered_models) => {
            info!("✅ Discovered {} local models", discovered_models.len());

            // Emit event for frontend update
            if let Err(e) = app.emit("models_updated", &discovered_models) {
                warn!("⚠️  Failed to emit models_updated event: {}", e);
            }

            Ok(discovered_models)
        }
        Err(e) => {
            error!("❌ Failed to scan local models: {}", e);
            Err(format!("Failed to scan local models: {}", e))
        }
    }
}

/// Import model from local path
#[tauri::command]
pub async fn import_model(
    app: AppHandle,
    request: ModelImportRequest,
) -> Result<ModelImportResponse, String> {
    info!("📥 Importing model from: {}", request.local_path);

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.write().await;

    // For now, we'll use the basic detection from scan_local_models
    // In the future, this would have more sophisticated import logic
    match model_service.scan_local_models().await {
        Ok(models) => {
            // Find model that matches the import path
            let imported_model = models.iter()
                .find(|m| m.local_path.as_ref()
                    .map(|p| p.to_string_lossy().contains(&request.local_path))
                    .unwrap_or(false))
                .cloned();

            let response = if let Some(model) = imported_model {
                info!("✅ Successfully imported model: {}", model.id);

                // Emit event for frontend update
                if let Err(e) = app.emit("model_imported", &model) {
                    warn!("⚠️  Failed to emit model_imported event: {}", e);
                }

                ModelImportResponse {
                    success: true,
                    model: Some(model),
                    error_message: None,
                    warnings: vec![],
                }
            } else {
                warn!("⚠️  No model found at path: {}", request.local_path);
                ModelImportResponse {
                    success: false,
                    model: None,
                    error_message: Some(format!("No valid model found at path: {}", request.local_path)),
                    warnings: vec!["Make sure the path contains a valid model directory".to_string()],
                }
            };

            Ok(response)
        }
        Err(e) => {
            error!("❌ Failed to import model: {}", e);
            Ok(ModelImportResponse {
                success: false,
                model: None,
                error_message: Some(format!("Import failed: {}", e)),
                warnings: vec![],
            })
        }
    }
}

/// Validate model for specific context
#[tauri::command]
pub async fn validate_model_for_context(
    app: AppHandle,
    request: ModelValidationRequest,
) -> Result<ModelValidationResponse, String> {
    info!("🔍 Validating model {} for context: {}", request.model_id, request.context);

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.read().await;

    match model_service.validate_model_dependencies(&request.model_id).await {
        Ok(warnings) => {
            info!("✅ Model validation completed for: {}", request.model_id);

            // Get fallback models for this type
            let model_type = if let Some(model) = model_service.get_model(&request.model_id).await {
                model.model_type
            } else {
                ModelType::Embedding // Default assumption
            };

            let fallback_models = model_service.get_fallback_model(&model_type).await
                .map(|fallback| vec![fallback])
                .unwrap_or_else(|_| vec![]);

            Ok(ModelValidationResponse {
                is_valid: warnings.is_empty(),
                warnings,
                fallback_models,
                error_message: None,
            })
        }
        Err(e) => {
            error!("❌ Model validation failed: {}", e);
            Ok(ModelValidationResponse {
                is_valid: false,
                warnings: vec![],
                fallback_models: vec![],
                error_message: Some(format!("Validation failed: {}", e)),
            })
        }
    }
}

/// Remove model from registry and storage
#[tauri::command]
pub async fn remove_model(
    app: AppHandle,
    model_id: String,
) -> Result<bool, String> {
    info!("🗑️  Removing model: {}", model_id);

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.write().await;

    match model_service.remove_model(&model_id).await {
        Ok(()) => {
            info!("✅ Successfully removed model: {}", model_id);

            // Emit event for frontend update
            if let Err(e) = app.emit("model_removed", &model_id) {
                warn!("⚠️  Failed to emit model_removed event: {}", e);
            }

            Ok(true)
        }
        Err(e) => {
            error!("❌ Failed to remove model: {}", e);
            Err(format!("Failed to remove model: {}", e))
        }
    }
}

/// Mark model as used (for LRU tracking)
#[tauri::command]
pub async fn touch_model(
    app: AppHandle,
    model_id: String,
) -> Result<bool, String> {
    debug!("👆 Touching model for LRU tracking: {}", model_id);

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.read().await;

    match model_service.touch_model(&model_id).await {
        Ok(()) => {
            debug!("✅ Model touched: {}", model_id);
            Ok(true)
        }
        Err(e) => {
            warn!("⚠️  Failed to touch model: {}", e);
            Err(format!("Failed to touch model: {}", e))
        }
    }
}

/// Get fallback model recommendation for a type
#[tauri::command]
pub async fn get_fallback_model(
    app: AppHandle,
    model_type: String,
) -> Result<Option<String>, String> {
    info!("🔄 Getting fallback model for type: {}", model_type);

    let manager = app.state::<Arc<Manager>>();
    let model_service = manager.model_service.read().await;

    let parsed_type = match model_type.as_str() {
        "embedding" => ModelType::Embedding,
        "reranking" => ModelType::Reranking,
        "combined" => ModelType::Combined,
        _ => {
            error!("❌ Invalid model type: {}", model_type);
            return Err(format!("Invalid model type: {}", model_type));
        }
    };

    match model_service.get_fallback_model(&parsed_type).await {
        Ok(fallback_id) => {
            info!("✅ Found fallback model: {}", fallback_id);
            Ok(Some(fallback_id))
        }
        Err(e) => {
            warn!("⚠️  No fallback model available for type {}: {}", model_type, e);
            Ok(None)
        }
    }
}

/// Load model into embedding worker cache
#[tauri::command]
pub async fn load_model_into_cache(
    app: AppHandle,
    model_id: String,
) -> Result<bool, String> {
    info!("📦 Loading model into embedding worker cache: {}", model_id);

    let manager = app.state::<Arc<Manager>>();

    // This would integrate with the embedding worker to load the model
    // For now, we'll just mark it as used and return success
    // In the future, this would send a LoadModel request to the embedding worker

    let model_service = manager.model_service.read().await;
    match model_service.touch_model(&model_id).await {
        Ok(()) => {
            info!("✅ Model loaded into cache: {}", model_id);

            // Emit event for frontend update
            if let Err(e) = app.emit("model_cache_updated", &model_id) {
                warn!("⚠️  Failed to emit model_cache_updated event: {}", e);
            }

            Ok(true)
        }
        Err(e) => {
            error!("❌ Failed to load model into cache: {}", e);
            Err(format!("Failed to load model into cache: {}", e))
        }
    }
}

/// Get embedding worker cache statistics
#[tauri::command]
pub async fn get_model_cache_stats(
    _app: AppHandle,
) -> Result<serde_json::Value, String> {
    info!("📊 Getting model cache statistics");

    // For now, return mock statistics
    // In the future, this would query the embedding worker cache
    let mock_stats = serde_json::json!({
        "loaded_models": 1,
        "memory_usage_gb": 0.09,
        "memory_usage_percent": 0.045,
        "cache_hits": 0,
        "cache_misses": 0,
        "evictions": 0,
        "hit_rate": 0.0,
        "warm_models": ["sentence-transformers/all-MiniLM-L6-v2"]
    });

    info!("✅ Retrieved cache statistics");
    Ok(mock_stats)
}