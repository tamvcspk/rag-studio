export type KnowledgeBaseStatus = 'indexed' | 'indexing' | 'failed' | 'pending';

export type ContentSourceType = 'local-folder' | 'web-documentation' | 'github-repository' | 'pdf-collection';

export type EmbeddingModel = 'all-MiniLM-L6-v2' | 'all-mpnet-base-v2' | 'e5-large-v2';

export interface KnowledgeBase {
  id: string;
  name: string;
  version: string;
  product: string;
  description?: string;
  status: KnowledgeBaseStatus;

  // Stats (updated to match Rust backend)
  document_count: number;
  chunk_count: number;
  index_size: number; // bytes
  health_score: number; // 0.0 to 1.0

  // Timestamps (ISO strings from Rust)
  created_at: string;
  updated_at: string;

  // Optional fields for backward compatibility
  contentSource?: ContentSourceType;
  sourceUrl?: string;
  embeddingModel?: EmbeddingModel;
  semverRange?: string;
  progressPercentage?: number;
  estimatedTimeRemaining?: string;
  manifest?: KnowledgeBaseManifest;
  fingerprint?: string;
  license?: string;

  // Legacy fields (computed from new fields for backward compatibility)
  size?: string; // computed from index_size
  chunks?: number; // alias for chunk_count
  vectors?: number; // alias for chunk_count
  bm25Terms?: number;
  documentsCount?: number; // alias for document_count
  createdAt?: Date; // computed from created_at
  updatedAt?: Date; // computed from updated_at
  lastIndexedAt?: Date;
}

export interface KnowledgeBaseManifest {
  version: string;
  description: string;
  author?: string;
  license?: string;
  dependencies?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface KnowledgeBaseStats {
  totalBases: number;
  totalSize: string;
  totalChunks: number;
  indexedCount: number;
  indexingCount: number;
  failedCount: number;
}

export interface IndexingProgress {
  kbId: string;
  percentage: number;
  currentStep: string;
  processedChunks: number;
  totalChunks: number;
  estimatedTimeRemaining: string;
  startedAt: Date;
}

export interface KnowledgeBaseCreateRequest {
  name: string;
  version: string;
  product: string;
  description?: string;
  contentSource: ContentSourceType;
  sourceUrl?: string;
  embeddingModel: EmbeddingModel;
  semverRange?: string;
}

export interface KnowledgeBaseUpdateRequest {
  name?: string;
  version?: string;
  description?: string;
  embeddingModel?: EmbeddingModel;
}

// View models for UI
export interface KnowledgeBaseCardData {
  kb: KnowledgeBase;
  canReindex: boolean;
  canExport: boolean;
  canDelete: boolean;
  showProgress: boolean;
}

export interface CreateKBFormData {
  name: string;
  product: string;
  version: string;
  description: string;
  contentSource: ContentSourceType;
  sourceUrl: string;
  embeddingModel: EmbeddingModel;
  chunkSize?: number; // Added for backend compatibility
}