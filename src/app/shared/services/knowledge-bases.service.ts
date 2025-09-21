/*!
 * Knowledge Bases Service - Real Tauri Integration
 *
 * Replaces MockKnowledgeBasesService with real Tauri commands and real-time state sync.
 * Follows Phase 3.1 specifications for KB Management UI.
 */

import { Injectable, signal, computed } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { Observable, from, BehaviorSubject, map, catchError, of } from 'rxjs';
import {
  KnowledgeBase,
  CreateKBFormData,
  KnowledgeBaseStatus
} from '../types';
import { transformKnowledgeBase } from '../utils/knowledge-base.utils';

export interface CreateKBRequest {
  name: string;
  product: string;
  version: string;
  description?: string;
  content_source: string;
  source_url?: string;
  embedding_model: string;
  chunk_size?: number;
}

export interface SearchRequest {
  collection: string;
  query: string;
  top_k?: number;
  filters?: Record<string, any>;
}

export interface SearchResult {
  chunk_id: string;
  score: number;
  snippet: string;
  title: string;
  document_id: string;
  citation: CitationInfo;
  metadata: any;
}

export interface CitationInfo {
  title: string;
  url?: string;
  license?: string;
  version?: string;
  anchor?: string;
}

export interface AppState {
  knowledge_bases: KnowledgeBase[];
  runs: IngestRun[];
  metrics: AppMetrics;
  is_loading: boolean;
  last_error?: string;
}

export interface IngestRun {
  id: string;
  kb_id: string;
  status: string;
  progress: number;
  documents_processed: number;
  total_documents: number;
  started_at: string;
  updated_at: string;
}

export interface AppMetrics {
  total_kbs: number;
  indexed_kbs: number;
  indexing_kbs: number;
  failed_kbs: number;
  total_documents: number;
  total_chunks: number;
  avg_query_latency_ms: number;
  cache_hit_rate: number;
}

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBasesService {
  // Signal-based state management for real-time updates
  private readonly _knowledgeBases = signal<KnowledgeBase[]>([]);
  private readonly _metrics = signal<AppMetrics>({
    total_kbs: 0,
    indexed_kbs: 0,
    indexing_kbs: 0,
    failed_kbs: 0,
    total_documents: 0,
    total_chunks: 0,
    avg_query_latency_ms: 0,
    cache_hit_rate: 0
  });
  private readonly _runs = signal<IngestRun[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _lastError = signal<string | null>(null);

  // Public readonly signals
  readonly knowledgeBases = this._knowledgeBases.asReadonly();
  readonly metrics = this._metrics.asReadonly();
  readonly runs = this._runs.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly lastError = this._lastError.asReadonly();

  // Computed derived state
  readonly totalCount = computed(() => this._knowledgeBases().length);
  readonly indexedCount = computed(() =>
    this._knowledgeBases().filter(kb => kb.status === 'indexed').length
  );
  readonly indexingCount = computed(() =>
    this._knowledgeBases().filter(kb => kb.status === 'indexing').length
  );
  readonly failedCount = computed(() =>
    this._knowledgeBases().filter(kb => kb.status === 'failed').length
  );

  private unlisten?: UnlistenFn;

  constructor() {
    this.setupEventListeners();
    this.loadInitialState();
  }

  /**
   * Setup real-time event listeners for state sync
   */
  private async setupEventListeners(): Promise<void> {
    try {
      this.unlisten = await listen<any>('state_delta', (event) => {
        const { type, payload } = event.payload;
        console.log('State delta received:', type, payload);

        switch (type) {
          case 'kb_created':
            this.handleKBCreated(payload.kb);
            break;
          case 'kb_deleted':
            this.handleKBDeleted(payload.kb_id);
            break;
          case 'kb_status_updated':
            this.handleKBStatusUpdated(payload.kb_id, payload.status);
            break;
          case 'kb_indexing_progress':
            this.handleIndexingProgress(payload);
            break;
          case 'kb_indexing_completed':
            this.handleIndexingCompleted(payload.kb_id);
            break;
          case 'search_completed':
            this.handleSearchCompleted(payload);
            break;
          default:
            console.log('Unknown state delta type:', type);
        }
      });

      console.log('✅ Real-time event listeners setup completed');
    } catch (error) {
      console.error('❌ Failed to setup event listeners:', error);
    }
  }

  /**
   * Load initial application state from Rust backend
   */
  private async loadInitialState(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._lastError.set(null);

      const appState = await invoke<AppState>('get_app_state');

      // Transform and update signals with initial state
      const transformedKBs = appState.knowledge_bases.map(kb => transformKnowledgeBase(kb));
      this._knowledgeBases.set(transformedKBs);
      this._metrics.set(appState.metrics);
      this._runs.set(appState.runs);

      console.log('✅ Initial state loaded:', {
        kbs: appState.knowledge_bases.length,
        metrics: appState.metrics
      });
    } catch (error) {
      console.error('❌ Failed to load initial state:', error);
      this._lastError.set(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get all knowledge bases (returns Observable for backward compatibility)
   */
  getKnowledgeBases(): Observable<KnowledgeBase[]> {
    return from(invoke<KnowledgeBase[]>('get_knowledge_bases')).pipe(
      map(kbs => {
        const transformedKBs = kbs.map(kb => transformKnowledgeBase(kb));
        this._knowledgeBases.set(transformedKBs);
        return transformedKBs;
      }),
      catchError(error => {
        console.error('Failed to get knowledge bases:', error);
        this._lastError.set(error.message);
        return of([]);
      })
    );
  }

  /**
   * Create a new knowledge base
   */
  createKnowledgeBase(formData: CreateKBFormData): Observable<KnowledgeBase> {
    const request: CreateKBRequest = {
      name: formData.name,
      product: formData.product,
      version: formData.version,
      description: formData.description,
      content_source: formData.contentSource,
      source_url: formData.sourceUrl,
      embedding_model: formData.embeddingModel,
      chunk_size: formData.chunkSize
    };

    return from(invoke<KnowledgeBase>('create_knowledge_base', { request })).pipe(
      map(newKB => {
        // State will be updated via real-time events
        console.log('KB creation initiated:', newKB.id);
        return newKB;
      }),
      catchError(error => {
        console.error('Failed to create knowledge base:', error);
        this._lastError.set(error.message);
        throw error;
      })
    );
  }

  /**
   * Search in knowledge base using hybrid search
   */
  searchKnowledgeBase(collection: string, query: string, topK?: number, filters?: Record<string, any>): Observable<SearchResult[]> {
    const request: SearchRequest = {
      collection,
      query,
      top_k: topK,
      filters
    };

    return from(invoke<SearchResult[]>('search_knowledge_base', { request })).pipe(
      catchError(error => {
        console.error('Search failed:', error);
        this._lastError.set(error.message);
        return of([]);
      })
    );
  }

  /**
   * Delete a knowledge base
   */
  deleteKnowledgeBase(kbId: string): Observable<void> {
    return from(invoke<void>('delete_knowledge_base', { kbId })).pipe(
      map(() => {
        // State will be updated via real-time events
        console.log('KB deletion initiated:', kbId);
      }),
      catchError(error => {
        console.error('Failed to delete knowledge base:', error);
        this._lastError.set(error.message);
        throw error;
      })
    );
  }

  /**
   * Export knowledge base
   */
  exportKnowledgeBase(kbId: string): Observable<Blob> {
    return from(invoke<number[]>('export_knowledge_base', { kbId })).pipe(
      map(bytes => new Blob([new Uint8Array(bytes)], { type: 'application/zip' })),
      catchError(error => {
        console.error('Failed to export knowledge base:', error);
        this._lastError.set(error.message);
        throw error;
      })
    );
  }

  /**
   * Start reindexing a knowledge base
   */
  reindexKnowledgeBase(kbId: string): Observable<void> {
    return from(invoke<void>('reindex_knowledge_base', { kbId })).pipe(
      map(() => {
        // State will be updated via real-time events
        console.log('KB reindexing initiated:', kbId);
      }),
      catchError(error => {
        console.error('Failed to start reindexing:', error);
        this._lastError.set(error.message);
        throw error;
      })
    );
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): Observable<any> {
    return from(invoke<any>('get_health_status')).pipe(
      catchError(error => {
        console.error('Failed to get health status:', error);
        return of({ overall: 'failed', error: error.message });
      })
    );
  }

  // Event handlers for real-time updates

  private handleKBCreated(kb: KnowledgeBase): void {
    const transformedKB = transformKnowledgeBase(kb);
    this._knowledgeBases.update(kbs => [...kbs, transformedKB]);
    this.updateMetrics();
  }

  private handleKBDeleted(kbId: string): void {
    this._knowledgeBases.update(kbs => kbs.filter(kb => kb.id !== kbId));
    this.updateMetrics();
  }

  private handleKBStatusUpdated(kbId: string, status: KnowledgeBaseStatus): void {
    this._knowledgeBases.update(kbs =>
      kbs.map(kb =>
        kb.id === kbId
          ? { ...kb, status, updated_at: new Date().toISOString() }
          : kb
      )
    );
    this.updateMetrics();
  }

  private handleIndexingProgress(payload: any): void {
    const { kb_id, step, progress } = payload;

    // Update or create run entry
    this._runs.update(runs => {
      const existingRun = runs.find(run => run.kb_id === kb_id);
      if (existingRun) {
        return runs.map(run =>
          run.kb_id === kb_id
            ? { ...run, progress: progress * 100, updated_at: new Date().toISOString() }
            : run
        );
      } else {
        const newRun: IngestRun = {
          id: `run_${kb_id}_${Date.now()}`,
          kb_id,
          status: step,
          progress: progress * 100,
          documents_processed: Math.floor(progress * 25), // Simulated
          total_documents: 25, // Simulated
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        return [...runs, newRun];
      }
    });
  }

  private handleIndexingCompleted(kbId: string): void {
    // Remove completed run
    this._runs.update(runs => runs.filter(run => run.kb_id !== kbId));

    // Refresh KB state will be handled by status update event
  }

  private handleSearchCompleted(payload: any): void {
    const { latency_ms } = payload;

    // Update metrics with new latency
    this._metrics.update(metrics => ({
      ...metrics,
      avg_query_latency_ms: (metrics.avg_query_latency_ms + latency_ms) / 2
    }));
  }

  private updateMetrics(): void {
    const kbs = this._knowledgeBases();

    this._metrics.update(metrics => ({
      ...metrics,
      total_kbs: kbs.length,
      indexed_kbs: kbs.filter(kb => kb.status === 'indexed').length,
      indexing_kbs: kbs.filter(kb => kb.status === 'indexing').length,
      failed_kbs: kbs.filter(kb => kb.status === 'failed').length,
      total_documents: kbs.reduce((sum, kb) => sum + (kb.document_count || 0), 0),
      total_chunks: kbs.reduce((sum, kb) => sum + (kb.chunk_count || 0), 0)
    }));
  }

  /**
   * Cleanup resources
   */
  ngOnDestroy(): void {
    if (this.unlisten) {
      this.unlisten();
    }
  }
}