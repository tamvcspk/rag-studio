/*!
 * Application State Signal Store - NgRx Signals Implementation
 *
 * Central store for application-wide state that doesn't belong to specific domains.
 * Handles system metrics, activity logs, server status, and cross-domain statistics.
 */

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// Activity Log Entry interface
export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  category?: string;
}

// Performance Metrics interface
export interface PerformanceMetrics {
  p50Latency: number;
  p95Latency: number;
  hitRate: number;
  totalQueries: number;
  period: string;
}

// Application Health Status interface
export interface AppHealthStatus {
  overall: 'healthy' | 'degraded' | 'failed';
  services: {
    sql: 'healthy' | 'failed';
    vector: 'healthy' | 'failed';
    mcp: 'healthy' | 'failed';
    embedding: 'healthy' | 'failed';
  };
  uptime: string;
  memory_usage: number;
  cpu_usage: number;
}

// Cross-domain stats interface
export interface CrossDomainStats {
  totalTools: number;
  activeTools: number;
  totalFlows: number;
  activeFlows: number;
  totalPipelines: number;
  activePipelines: number;
}

// Initial state
interface AppState {
  activityLog: ActivityLogEntry[];
  performanceMetrics: PerformanceMetrics;
  healthStatus: AppHealthStatus | null;
  crossDomainStats: CrossDomainStats;
  isLoading: boolean;
  lastError: string | null;
  isInitialized: boolean;
}

const initialState: AppState = {
  activityLog: [],
  performanceMetrics: {
    p50Latency: 0,
    p95Latency: 0,
    hitRate: 0,
    totalQueries: 0,
    period: 'Last 24 hours'
  },
  healthStatus: null,
  crossDomainStats: {
    totalTools: 0,
    activeTools: 0,
    totalFlows: 0,
    activeFlows: 0,
    totalPipelines: 0,
    activePipelines: 0
  },
  isLoading: false,
  lastError: null,
  isInitialized: false
};

// Create the signal store
export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Recent activity entries (last 10)
    recentActivity: computed(() =>
      store.activityLog().slice(0, 10)
    ),

    // System status based on health
    systemStatus: computed(() => {
      const health = store.healthStatus();
      if (!health) {
        return { status: 'initializing', message: 'Loading system...' };
      }

      if (health.overall === 'failed') {
        return { status: 'error', message: 'System components failing' };
      }

      if (health.overall === 'degraded') {
        return { status: 'warning', message: 'Some services degraded' };
      }

      return { status: 'healthy', message: 'All systems operational' };
    }),

    // Check if store is ready
    isReady: computed(() => store.isInitialized() && !store.isLoading())
  })),
  withMethods((store) => {
    let unlisten: UnlistenFn | undefined;

    return {
      // Initialization
      async initialize() {
        if (store.isInitialized()) {
          console.log('AppStore already initialized');
          return;
        }

        patchState(store, { isLoading: true, lastError: null });

        try {
          // Setup event listeners
          await this.setupEventListeners();

          // Load initial data
          await this.loadInitialData();

          patchState(store, { isInitialized: true });
          console.log('✅ AppStore initialized successfully');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize app store';
          patchState(store, { lastError: errorMessage, isLoading: false });
          console.error('❌ Failed to initialize AppStore:', error);
        }
      },

      async setupEventListeners() {
        try {
          unlisten = await listen<any>('app_event', (event) => {
            const { type, payload } = event.payload;
            this.handleAppEvent(type, payload);
          });

          console.log('✅ App event listeners setup completed');
        } catch (error) {
          console.error('❌ Failed to setup app event listeners:', error);
          throw error;
        }
      },

      async loadInitialData() {
        try {
          // Load health status
          const health = await this.refreshHealthStatus();

          // Load cross-domain stats (TODO: implement proper endpoints)
          const stats: CrossDomainStats = {
            totalTools: 7, // TODO: get from tools service
            activeTools: 5,
            totalFlows: 8, // TODO: get from flows service
            activeFlows: 3,
            totalPipelines: 4, // TODO: get from pipelines service
            activePipelines: 2
          };

          patchState(store, {
            healthStatus: health,
            crossDomainStats: stats,
            isLoading: false
          });

          // Add startup activity
          this.addActivity({
            id: `startup_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            level: 'info',
            message: 'RAG Studio application started',
            category: 'system'
          });

        } catch (error) {
          console.error('❌ Failed to load initial app data:', error);
          throw error;
        }
      },

      // Health status management
      async refreshHealthStatus(): Promise<AppHealthStatus> {
        try {
          const health = await invoke<any>('get_health_status');

          // Map to our interface
          const appHealth: AppHealthStatus = {
            overall: health.overall || 'healthy',
            services: {
              sql: health.sql || 'healthy',
              vector: health.vector || 'healthy',
              mcp: health.mcp || 'healthy',
              embedding: health.embedding || 'healthy'
            },
            uptime: health.uptime || '0m',
            memory_usage: health.memory_usage || 0,
            cpu_usage: health.cpu_usage || 0
          };

          patchState(store, { healthStatus: appHealth });
          return appHealth;
        } catch (error) {
          console.error('Failed to get health status:', error);
          const fallbackHealth: AppHealthStatus = {
            overall: 'failed',
            services: { sql: 'failed', vector: 'failed', mcp: 'failed', embedding: 'failed' },
            uptime: '0m',
            memory_usage: 0,
            cpu_usage: 0
          };
          patchState(store, { healthStatus: fallbackHealth });
          return fallbackHealth;
        }
      },

      // Performance metrics management
      async refreshPerformanceMetrics() {
        try {
          // TODO: Implement dedicated performance metrics endpoint
          // For now, use mock data
          const metrics: PerformanceMetrics = {
            p50Latency: Math.floor(Math.random() * 50) + 100,
            p95Latency: Math.floor(Math.random() * 100) + 250,
            hitRate: Math.random() * 10 + 90,
            totalQueries: Math.floor(Math.random() * 500) + 1000,
            period: 'Last 24 hours'
          };

          patchState(store, { performanceMetrics: metrics });
        } catch (error) {
          console.error('Failed to refresh performance metrics:', error);
        }
      },

      // Activity log management
      addActivity(entry: ActivityLogEntry) {
        const current = store.activityLog();
        const updated = [entry, ...current].slice(0, 50); // Keep last 50 entries
        patchState(store, { activityLog: updated });
      },

      handleAppEvent(type: string, payload: any) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        let entry: ActivityLogEntry | null = null;

        switch (type) {
          case 'system_started':
            entry = {
              id: `activity_${Date.now()}`,
              timestamp,
              level: 'info',
              message: 'System started successfully',
              category: 'system'
            };
            break;

          case 'performance_alert':
            entry = {
              id: `activity_${Date.now()}`,
              timestamp,
              level: 'warning',
              message: `Performance alert: ${payload.message}`,
              category: 'performance'
            };
            break;

          case 'error_occurred':
            entry = {
              id: `activity_${Date.now()}`,
              timestamp,
              level: 'error',
              message: `Error: ${payload.message}`,
              category: 'error'
            };
            break;

          default:
            return; // Skip unknown events
        }

        if (entry) {
          this.addActivity(entry);
        }
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
        console.log('AppStore destroyed');
      }
    };
  })
);

// Type export for dependency injection
export type AppStoreType = InstanceType<typeof AppStore>;