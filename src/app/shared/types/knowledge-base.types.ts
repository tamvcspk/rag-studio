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
  
  // Content metadata
  contentSource: ContentSourceType;
  sourceUrl?: string;
  
  // Stats
  size: string; // e.g., "45.2 MB"
  chunks: number;
  vectors: number;
  bm25Terms: number;
  documentsCount?: number;
  
  // Configuration
  embeddingModel: EmbeddingModel;
  semverRange: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastIndexedAt?: Date;
  
  // Progress (for indexing)
  progressPercentage?: number;
  estimatedTimeRemaining?: string;
  
  // Manifest
  manifest?: KnowledgeBaseManifest;
  fingerprint?: string;
  license?: string;
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
}