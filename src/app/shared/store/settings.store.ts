import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Types matching Rust backend
export interface ServerSettings {
  mcp_server_enabled: boolean;
  mcp_server_port: number;
  mcp_server_status: string;
  max_connections: number;
  request_timeout: number;
  health_check_interval: number;
}

export interface KbSettings {
  default_embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  search_top_k: number;
  search_threshold: number;
  enable_hybrid_search: boolean;
  enable_reranking: boolean;
  citation_mode: string;
}

export interface SystemSettings {
  storage_quota_gb: number;
  cache_size_mb: number;
  cache_ttl_seconds: number;
  log_level: string;
  log_retention_days: number;
  auto_backup: boolean;
  backup_interval_hours: number;
  max_backups: number;
  data_directory: string;
}

export interface SecuritySettings {
  air_gapped_mode: boolean;
  network_policy: string;
  encrypt_data: boolean;
  log_redaction: boolean;
  citation_policy: boolean;
  permission_level: string;
  audit_logging: boolean;
}

export interface AppSettings {
  server: ServerSettings;
  kb: KbSettings;
  system: SystemSettings;
  security: SecuritySettings;
}

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastSaved: string | null;
}

const initialState: SettingsState = {
  settings: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastSaved: null,
};

export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Server status computed values
    mcpServerRunning: computed(() => {
      const status = store.settings()?.server?.mcp_server_status;
      return status === 'running';
    }),
    serverHealthStatus: computed(() => {
      const running = store.settings()?.server?.mcp_server_status === 'running';
      return running ? 'healthy' : 'stopped';
    }),

    // KB configuration computed values
    searchConfiguration: computed(() => {
      const kb = store.settings()?.kb;
      if (!kb) return null;

      return {
        model: kb.default_embedding_model,
        chunkSize: kb.chunk_size,
        topK: kb.search_top_k,
        threshold: kb.search_threshold,
        hybridEnabled: kb.enable_hybrid_search,
        rerankingEnabled: kb.enable_reranking,
      };
    }),

    // System status computed values
    storageStatus: computed(() => {
      const system = store.settings()?.system;
      if (!system) return null;

      return {
        quotaGB: system.storage_quota_gb,
        cacheMB: system.cache_size_mb,
        autoBackup: system.auto_backup,
        dataDirectory: system.data_directory,
      };
    }),

    // Security status computed values
    securityStatus: computed(() => {
      const security = store.settings()?.security;
      if (!security) return null;

      return {
        airGapped: security.air_gapped_mode,
        encrypted: security.encrypt_data,
        auditEnabled: security.audit_logging,
        permissionLevel: security.permission_level,
      };
    }),

    // Overall application status
    appStatus: computed(() => {
      const settings = store.settings();
      if (!settings) return 'loading';

      const serverRunning = settings.server.mcp_server_status === 'running';
      const airGapped = settings.security.air_gapped_mode;

      if (store.error()) return 'error';
      if (store.isLoading()) return 'loading';
      if (!serverRunning) return 'stopped';
      if (airGapped) return 'air-gapped';
      return 'active';
    }),
  })),
  withMethods((store) => ({
    // Initialize store and load settings
    async initialize() {
      if (store.isInitialized()) return;

      patchState(store, { isLoading: true, error: null });

      try {
        const settings = await invoke<AppSettings>('get_app_settings');

        patchState(store, {
          settings,
          isLoading: false,
          isInitialized: true,
          error: null,
        });

        // Start listening for real-time updates
        await this.startEventListeners();

        console.log('Settings store initialized:', settings);
      } catch (error) {
        console.error('Failed to initialize settings store:', error);
        patchState(store, {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load settings',
        });
      }
    },

    // Start real-time event listeners
    async startEventListeners() {
      try {
        // Listen for settings changes
        await listen('settings_updated', (event: any) => {
          console.log('Settings updated event received:', event.payload);
          const updatedSettings = event.payload as AppSettings;
          patchState(store, { settings: updatedSettings });
        });

        // Listen for server status changes
        await listen('mcp_server_status_changed', (event: any) => {
          console.log('MCP server status changed:', event.payload);
          const currentSettings = store.settings();
          if (currentSettings) {
            const updatedSettings = {
              ...currentSettings,
              server: {
                ...currentSettings.server,
                mcp_server_status: event.payload.status,
              },
            };
            patchState(store, { settings: updatedSettings });
          }
        });

        console.log('Settings event listeners started');
      } catch (error) {
        console.error('Failed to start settings event listeners:', error);
      }
    },

    // Update all settings
    async updateSettings(newSettings: Partial<AppSettings>) {
      const currentSettings = store.settings();
      if (!currentSettings) return;

      patchState(store, { isLoading: true, error: null });

      try {
        const updatedSettings = { ...currentSettings, ...newSettings };
        const savedSettings = await invoke<AppSettings>('update_app_settings', {
          settings: updatedSettings,
        });

        patchState(store, {
          settings: savedSettings,
          isLoading: false,
          lastSaved: new Date().toISOString(),
          error: null,
        });

        console.log('Settings updated successfully:', savedSettings);
      } catch (error) {
        console.error('Failed to update settings:', error);
        patchState(store, {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to save settings',
        });
      }
    },

    // Server management methods
    async startMcpServer() {
      patchState(store, { isLoading: true, error: null });

      try {
        const result = await invoke<string>('start_mcp_server');
        console.log('MCP server start result:', result);

        // Update server status
        const currentSettings = store.settings();
        if (currentSettings) {
          const updatedSettings = {
            ...currentSettings,
            server: {
              ...currentSettings.server,
              mcp_server_status: 'running',
            },
          };
          patchState(store, { settings: updatedSettings, isLoading: false });
        }
      } catch (error) {
        console.error('Failed to start MCP server:', error);
        patchState(store, {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to start MCP server',
        });
      }
    },

    async stopMcpServer() {
      patchState(store, { isLoading: true, error: null });

      try {
        const result = await invoke<string>('stop_mcp_server');
        console.log('MCP server stop result:', result);

        // Update server status
        const currentSettings = store.settings();
        if (currentSettings) {
          const updatedSettings = {
            ...currentSettings,
            server: {
              ...currentSettings.server,
              mcp_server_status: 'stopped',
            },
          };
          patchState(store, { settings: updatedSettings, isLoading: false });
        }
      } catch (error) {
        console.error('Failed to stop MCP server:', error);
        patchState(store, {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to stop MCP server',
        });
      }
    },

    async getServerStatus() {
      try {
        const serverSettings = await invoke<ServerSettings>('get_mcp_server_status');

        const currentSettings = store.settings();
        if (currentSettings) {
          const updatedSettings = {
            ...currentSettings,
            server: serverSettings,
          };
          patchState(store, { settings: updatedSettings });
        }

        return serverSettings;
      } catch (error) {
        console.error('Failed to get server status:', error);
        throw error;
      }
    },

    // System management methods
    async selectDataDirectory() {
      try {
        const selectedPath = await invoke<string | null>('select_data_directory');

        if (selectedPath) {
          const currentSettings = store.settings();
          if (currentSettings) {
            await this.updateSettings({
              system: {
                ...currentSettings.system,
                data_directory: selectedPath,
              },
            });
          }
        }

        return selectedPath;
      } catch (error) {
        console.error('Failed to select data directory:', error);
        throw error;
      }
    },

    async clearCache() {
      patchState(store, { isLoading: true, error: null });

      try {
        const result = await invoke<string>('clear_application_cache');
        console.log('Cache cleared:', result);

        patchState(store, { isLoading: false, error: null });
        return result;
      } catch (error) {
        console.error('Failed to clear cache:', error);
        patchState(store, {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to clear cache',
        });
        throw error;
      }
    },

    // Settings import/export
    async exportSettings() {
      try {
        const settingsJson = await invoke<string>('export_settings');
        return settingsJson;
      } catch (error) {
        console.error('Failed to export settings:', error);
        throw error;
      }
    },

    async importSettings(settingsJson: string) {
      patchState(store, { isLoading: true, error: null });

      try {
        const importedSettings = await invoke<AppSettings>('import_settings', {
          settingsJson,
        });

        patchState(store, {
          settings: importedSettings,
          isLoading: false,
          lastSaved: new Date().toISOString(),
          error: null,
        });

        console.log('Settings imported successfully:', importedSettings);
        return importedSettings;
      } catch (error) {
        console.error('Failed to import settings:', error);
        patchState(store, {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to import settings',
        });
        throw error;
      }
    },

    // Error handling
    clearError() {
      patchState(store, { error: null });
    },

    // Reset store
    reset() {
      patchState(store, initialState);
    },
  }))
);