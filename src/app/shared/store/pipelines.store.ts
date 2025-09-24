/*!
 * Pipelines Signal Store - NgRx Signals Implementation
 *
 * Provides centralized, reactive state management for Pipeline operations.
 * Follows the established pattern from ToolsStore and KnowledgeBasesStore.
 */

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  Pipeline,
  PipelineStatus,
  PipelineRun,
  PipelineRunStatus,
  PipelineTemplate,
  PipelineTemplateCategory,
  PipelineValidationResult,
  ETLStepType
} from '../models/pipeline.model';

// State interfaces for pipeline operations
export interface CreatePipelineRequest {
  name: string;
  description: string;
  templateId?: string;
  parameters?: Record<string, any>;
  tags?: string[];
}

export interface UpdatePipelineRequest {
  id: string;
  name?: string;
  description?: string;
  spec?: any;
  status?: PipelineStatus;
  tags?: string[];
}

export interface ExecutePipelineRequest {
  pipelineId: string;
  parameters?: Record<string, any>;
  triggeredBy: {
    type: 'manual' | 'scheduled' | 'api';
    userId?: string;
    source?: string;
  };
}

export interface PipelineExecutionMetrics {
  total_pipelines: number;
  active_pipelines: number;
  error_pipelines: number;
  draft_pipelines: number;
  running_executions: number;
  avg_execution_time: number;
  total_executions: number;
  success_rate: number;
  last_24h_executions: number;
}

export interface PipelineCloneRequest {
  pipelineId: string;
  newName: string;
  includeRuns?: boolean;
}

export interface PipelineExportData {
  pipeline: Pipeline;
  dependencies: string[];
  exportedAt: string;
  format: 'json' | 'yaml';
}

// Initial state
interface PipelinesState {
  pipelines: Pipeline[];
  runs: PipelineRun[];
  templates: PipelineTemplate[];
  metrics: PipelineExecutionMetrics;
  selectedPipelineId: string | null;
  selectedRunId: string | null;
  isLoading: boolean;
  lastError: string | null;
  isInitialized: boolean;
  validationResults: Record<string, PipelineValidationResult>; // pipelineId -> validation
}

const initialState: PipelinesState = {
  pipelines: [],
  runs: [],
  templates: [],
  metrics: {
    total_pipelines: 0,
    active_pipelines: 0,
    error_pipelines: 0,
    draft_pipelines: 0,
    running_executions: 0,
    avg_execution_time: 0,
    total_executions: 0,
    success_rate: 0,
    last_24h_executions: 0
  },
  selectedPipelineId: null,
  selectedRunId: null,
  isLoading: false,
  lastError: null,
  isInitialized: false,
  validationResults: {}
};

// Create the signal store
export const PipelinesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Statistics computed values
    totalCount: computed(() => store.pipelines().length),
    activeCount: computed(() =>
      store.pipelines().filter(pipeline => pipeline.status === 'active').length
    ),
    errorCount: computed(() =>
      store.pipelines().filter(pipeline => pipeline.status === 'error').length
    ),
    draftCount: computed(() =>
      store.pipelines().filter(pipeline => pipeline.status === 'draft').length
    ),
    pausedCount: computed(() =>
      store.pipelines().filter(pipeline => pipeline.status === 'paused').length
    ),

    // Metrics computed from actual data
    computedMetrics: computed(() => {
      const pipelines = store.pipelines();
      const runs = store.runs();
      const recentRuns = runs.filter(run => {
        const runDate = new Date(run.startedAt);
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        return runDate > yesterday;
      });

      const completedRuns = runs.filter(run => run.status === 'completed');
      const totalExecutionTime = completedRuns.reduce((sum, run) =>
        sum + (run.metrics.duration || 0), 0);
      const avgExecutionTime = completedRuns.length > 0
        ? totalExecutionTime / completedRuns.length
        : 0;

      const successfulRuns = runs.filter(run => run.status === 'completed').length;
      const totalRuns = runs.filter(run => ['completed', 'failed'].includes(run.status)).length;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      return {
        ...store.metrics(),
        total_pipelines: pipelines.length,
        active_pipelines: pipelines.filter(p => p.status === 'active').length,
        error_pipelines: pipelines.filter(p => p.status === 'error').length,
        draft_pipelines: pipelines.filter(p => p.status === 'draft').length,
        running_executions: runs.filter(run => run.status === 'running').length,
        avg_execution_time: avgExecutionTime,
        total_executions: runs.length,
        success_rate: successRate,
        last_24h_executions: recentRuns.length
      };
    }),

    // Filter helpers
    activePipelines: computed(() =>
      store.pipelines().filter(pipeline => pipeline.status === 'active')
    ),
    draftPipelines: computed(() =>
      store.pipelines().filter(pipeline => pipeline.status === 'draft')
    ),
    errorPipelines: computed(() =>
      store.pipelines().filter(pipeline => pipeline.status === 'error')
    ),

    // Selected pipeline and run
    selectedPipeline: computed(() => {
      const selectedId = store.selectedPipelineId();
      return selectedId ? store.pipelines().find(p => p.id === selectedId) || null : null;
    }),
    selectedRun: computed(() => {
      const selectedId = store.selectedRunId();
      return selectedId ? store.runs().find(r => r.id === selectedId) || null : null;
    }),

    // Runs for selected pipeline
    selectedPipelineRuns: computed(() => {
      const selectedId = store.selectedPipelineId();
      return selectedId ? store.runs().filter(run => run.pipelineId === selectedId) : [];
    }),

    // Recent runs (last 10)
    recentRuns: computed(() =>
      store.runs()
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 10)
    ),

    // Running executions
    runningExecutions: computed(() =>
      store.runs().filter(run => run.status === 'running')
    ),

    // Templates by category
    templatesByCategory: computed(() => {
      const templates = store.templates();
      const categorized: Record<PipelineTemplateCategory, PipelineTemplate[]> = {
        data_ingestion: [],
        text_processing: [],
        document_parsing: [],
        embedding_generation: [],
        index_building: [],
        evaluation: [],
        export_import: [],
        custom: []
      };

      templates.forEach(template => {
        categorized[template.category].push(template);
      });

      return categorized;
    }),

    // Validation status
    hasValidationErrors: computed(() => {
      const selectedId = store.selectedPipelineId();
      if (!selectedId) return false;
      const validation = store.validationResults()[selectedId];
      return validation ? !validation.isValid : false;
    })
  })),
  withMethods((store) => {
    let eventListeners: UnlistenFn[] = [];

    return {
      // Initialization method
      async initialize() {
        if (store.isInitialized()) {
          return;
        }

        patchState(store, { isLoading: true, lastError: null });

        try {
          // Set up real-time event listeners for pipeline state changes
          const pipelineCreatedListener = await listen('pipeline_created', (event: any) => {
            const newPipeline = event.payload as Pipeline;
            patchState(store, (state) => ({
              pipelines: [...state.pipelines, newPipeline]
            }));
          });

          const pipelineUpdatedListener = await listen('pipeline_updated', (event: any) => {
            const updatedPipeline = event.payload as Pipeline;
            patchState(store, (state) => ({
              pipelines: state.pipelines.map(pipeline =>
                pipeline.id === updatedPipeline.id ? updatedPipeline : pipeline
              )
            }));
          });

          const pipelineDeletedListener = await listen('pipeline_deleted', (event: any) => {
            const { pipelineId } = event.payload;
            patchState(store, (state) => ({
              pipelines: state.pipelines.filter(pipeline => pipeline.id !== pipelineId),
              runs: state.runs.filter(run => run.pipelineId !== pipelineId)
            }));
          });

          const pipelineStatusChangedListener = await listen('pipeline_status_changed', (event: any) => {
            const { pipelineId, status } = event.payload;
            patchState(store, (state) => ({
              pipelines: state.pipelines.map(pipeline =>
                pipeline.id === pipelineId
                  ? { ...pipeline, status, updatedAt: new Date().toISOString() }
                  : pipeline
              )
            }));
          });

          const runStartedListener = await listen('pipeline_run_started', (event: any) => {
            const newRun = event.payload as PipelineRun;
            patchState(store, (state) => ({
              runs: [...state.runs, newRun]
            }));
          });

          const runUpdatedListener = await listen('pipeline_run_updated', (event: any) => {
            const updatedRun = event.payload as PipelineRun;
            patchState(store, (state) => ({
              runs: state.runs.map(run =>
                run.id === updatedRun.id ? updatedRun : run
              )
            }));
          });

          const runCompletedListener = await listen('pipeline_run_completed', (event: any) => {
            const { runId, status, metrics, endedAt } = event.payload;
            patchState(store, (state) => ({
              runs: state.runs.map(run =>
                run.id === runId
                  ? { ...run, status, metrics, endedAt }
                  : run
              )
            }));
          });

          eventListeners.push(
            pipelineCreatedListener,
            pipelineUpdatedListener,
            pipelineDeletedListener,
            pipelineStatusChangedListener,
            runStartedListener,
            runUpdatedListener,
            runCompletedListener
          );

          // Load initial state
          await this.loadPipelines();
          await this.loadTemplates();

          patchState(store, { isInitialized: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize pipelines store';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to initialize PipelinesStore:', error);
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      // Cleanup method for destroying event listeners
      destroy() {
        eventListeners.forEach(unlisten => unlisten());
        eventListeners = [];
        patchState(store, { isInitialized: false });
      },

      // Load all pipelines from backend
      async loadPipelines() {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const response = await invoke<{ pipelines: Pipeline[], runs: PipelineRun[], metrics: PipelineExecutionMetrics }>('get_pipelines');

          patchState(store, {
            pipelines: response.pipelines || [],
            runs: response.runs || [],
            metrics: response.metrics || store.metrics()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load pipelines';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to load pipelines:', error);
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      // Load pipeline templates
      async loadTemplates() {
        try {
          const templates = await invoke<PipelineTemplate[]>('get_pipeline_templates');
          patchState(store, { templates: templates || [] });
        } catch (error) {
          console.error('Failed to load pipeline templates:', error);
        }
      },

      // Create a new pipeline
      async createPipeline(request: CreatePipelineRequest): Promise<Pipeline | null> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const pipeline = await invoke<Pipeline>('create_pipeline', { request });

          // State will be updated via event listener
          return pipeline;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create pipeline';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to create pipeline:', error);
          return null;
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      // Update an existing pipeline
      async updatePipeline(request: UpdatePipelineRequest): Promise<Pipeline | null> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const pipeline = await invoke<Pipeline>('update_pipeline', { request });

          // State will be updated via event listener
          return pipeline;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update pipeline';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to update pipeline:', error);
          return null;
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      // Delete a pipeline
      async deletePipeline(pipelineId: string): Promise<boolean> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          await invoke<void>('delete_pipeline', { pipelineId });

          // State will be updated via event listener
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete pipeline';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to delete pipeline:', error);
          return false;
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      // Execute a pipeline
      async executePipeline(request: ExecutePipelineRequest): Promise<PipelineRun | null> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const run = await invoke<PipelineRun>('execute_pipeline', { request });

          // State will be updated via event listener
          return run;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to execute pipeline';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to execute pipeline:', error);
          return null;
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      // Cancel a running pipeline execution
      async cancelExecution(runId: string): Promise<boolean> {
        try {
          await invoke<void>('cancel_pipeline_execution', { runId });
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to cancel execution';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to cancel execution:', error);
          return false;
        }
      },

      // Validate a pipeline
      async validatePipeline(pipelineId: string): Promise<PipelineValidationResult | null> {
        try {
          const result = await invoke<PipelineValidationResult>('validate_pipeline', { pipelineId });

          patchState(store, (state) => ({
            validationResults: {
              ...state.validationResults,
              [pipelineId]: result
            }
          }));

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to validate pipeline';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to validate pipeline:', error);
          return null;
        }
      },

      // Clone a pipeline
      async clonePipeline(request: PipelineCloneRequest): Promise<Pipeline | null> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const pipeline = await invoke<Pipeline>('clone_pipeline', { request });

          // State will be updated via event listener
          return pipeline;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to clone pipeline';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to clone pipeline:', error);
          return null;
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      // Create pipeline from template
      async createFromTemplate(templateId: string, name: string, parameters?: Record<string, any>): Promise<Pipeline | null> {
        return this.createPipeline({
          name,
          description: `Created from template`,
          templateId,
          parameters
        });
      },

      // Selection methods
      selectPipeline(pipelineId: string | null) {
        patchState(store, { selectedPipelineId: pipelineId });
      },

      selectRun(runId: string | null) {
        patchState(store, { selectedRunId: runId });
      },

      // Clear error
      clearError() {
        patchState(store, { lastError: null });
      }
    };
  })
);