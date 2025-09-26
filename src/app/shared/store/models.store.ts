/**
 * Models Store - NgRx Signals
 *
 * Reactive state management for model operations including model registry,
 * storage statistics, and real-time model status updates.
 *
 * Follows established NgRx Signal Store patterns from other stores.
 */

import { Injectable, computed, signal, inject } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/**
 * Model metadata interface matching backend ModelMetadata
 */
export interface EmbeddingModel {
  id: string;                           // Model identifier (e.g., "sentence-transformers/all-MiniLM-L6-v2")
  name: string;                         // Display name for UI
  description: string;                  // Model description
  model_type: 'embedding' | 'reranking' | 'combined';
  size_mb: number;                      // Model size in MB
  dimensions: number;                   // Vector dimensions (384, 768, 1024, etc.)
  max_sequence_length: number;          // Maximum token sequence length
  source: 'huggingface' | 'local' | 'bundled' | 'manual';
  status: 'available' | 'downloading' | 'error' | 'not_downloaded';
  local_path?: string;                  // Local filesystem path (if available)
  checksum?: string;                    // SHA-256 integrity verification hash
  performance_metrics: PerformanceMetrics;
  last_used?: string;                   // ISO timestamp for LRU cleanup
  compatibility: string[];              // Supported frameworks
  created_at: string;                   // ISO timestamp
  updated_at: string;                   // ISO timestamp
}

/**
 * Model performance metrics
 */
export interface PerformanceMetrics {
  load_time_ms?: number;                // Model loading latency
  throughput_vecs_per_sec?: number;     // Embedding generation speed
  accuracy_score?: number;              // Benchmark accuracy (0.0-1.0)
  memory_usage_mb?: number;             // Memory usage estimate
  benchmarked_at?: string;              // ISO timestamp of last benchmark
}

/**
 * Model storage statistics
 */
export interface ModelStorageStats {
  total_models: number;                 // Total models in registry
  available_models: number;             // Available models count
  storage_used_mb: number;              // Total storage used in MB
  storage_limit_mb: number;             // Storage limit in MB
  usage_percentage: number;             // Storage usage percentage (0.0-1.0)
  cached_models: number;                // Models cached in embedding worker
  worker_memory_mb: number;             // Worker memory usage in MB
}

/**
 * Model cache statistics from embedding worker
 */
export interface ModelCacheStats {
  loaded_models: number;                // Models currently loaded in cache
  memory_usage_gb: number;              // Total memory usage in GB
  memory_usage_percent: number;         // Memory usage percentage (0.0-1.0)
  cache_hits: number;                   // Cache hit count
  cache_misses: number;                 // Cache miss count
  evictions: number;                    // Models evicted count
  hit_rate: number;                     // Cache hit rate (0.0-1.0)
  warm_models: string[];                // Models currently warm (preloaded)
}

/**
 * Model import request
 */
export interface ModelImportRequest {
  local_path: string;                   // Path to model files
  custom_name?: string;                 // Optional custom name
  force_import: boolean;                // Force import even if exists
}

/**
 * Model import response
 */
export interface ModelImportResponse {
  success: boolean;                     // Import success status
  model?: EmbeddingModel;               // Imported model (if successful)
  error_message?: string;               // Error message (if failed)
  warnings: string[];                   // Validation warnings
}

/**
 * Model validation request
 */
export interface ModelValidationRequest {
  model_id: string;                     // Model ID to validate
  context: string;                      // Validation context
}

/**
 * Model validation response
 */
export interface ModelValidationResponse {
  is_valid: boolean;                    // Whether model is valid
  warnings: ValidationWarning[];        // Validation warnings
  fallback_models: string[];            // Suggested fallback models
  error_message?: string;               // Error message (if failed)
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  model_id: string;
  progress: number;
  eta_seconds?: number;
}

/**
 * Models store state interface
 */
export interface ModelsState {
  models: EmbeddingModel[];
  loading: boolean;
  error: string | null;
  storageStats: ModelStorageStats | null;
  cacheStats: ModelCacheStats | null;
  importProgress: Map<string, number>;
  validationCache: Map<string, ModelValidationResponse>;
}

/**
 * Initial state for models store
 */
const initialState: ModelsState = {
  models: [],
  loading: false,
  error: null,
  storageStats: null,
  cacheStats: null,
  importProgress: new Map(),
  validationCache: new Map(),
};

@Injectable({ providedIn: 'root' })
export class ModelsStore {
  // Core state signals
  private readonly _models = signal<EmbeddingModel[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _storageStats = signal<ModelStorageStats | null>(null);
  private readonly _cacheStats = signal<ModelCacheStats | null>(null);
  private readonly _importProgress = signal<Map<string, number>>(new Map());
  private readonly _validationCache = signal<Map<string, ModelValidationResponse>>(new Map());

  // Public readonly signals
  readonly models = this._models.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly storageStats = this._storageStats.asReadonly();
  readonly cacheStats = this._cacheStats.asReadonly();
  readonly importProgress = this._importProgress.asReadonly();

  // Computed signals
  readonly availableModels = computed(() =>
    this._models().filter(m => m.status === 'available')
  );

  readonly embeddingModels = computed(() =>
    this._models().filter(m => m.model_type === 'embedding')
  );

  readonly rerankingModels = computed(() =>
    this._models().filter(m => m.model_type === 'reranking')
  );

  readonly bundledModels = computed(() =>
    this._models().filter(m => m.source === 'bundled')
  );

  readonly localModels = computed(() =>
    this._models().filter(m => m.source === 'local')
  );

  readonly downloadingModels = computed(() =>
    this._models().filter(m => m.status === 'downloading')
  );

  readonly modelCount = computed(() => this._models().length);

  readonly availableModelCount = computed(() => this.availableModels().length);

  readonly storageUsagePercent = computed(() => {
    const stats = this._storageStats();
    return stats ? (stats.storage_used_mb / stats.storage_limit_mb) * 100 : 0;
  });

  readonly cacheUsagePercent = computed(() => {
    const stats = this._cacheStats();
    return stats ? stats.memory_usage_percent * 100 : 0;
  });

  readonly recommendedModels = computed(() =>
    this._models().filter(m =>
      m.source === 'bundled' ||
      (m.performance_metrics.accuracy_score && m.performance_metrics.accuracy_score > 0.8)
    )
  );

  constructor() {
    this.initializeEventListeners();
    this.loadInitialData();
  }

  /**
   * Initialize Tauri event listeners for real-time updates
   */
  private async initializeEventListeners(): Promise<void> {
    try {
      // Listen for model updates
      await listen('models_updated', (event: any) => {
        console.log('🔄 Models updated event received:', event.payload);
        this.handleModelsUpdated(event.payload);
      });

      // Listen for model imports
      await listen('model_imported', (event: any) => {
        console.log('📥 Model imported event received:', event.payload);
        this.handleModelImported(event.payload);
      });

      // Listen for model removals
      await listen('model_removed', (event: any) => {
        console.log('🗑️ Model removed event received:', event.payload);
        this.handleModelRemoved(event.payload);
      });

      // Listen for cache updates
      await listen('model_cache_updated', (event: any) => {
        console.log('📦 Model cache updated event received:', event.payload);
        this.refreshCacheStats();
      });

      console.log('✅ ModelsStore event listeners initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ModelsStore event listeners:', error);
      this.setError(`Failed to initialize event listeners: ${error}`);
    }
  }

  /**
   * Load initial data (models, stats, cache info)
   */
  private async loadInitialData(): Promise<void> {
    try {
      await Promise.all([
        this.loadModels(),
        this.loadStorageStats(),
        this.loadCacheStats(),
      ]);
    } catch (error) {
      console.error('❌ Failed to load initial models data:', error);
      this.setError(`Failed to load initial data: ${error}`);
    }
  }

  /**
   * Load all models from backend
   */
  async loadModels(): Promise<void> {
    try {
      this.setLoading(true);
      this.clearError();

      const models: EmbeddingModel[] = await invoke('get_models');
      this._models.set(models);

      console.log(`✅ Loaded ${models.length} models`);
    } catch (error) {
      console.error('❌ Failed to load models:', error);
      this.setError(`Failed to load models: ${error}`);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load models by type
   */
  async loadModelsByType(modelType: 'embedding' | 'reranking' | 'combined'): Promise<EmbeddingModel[]> {
    try {
      this.setLoading(true);
      this.clearError();

      const models: EmbeddingModel[] = await invoke('get_models_by_type', { modelType });
      console.log(`✅ Loaded ${models.length} models of type ${modelType}`);
      return models;
    } catch (error) {
      console.error(`❌ Failed to load models by type ${modelType}:`, error);
      this.setError(`Failed to load models by type: ${error}`);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load only available models
   */
  async loadAvailableModels(): Promise<EmbeddingModel[]> {
    try {
      this.setLoading(true);
      this.clearError();

      const models: EmbeddingModel[] = await invoke('get_available_models');
      console.log(`✅ Loaded ${models.length} available models`);
      return models;
    } catch (error) {
      console.error('❌ Failed to load available models:', error);
      this.setError(`Failed to load available models: ${error}`);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Get model by ID
   */
  async getModelById(modelId: string): Promise<EmbeddingModel | null> {
    try {
      const model: EmbeddingModel | null = await invoke('get_model_by_id', { modelId });
      return model;
    } catch (error) {
      console.error(`❌ Failed to get model ${modelId}:`, error);
      this.setError(`Failed to get model: ${error}`);
      throw error;
    }
  }

  /**
   * Load storage statistics
   */
  async loadStorageStats(): Promise<void> {
    try {
      const stats: ModelStorageStats = await invoke('get_model_storage_stats');
      this._storageStats.set(stats);
      console.log('✅ Loaded model storage statistics');
    } catch (error) {
      console.error('❌ Failed to load storage stats:', error);
      this.setError(`Failed to load storage stats: ${error}`);
      throw error;
    }
  }

  /**
   * Load cache statistics from embedding worker
   */
  async loadCacheStats(): Promise<void> {
    try {
      const stats: ModelCacheStats = await invoke('get_model_cache_stats');
      this._cacheStats.set(stats);
      console.log('✅ Loaded model cache statistics');
    } catch (error) {
      console.error('❌ Failed to load cache stats:', error);
      this.setError(`Failed to load cache stats: ${error}`);
      throw error;
    }
  }

  /**
   * Scan for local models
   */
  async scanLocalModels(): Promise<EmbeddingModel[]> {
    try {
      this.setLoading(true);
      this.clearError();

      const discoveredModels: EmbeddingModel[] = await invoke('scan_local_models');

      // Update our models list with newly discovered models
      await this.loadModels();

      console.log(`✅ Discovered ${discoveredModels.length} local models`);
      return discoveredModels;
    } catch (error) {
      console.error('❌ Failed to scan local models:', error);
      this.setError(`Failed to scan local models: ${error}`);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Import model from local path
   */
  async importModel(request: ModelImportRequest): Promise<ModelImportResponse> {
    try {
      this.setLoading(true);
      this.clearError();

      const response: ModelImportResponse = await invoke('import_model', { request });

      if (response.success && response.model) {
        // Add to local models list
        this._models.update(models => [...models, response.model!]);
        console.log(`✅ Successfully imported model: ${response.model.id}`);
      }

      return response;
    } catch (error) {
      console.error('❌ Failed to import model:', error);
      this.setError(`Failed to import model: ${error}`);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Validate model for specific context
   */
  async validateModelForContext(modelId: string, context: string): Promise<ModelValidationResponse> {
    try {
      const request: ModelValidationRequest = { model_id: modelId, context };
      const response: ModelValidationResponse = await invoke('validate_model_for_context', { request });

      // Cache validation result
      this._validationCache.update(cache => {
        const newCache = new Map(cache);
        newCache.set(`${modelId}:${context}`, response);
        return newCache;
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to validate model ${modelId} for context ${context}:`, error);
      this.setError(`Failed to validate model: ${error}`);
      throw error;
    }
  }

  /**
   * Remove model from registry and storage
   */
  async removeModel(modelId: string): Promise<boolean> {
    try {
      this.setLoading(true);
      this.clearError();

      const success: boolean = await invoke('remove_model', { modelId });

      if (success) {
        // Remove from local models list
        this._models.update(models => models.filter(m => m.id !== modelId));
        console.log(`✅ Successfully removed model: ${modelId}`);
      }

      return success;
    } catch (error) {
      console.error(`❌ Failed to remove model ${modelId}:`, error);
      this.setError(`Failed to remove model: ${error}`);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Mark model as used (for LRU tracking)
   */
  async touchModel(modelId: string): Promise<void> {
    try {
      await invoke('touch_model', { modelId });

      // Update local model's last_used timestamp
      this._models.update(models =>
        models.map(m => m.id === modelId
          ? { ...m, last_used: new Date().toISOString() }
          : m
        )
      );
    } catch (error) {
      console.error(`❌ Failed to touch model ${modelId}:`, error);
      // Don't throw error for touch operations as they're not critical
    }
  }

  /**
   * Get fallback model recommendation
   */
  async getFallbackModel(modelType: 'embedding' | 'reranking' | 'combined'): Promise<string | null> {
    try {
      const fallbackId: string | null = await invoke('get_fallback_model', { modelType });
      return fallbackId;
    } catch (error) {
      console.error(`❌ Failed to get fallback model for type ${modelType}:`, error);
      this.setError(`Failed to get fallback model: ${error}`);
      throw error;
    }
  }

  /**
   * Load model into embedding worker cache
   */
  async loadModelIntoCache(modelId: string): Promise<boolean> {
    try {
      const success: boolean = await invoke('load_model_into_cache', { modelId });

      if (success) {
        await this.refreshCacheStats();
        console.log(`✅ Loaded model into cache: ${modelId}`);
      }

      return success;
    } catch (error) {
      console.error(`❌ Failed to load model ${modelId} into cache:`, error);
      this.setError(`Failed to load model into cache: ${error}`);
      throw error;
    }
  }

  /**
   * Refresh cache statistics
   */
  async refreshCacheStats(): Promise<void> {
    try {
      await this.loadCacheStats();
    } catch (error) {
      console.error('❌ Failed to refresh cache stats:', error);
    }
  }

  /**
   * Refresh all data
   */
  async refresh(): Promise<void> {
    try {
      await this.loadInitialData();
      console.log('✅ ModelsStore data refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh ModelsStore data:', error);
    }
  }

  // Event handlers
  private handleModelsUpdated(models: EmbeddingModel[]): void {
    this._models.set(models);
    console.log(`🔄 Models updated: ${models.length} models`);
  }

  private handleModelImported(model: EmbeddingModel): void {
    this._models.update(models => {
      const existing = models.find(m => m.id === model.id);
      if (existing) {
        return models.map(m => m.id === model.id ? model : m);
      } else {
        return [...models, model];
      }
    });
    console.log(`📥 Model imported: ${model.id}`);
  }

  private handleModelRemoved(modelId: string): void {
    this._models.update(models => models.filter(m => m.id !== modelId));
    console.log(`🗑️ Model removed: ${modelId}`);
  }

  // Utility methods
  private setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  private setError(error: string | null): void {
    this._error.set(error);
  }

  private clearError(): void {
    this._error.set(null);
  }
}