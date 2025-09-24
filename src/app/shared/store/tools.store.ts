/*!
 * Tools Signal Store - NgRx Signals Implementation
 *
 * Provides centralized, reactive state management for MCP Tools operations.
 * Follows the established pattern from KnowledgeBasesStore and SettingsStore.
 */

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  Tool,
  ToolStatus,
  BaseOperation,
  RagPackExportResult,
  ImportToolRequest,
  ImportValidationResult,
  BulkExportRequest,
  BulkExportResult,
  ToolTemplate,
  ToolTemplateLibrary
} from '../types/tool.types';

// State interfaces for tool operations
export interface CreateToolRequest {
  name: string;
  endpoint: string;
  description: string;
  baseOperation: BaseOperation;
  knowledgeBase: {
    name: string;
    version: string;
  };
  config: {
    topK: number;
    topN: number;
  };
  permissions: string[];
}

export interface UpdateToolRequest {
  id: string;
  name?: string;
  endpoint?: string;
  description?: string;
  config?: {
    topK?: number;
    topN?: number;
  };
  permissions?: string[];
}

export interface ToolTestRequest {
  toolId: string;
  testQuery: string;
  testParams?: Record<string, any>;
}

export interface ToolTestResult {
  success: boolean;
  response?: any;
  error?: string;
  latency?: number;
  timestamp: string;
}

export interface ToolExecutionMetrics {
  total_tools: number;
  active_tools: number;
  error_tools: number;
  inactive_tools: number;
  pending_tools: number;
  avg_response_time: number;
  total_executions: number;
  success_rate: number;
}

export interface ToolExportData {
  tool: Tool;
  dependencies: string[];
  exportedAt: string;
  format: 'json' | 'yaml';
}

// Initial state
interface ToolsState {
  tools: Tool[];
  testResults: Record<string, ToolTestResult[]>; // toolId -> test results
  metrics: ToolExecutionMetrics;
  isLoading: boolean;
  lastError: string | null;
  isInitialized: boolean;
  mcpServerStatus: 'running' | 'stopped' | 'error' | 'unknown';
}

const initialState: ToolsState = {
  tools: [],
  testResults: {},
  metrics: {
    total_tools: 0,
    active_tools: 0,
    error_tools: 0,
    inactive_tools: 0,
    pending_tools: 0,
    avg_response_time: 0,
    total_executions: 0,
    success_rate: 0
  },
  isLoading: false,
  lastError: null,
  isInitialized: false,
  mcpServerStatus: 'unknown'
};

// Create the signal store
export const ToolsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Statistics computed values
    totalCount: computed(() => store.tools().length),
    activeCount: computed(() =>
      store.tools().filter(tool => tool.status === 'ACTIVE').length
    ),
    errorCount: computed(() =>
      store.tools().filter(tool => tool.status === 'ERROR').length
    ),
    inactiveCount: computed(() =>
      store.tools().filter(tool => tool.status === 'INACTIVE').length
    ),
    pendingCount: computed(() =>
      store.tools().filter(tool => tool.status === 'PENDING').length
    ),

    // Metrics computed from actual data
    computedMetrics: computed(() => {
      const tools = store.tools();
      const totalExecutions = tools.reduce((sum, tool) => sum + (tool.usage?.totalCalls || 0), 0);
      const avgLatency = tools.length > 0
        ? tools.reduce((sum, tool) => sum + (tool.usage?.avgLatency || 0), 0) / tools.length
        : 0;

      return {
        ...store.metrics(),
        total_tools: tools.length,
        active_tools: tools.filter(t => t.status === 'ACTIVE').length,
        error_tools: tools.filter(t => t.status === 'ERROR').length,
        inactive_tools: tools.filter(t => t.status === 'INACTIVE').length,
        pending_tools: tools.filter(t => t.status === 'PENDING').length,
        avg_response_time: avgLatency,
        total_executions: totalExecutions
      };
    }),

    // Filter helpers
    activeTools: computed(() =>
      store.tools().filter(tool => tool.status === 'ACTIVE')
    ),
    errorTools: computed(() =>
      store.tools().filter(tool => tool.status === 'ERROR')
    ),
    inactiveTools: computed(() =>
      store.tools().filter(tool => tool.status === 'INACTIVE')
    ),

    // Tools by operation type
    searchTools: computed(() =>
      store.tools().filter(tool => tool.baseOperation === 'rag.search')
    ),
    answerTools: computed(() =>
      store.tools().filter(tool => tool.baseOperation === 'rag.answer')
    ),

    // Server status indicators
    isServerRunning: computed(() => store.mcpServerStatus() === 'running'),
    canExecuteTools: computed(() =>
      store.mcpServerStatus() === 'running' &&
      store.tools().filter(tool => tool.status === 'ACTIVE').length > 0
    )
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
          // Set up real-time event listeners for tool state changes
          const toolCreatedListener = await listen('tool_created', (event: any) => {
            const newTool = event.payload as Tool;
            patchState(store, (state) => ({
              tools: [...state.tools, newTool]
            }));
          });

          const toolUpdatedListener = await listen('tool_updated', (event: any) => {
            const updatedTool = event.payload as Tool;
            patchState(store, (state) => ({
              tools: state.tools.map(tool =>
                tool.id === updatedTool.id ? updatedTool : tool
              )
            }));
          });

          const toolDeletedListener = await listen('tool_deleted', (event: any) => {
            const { toolId } = event.payload;
            patchState(store, (state) => ({
              tools: state.tools.filter(tool => tool.id !== toolId)
            }));
          });

          const toolStatusChangedListener = await listen('tool_status_changed', (event: any) => {
            const { toolId, status, errorMessage } = event.payload;
            patchState(store, (state) => ({
              tools: state.tools.map(tool =>
                tool.id === toolId
                  ? { ...tool, status, errorMessage, updatedAt: new Date().toISOString() }
                  : tool
              )
            }));
          });

          const mcpServerStatusListener = await listen('mcp_server_status_changed', (event: any) => {
            const { status } = event.payload;
            patchState(store, { mcpServerStatus: status });
          });

          eventListeners.push(
            toolCreatedListener,
            toolUpdatedListener,
            toolDeletedListener,
            toolStatusChangedListener,
            mcpServerStatusListener
          );

          // Load initial state
          await this.loadTools();
          await this.loadServerStatus();

          patchState(store, { isInitialized: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize tools store';
          patchState(store, { lastError: errorMessage });
          console.error('Failed to initialize ToolsStore:', error);
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

      // Load all tools from backend
      async loadTools() {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const response = await invoke<{ tools: Tool[], metrics: ToolExecutionMetrics }>('get_tools');

          patchState(store, {
            tools: response.tools || [],
            metrics: response.metrics || store.metrics(),
            isLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load tools';
          patchState(store, { lastError: errorMessage, isLoading: false });
          console.error('Failed to load tools:', error);
        }
      },

      // Create a new tool
      async createTool(toolData: CreateToolRequest): Promise<Tool> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const newTool = await invoke<Tool>('create_tool', { toolData });

          // Optimistic update - actual update will come via event listener
          patchState(store, (state) => ({
            tools: [...state.tools, newTool],
            isLoading: false
          }));

          return newTool;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create tool';
          patchState(store, { lastError: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Update an existing tool
      async updateTool(updateData: UpdateToolRequest): Promise<Tool> {
        patchState(store, { lastError: null });

        try {
          const updatedTool = await invoke<Tool>('update_tool', { updateData });

          // Optimistic update - actual update will come via event listener
          patchState(store, (state) => ({
            tools: state.tools.map(tool =>
              tool.id === updatedTool.id ? updatedTool : tool
            )
          }));

          return updatedTool;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update tool';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Delete a tool
      async deleteTool(toolId: string): Promise<void> {
        patchState(store, { lastError: null });

        try {
          await invoke('delete_tool', { toolId });

          // Optimistic update - actual update will come via event listener
          patchState(store, (state) => ({
            tools: state.tools.filter(tool => tool.id !== toolId)
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete tool';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Update tool status
      async updateToolStatus(toolId: string, status: ToolStatus): Promise<void> {
        patchState(store, { lastError: null });

        try {
          await invoke('update_tool_status', { toolId, status });

          // Optimistic update - actual update will come via event listener
          patchState(store, (state) => ({
            tools: state.tools.map(tool =>
              tool.id === toolId
                ? { ...tool, status, updatedAt: new Date().toISOString() }
                : tool
            )
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update tool status';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Test a tool execution
      async testTool(testRequest: ToolTestRequest): Promise<ToolTestResult> {
        patchState(store, { lastError: null });

        try {
          const testResult = await invoke<ToolTestResult>('test_tool', { testRequest });

          // Store test result
          patchState(store, (state) => ({
            testResults: {
              ...state.testResults,
              [testRequest.toolId]: [
                ...(state.testResults[testRequest.toolId] || []),
                testResult
              ].slice(-10) // Keep only last 10 test results per tool
            }
          }));

          return testResult;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to test tool';
          const failedResult: ToolTestResult = {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
          };

          patchState(store, (state) => ({
            testResults: {
              ...state.testResults,
              [testRequest.toolId]: [
                ...(state.testResults[testRequest.toolId] || []),
                failedResult
              ].slice(-10)
            },
            lastError: errorMessage
          }));

          return failedResult;
        }
      },

      // Export tool configuration
      async exportTool(toolId: string, format: 'json' | 'yaml' = 'json'): Promise<ToolExportData> {
        patchState(store, { lastError: null });

        try {
          const exportData = await invoke<ToolExportData>('export_tool', { toolId, format });
          return exportData;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to export tool';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Import tool configuration
      async importTool(exportData: ToolExportData): Promise<Tool> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const importedTool = await invoke<Tool>('import_tool', { exportData });

          // Optimistic update - actual update will come via event listener
          patchState(store, (state) => ({
            tools: [...state.tools, importedTool],
            isLoading: false
          }));

          return importedTool;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import tool';
          patchState(store, { lastError: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Load MCP server status
      async loadServerStatus() {
        try {
          const status = await invoke<string>('get_mcp_server_status');
          patchState(store, { mcpServerStatus: status as any });
        } catch (error) {
          console.error('Failed to load MCP server status:', error);
          patchState(store, { mcpServerStatus: 'error' });
        }
      },

      // Start MCP server
      async startMcpServer(): Promise<void> {
        patchState(store, { lastError: null });

        try {
          await invoke('start_mcp_server');
          patchState(store, { mcpServerStatus: 'running' });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to start MCP server';
          patchState(store, {
            lastError: errorMessage,
            mcpServerStatus: 'error'
          });
          throw new Error(errorMessage);
        }
      },

      // Stop MCP server
      async stopMcpServer(): Promise<void> {
        patchState(store, { lastError: null });

        try {
          await invoke('stop_mcp_server');
          patchState(store, { mcpServerStatus: 'stopped' });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to stop MCP server';
          patchState(store, {
            lastError: errorMessage,
            mcpServerStatus: 'error'
          });
          throw new Error(errorMessage);
        }
      },

      // Clear error state
      clearError() {
        patchState(store, { lastError: null });
      },

      // Get test results for a specific tool
      getTestResults(toolId: string): ToolTestResult[] {
        return store.testResults()[toolId] || [];
      },

      // Get tool by ID
      getToolById(toolId: string): Tool | undefined {
        return store.tools().find(tool => tool.id === toolId);
      },

      // Phase 4.3: Enhanced Import/Export & Template Methods

      // Enhanced export with .ragpack format
      async exportToolAsRagpack(toolId: string, format: 'json' | 'yaml' = 'json', includeDependencies: boolean = true): Promise<RagPackExportResult> {
        patchState(store, { lastError: null });

        try {
          const exportResult = await invoke<RagPackExportResult>('export_tool', {
            toolId,
            format,
            includeDependencies
          });
          return exportResult;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to export tool as ragpack';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Import from .ragpack file with validation
      async importToolFromRagpack(importRequest: ImportToolRequest): Promise<Tool> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const importedTool = await invoke<Tool>('import_tool_from_ragpack', { importRequest });

          // Optimistic update - actual update will come via event listener
          patchState(store, (state) => ({
            tools: [...state.tools, importedTool],
            isLoading: false
          }));

          return importedTool;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import tool from ragpack';
          patchState(store, { lastError: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Validate import before importing
      async validateToolImport(ragpackContent: number[]): Promise<ImportValidationResult> {
        patchState(store, { lastError: null });

        try {
          const validationResult = await invoke<ImportValidationResult>('validate_tool_import', {
            ragpackContent
          });
          return validationResult;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to validate tool import';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Bulk export multiple tools
      async bulkExportTools(exportRequest: BulkExportRequest): Promise<BulkExportResult> {
        patchState(store, { lastError: null });

        try {
          const bulkExportResult = await invoke<BulkExportResult>('bulk_export_tools', { exportRequest });
          return bulkExportResult;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to bulk export tools';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Bulk import multiple tools
      async bulkImportTools(
        ragpackContent: number[],
        validateDependencies: boolean = true,
        resolveDependencies: boolean = false
      ): Promise<Tool[]> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const importedTools = await invoke<Tool[]>('bulk_import_tools', {
            ragpackContent,
            validateDependencies,
            resolveDependencies
          });

          // Optimistic update - actual updates will come via event listeners
          patchState(store, (state) => ({
            tools: [...state.tools, ...importedTools],
            isLoading: false
          }));

          return importedTools;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to bulk import tools';
          patchState(store, { lastError: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Template Management Methods

      // Get available tool templates
      async getToolTemplates(category?: string): Promise<ToolTemplateLibrary> {
        patchState(store, { lastError: null });

        try {
          const templateLibrary = await invoke<ToolTemplateLibrary>('get_tool_templates', { category });
          return templateLibrary;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to get tool templates';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Create tool from template
      async createToolFromTemplate(
        templateId: string,
        toolName: string,
        knowledgeBase: { name: string; version: string },
        customConfig?: { topK?: number; topN?: number }
      ): Promise<Tool> {
        patchState(store, { isLoading: true, lastError: null });

        try {
          const newTool = await invoke<Tool>('create_tool_from_template', {
            templateId,
            toolName,
            knowledgeBase,
            customConfig
          });

          // Optimistic update - actual update will come via event listener
          patchState(store, (state) => ({
            tools: [...state.tools, newTool],
            isLoading: false
          }));

          return newTool;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create tool from template';
          patchState(store, { lastError: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Save existing tool as template
      async saveToolAsTemplate(
        toolId: string,
        templateName: string,
        templateDescription: string,
        category: string
      ): Promise<ToolTemplate> {
        patchState(store, { lastError: null });

        try {
          const template = await invoke<ToolTemplate>('save_tool_as_template', {
            toolId,
            templateName,
            templateDescription,
            category
          });
          return template;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save tool as template';
          patchState(store, { lastError: errorMessage });
          throw new Error(errorMessage);
        }
      }
    };
  })
);