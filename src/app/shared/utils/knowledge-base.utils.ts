/*!
 * Knowledge Base Utilities
 *
 * Utility functions for backward compatibility and data transformation.
 */

import { KnowledgeBase } from '../types';

/**
 * Transform KB data to ensure backward compatibility
 */
export function transformKnowledgeBase(kb: Partial<KnowledgeBase>): KnowledgeBase {
  return {
    ...kb,
    // Ensure required fields exist
    id: kb.id || '',
    name: kb.name || '',
    version: kb.version || '',
    product: kb.product || '',
    status: kb.status || 'pending',
    document_count: kb.document_count || 0,
    chunk_count: kb.chunk_count || 0,
    index_size: kb.index_size || 0,
    health_score: kb.health_score || 0,
    created_at: kb.created_at || new Date().toISOString(),
    updated_at: kb.updated_at || new Date().toISOString(),

    // Computed legacy fields for backward compatibility
    chunks: kb.chunks || kb.chunk_count || 0,
    vectors: kb.vectors || kb.chunk_count || 0,
    documentsCount: kb.documentsCount || kb.document_count || 0,
    size: kb.size || formatBytes(kb.index_size || 0),
    bm25Terms: kb.bm25Terms || (kb.chunk_count || 0) * 10, // Estimated
    createdAt: kb.createdAt || (kb.created_at ? new Date(kb.created_at) : new Date()),
    updatedAt: kb.updatedAt || (kb.updated_at ? new Date(kb.updated_at) : new Date()),
  } as KnowledgeBase;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Safe number formatting for template usage
 */
export function safeFormatNumber(value: number | undefined): number {
  return value || 0;
}

/**
 * Get computed progress chunks (for indexing progress display)
 */
export function getProgressChunks(kb: KnowledgeBase): number {
  if (!kb.progressPercentage || !kb.chunks) {
    return 0;
  }
  return Math.round((kb.chunks || 0) / (kb.progressPercentage / 100));
}

/**
 * Check if KB has required fields for display
 */
export function isValidKB(kb: Partial<KnowledgeBase>): kb is KnowledgeBase {
  return !!(kb.id && kb.name && kb.version && kb.product && kb.status);
}