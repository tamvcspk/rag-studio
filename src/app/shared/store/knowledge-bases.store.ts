/*!
 * Knowledge Bases Signal Store - NgRx Signals Implementation
 *
 * Migrated from service-based signals to NgRx Signal Store for improved state management.
 * Provides centralized, reactive state management for Knowledge Base operations.
 */

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  KnowledgeBase,
  CreateKBFormData,
  KnowledgeBaseStatus
} from '../types';
import { transformKnowledgeBase } from '../utils/knowledge-base.utils';

// State interfaces
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

export interface MetricValue {
  value: number;
  timestamp: string;
  unit: string;
  tags: { [key: string]: string };
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

export interface AppStateData {
  knowledge_bases: { [key: string]: KnowledgeBase };
  pipeline_runs: { [key: string]: IngestRun };
  metrics: { [key: string]: MetricValue };
  is_loading: boolean;
  last_error?: string;
}

// Initial state
interface KnowledgeBasesState {
  knowledgeBases: KnowledgeBase[];
  runs: IngestRun[];
  metrics: AppMetrics;
  isLoading: boolean;
  lastError: string | null;
  isInitialized: boolean;
}

const initialState: KnowledgeBasesState = {
  knowledgeBases: [],
  runs: [],
  metrics: {
    total_kbs: 0,
    indexed_kbs: 0,
    indexing_kbs: 0,
    failed_kbs: 0,
    total_documents: 0,
    total_chunks: 0,
    avg_query_latency_ms: 0,
    cache_hit_rate: 0
  },
  isLoading: false,
  lastError: null,
  isInitialized: false
};

// Create the signal store
export const KnowledgeBasesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Statistics computed values
    totalCount: computed(() => store.knowledgeBases().length),
    indexedCount: computed(() =>
      store.knowledgeBases().filter(kb => kb.status === 'Active').length
    ),
    indexingCount: computed(() =>
      store.knowledgeBases().filter(kb => kb.status === 'Building').length
    ),
    failedCount: computed(() =>
      store.knowledgeBases().filter(kb => kb.status === 'Error').length
    ),

    // Metrics derived from actual data (overrides backend metrics for accuracy)
    computedMetrics: computed(() => {
      const kbs = store.knowledgeBases();
      return {
        ...store.metrics(),
        total_kbs: kbs.length,
        indexed_kbs: kbs.filter(kb => kb.status === 'Active').length,
        indexing_kbs: kbs.filter(kb => kb.status === 'Building').length,
        failed_kbs: kbs.filter(kb => kb.status === 'Error').length,
        total_documents: kbs.reduce((sum, kb) => sum + (kb.document_count || 0), 0),
        total_chunks: kbs.reduce((sum, kb) => sum + (kb.chunk_count || 0), 0)
      };
    }),

    // Filter helpers
    indexedKnowledgeBases: computed(() =>
      store.knowledgeBases().filter(kb => kb.status === 'Active')
    ),
    indexingKnowledgeBases: computed(() =>
      store.knowledgeBases().filter(kb => kb.status === 'Building')
    ),
    failedKnowledgeBases: computed(() =>
      store.knowledgeBases().filter(kb => kb.status === 'Error')
    ),

    // Helper for getting KB by ID
    getKnowledgeBaseById: computed(() => (id: string) =>
      store.knowledgeBases().find(kb => kb.id === id)
    ),

    // Check if any KB is currently indexing
    hasIndexingKBs: computed(() =>
      store.knowledgeBases().filter(kb => kb.status === 'Building').length > 0
    ),

    // Check if store is ready for operations
    isReady: computed(() => store.isInitialized() && !store.isLoading())
  })),
  withMethods((store) => {
    let unlisten: UnlistenFn | undefined;

    return {
      // Initialization methods
      async initialize() {
        if (store.isInitialized()) {
          console.log('KnowledgeBasesStore already initialized');
          return;
        }

        patchState(store, { isLoading: true, lastError: null });

        try {
          // Setup event listeners first
          await this.setupEventListeners();

          // Load initial state
          await this.loadInitialState();

          patchState(store, { isInitialized: true });
          console.log('✅ KnowledgeBasesStore initialized successfully');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize store';
          patchState(store, { lastError: errorMessage, isLoading: false });
          console.error('❌ Failed to initialize KnowledgeBasesStore:', error);
        }
      },

      async setupEventListeners() {
        try {
          unlisten = await listen<any>('state_delta', (event) => {
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
          throw error;
        }
      },

      async loadInitialState() {
        try {
          const appState = await invoke<AppStateData>('get_app_state');

          // Convert HashMap to array and transform
          const kbsArray = Object.values(appState.knowledge_bases);
          const transformedKBs = kbsArray.map(kb => transformKnowledgeBase(kb));

          // Convert pipeline_runs HashMap to array
          const runsArray = Object.values(appState.pipeline_runs || {});

          // Create proper metrics object from backend HashMap<String, MetricValue>
          const metrics: AppMetrics = {
            total_kbs: kbsArray.length,
            indexed_kbs: kbsArray.filter(kb => kb.status === 'Active').length,
            indexing_kbs: kbsArray.filter(kb => kb.status === 'Building').length,
            failed_kbs: kbsArray.filter(kb => kb.status === 'Error').length,
            total_documents: appState.metrics?.['total_documents']?.value || 0,
            total_chunks: appState.metrics?.['total_chunks']?.value || 0,
            avg_query_latency_ms: appState.metrics?.['avg_query_latency_ms']?.value || 0,
            cache_hit_rate: appState.metrics?.['cache_hit_rate']?.value || 0,
          };

          patchState(store, {
            knowledgeBases: transformedKBs,
            metrics,
            runs: runsArray,
            isLoading: false
          });

          console.log('✅ Initial state loaded:', {
            kbs: kbsArray.length,
            runs: runsArray.length,
            metrics: appState.metrics
          });
        } catch (error) {
          console.error('❌ Failed to load initial state:', error);
          throw error;
        }
      },

      // CRUD Operations
      async createKnowledgeBase(formData: CreateKBFormData) {
        const request: CreateKBRequest = {
          name: formData.name,
          product: formData.product,
          version: formData.version,
          description: formData.description,
          content_source: formData.contentSource,
          source_url: formData.sourceUrl,
          embedding_model: typeof formData.embeddingModel === 'string'
            ? formData.embeddingModel
            : formData.embeddingModel?.id || 'sentence-transformers/all-MiniLM-L6-v2',
          chunk_size: formData.chunkSize
        };

        try {
          const newKB = await invoke<KnowledgeBase>('create_knowledge_base', { request });
          console.log('KB creation initiated:', newKB.id);
          return newKB;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create knowledge base';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to create knowledge base:', error);
          throw error;
        }
      },

      async deleteKnowledgeBase(kbId: string) {
        try {
          await invoke<void>('delete_knowledge_base', { kbId });
          console.log('KB deletion initiated:', kbId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete knowledge base';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to delete knowledge base:', error);
          throw error;
        }
      },

      async reindexKnowledgeBase(kbId: string) {
        try {
          await invoke<void>('reindex_knowledge_base', { kbId });
          console.log('KB reindexing initiated:', kbId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to start reindexing';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to start reindexing:', error);
          throw error;
        }
      },

      async exportKnowledgeBase(kbId: string) {
        try {
          const bytes = await invoke<number[]>('export_knowledge_base', { kbId });
          return new Blob([new Uint8Array(bytes)], { type: 'application/zip' });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to export knowledge base';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to export knowledge base:', error);
          throw error;
        }
      },

      async searchKnowledgeBase(collection: string, query: string, topK?: number, filters?: Record<string, any>) {
        const request: SearchRequest = {
          collection,
          query,
          top_k: topK,
          filters
        };

        try {
          const results = await invoke<SearchResult[]>('search_knowledge_base', { request });
          return results;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Search failed';
          patchState(store, { lastError: errorMessage });
          console.error('Search failed:', error);
          throw error;
        }
      },

      async refreshKnowledgeBases() {
        try {
          patchState(store, { isLoading: true, lastError: null });
          const kbs = await invoke<KnowledgeBase[]>('get_knowledge_bases');
          const transformedKBs = kbs.map(kb => transformKnowledgeBase(kb));
          patchState(store, { knowledgeBases: transformedKBs, isLoading: false });
          return transformedKBs;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to refresh knowledge bases';
          patchState(store, { lastError: errorMessage, isLoading: false });
          console.error('Failed to refresh knowledge bases:', error);
          throw error;
        }
      },

      async getHealthStatus() {
        try {
          const status = await invoke<any>('get_health_status');
          return status;
        } catch (error) {
          console.error('Failed to get health status:', error);
          return { overall: 'Error', error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },

      // Event handlers for real-time updates
      handleKBCreated(kb: KnowledgeBase) {
        const transformedKB = transformKnowledgeBase(kb);
        patchState(store, {
          knowledgeBases: [...store.knowledgeBases(), transformedKB]
        });
      },

      handleKBDeleted(kbId: string) {
        patchState(store, {
          knowledgeBases: store.knowledgeBases().filter(kb => kb.id !== kbId)
        });
      },

      handleKBStatusUpdated(kbId: string, status: KnowledgeBaseStatus) {
        const updatedKBs = store.knowledgeBases().map(kb =>
          kb.id === kbId
            ? { ...kb, status, updated_at: new Date().toISOString() }
            : kb
        );
        patchState(store, { knowledgeBases: updatedKBs });
      },

      handleIndexingProgress(payload: any) {
        const { kb_id, step, progress } = payload;

        // Update or create run entry
        const existingRuns = store.runs();
        const existingRun = existingRuns.find(run => run.kb_id === kb_id);

        let updatedRuns: IngestRun[];
        if (existingRun) {
          updatedRuns = existingRuns.map(run =>
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
          updatedRuns = [...existingRuns, newRun];
        }

        patchState(store, { runs: updatedRuns });
      },

      handleIndexingCompleted(kbId: string) {
        // Remove completed run
        const updatedRuns = store.runs().filter(run => run.kb_id !== kbId);
        patchState(store, { runs: updatedRuns });
      },

      handleSearchCompleted(payload: any) {
        const { latency_ms } = payload;

        // Update metrics with new latency
        const currentMetrics = store.metrics();
        const updatedMetrics = {
          ...currentMetrics,
          avg_query_latency_ms: (currentMetrics.avg_query_latency_ms + latency_ms) / 2
        };

        patchState(store, { metrics: updatedMetrics });
      },

      // Utility methods
      clearError() {
        patchState(store, { lastError: null });
      },

      setLoading(loading: boolean) {
        patchState(store, { isLoading: loading });
      },

      // Cleanup
      destroy() {
        if (unlisten) {
          unlisten();
          unlisten = undefined;
        }
        console.log('KnowledgeBasesStore destroyed');
      }
    };
  })
);

// Type export for dependency injection
export type KnowledgeBasesStoreType = InstanceType<typeof KnowledgeBasesStore>;