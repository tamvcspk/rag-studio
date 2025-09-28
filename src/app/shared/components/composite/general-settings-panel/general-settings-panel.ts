import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Settings, FolderOpen, Palette, Globe, Server, Database } from 'lucide-angular';

import {
  RagButton,
  RagCheckbox,
  RagAlert,
  RagInput,
  RagNumberInput,
  RagSelect
} from '../../atomic';
import {
  RagFormField,
  RagSettingsSection
} from '../../semantic';
import { SettingsStore } from '../../../store/settings.store';

interface GeneralSettingsForm {
  // Workspace settings
  workspaceName: FormControl<string>;
  dataDirectory: FormControl<string>;

  // Preferences
  autoSave: FormControl<boolean>;
  autoBackup: FormControl<boolean>;
  backupInterval: FormControl<string>;
  maxBackups: FormControl<number>;

  // Interface settings
  theme: FormControl<string>;
  language: FormControl<string>;
  logLevel: FormControl<string>;

  // Server settings
  mcpServerEnabled: FormControl<boolean>;
  mcpServerPort: FormControl<number>;
  maxConnections: FormControl<number>;

  // KB settings
  chunkSize: FormControl<number>;
  searchTopK: FormControl<number>;
  enableHybridSearch: FormControl<boolean>;
}

@Component({
  selector: 'general-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagButton,
    RagCheckbox,
    RagAlert,
    RagInput,
    RagNumberInput,
    RagSelect,
    RagFormField,
    RagSettingsSection
  ],
  templateUrl: './general-settings-panel.html',
  styleUrls: ['./general-settings-panel.scss']
})
export class GeneralSettingsPanel {
  // Dependencies
  readonly settingsStore = inject(SettingsStore);

  // Icons
  readonly SettingsIcon = Settings;
  readonly FolderOpenIcon = FolderOpen;
  readonly PaletteIcon = Palette;
  readonly GlobeIcon = Globe;
  readonly ServerIcon = Server;
  readonly DatabaseIcon = Database;

  // Select options
  readonly backupIntervalOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  readonly themeOptions = [
    { value: 'system', label: 'Follow System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];

  readonly languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' }
  ];

  readonly logLevelOptions = [
    { value: 'error', label: 'Error Only' },
    { value: 'warn', label: 'Warnings' },
    { value: 'info', label: 'Information' },
    { value: 'debug', label: 'Debug' }
  ];

  // Form
  readonly settingsForm = new FormGroup<GeneralSettingsForm>({
    // Workspace settings
    workspaceName: new FormControl('My RAG Studio Workspace', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)]
    }),
    dataDirectory: new FormControl('./data', {
      nonNullable: true,
      validators: [Validators.required]
    }),

    // Preferences
    autoSave: new FormControl(true, { nonNullable: true }),
    autoBackup: new FormControl(false, { nonNullable: true }),
    backupInterval: new FormControl('daily', { nonNullable: true }),
    maxBackups: new FormControl(10, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(50)]
    }),

    // Interface settings
    theme: new FormControl('system', { nonNullable: true }),
    language: new FormControl('en', { nonNullable: true }),
    logLevel: new FormControl('info', { nonNullable: true }),

    // Server settings
    mcpServerEnabled: new FormControl(true, { nonNullable: true }),
    mcpServerPort: new FormControl(3000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1024), Validators.max(65535)]
    }),
    maxConnections: new FormControl(100, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(1000)]
    }),

    // KB settings
    chunkSize: new FormControl(512, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(128), Validators.max(2048)]
    }),
    searchTopK: new FormControl(10, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(50)]
    }),
    enableHybridSearch: new FormControl(true, { nonNullable: true }),
  });

  // State
  private readonly isInitialized = signal(false);

  // Computed values
  readonly serverStatus = computed(() => {
    const settings = this.settingsStore.settings();
    return settings?.server?.mcp_server_status || 'Unknown';
  });

  readonly isServerRunning = computed(() => {
    return this.settingsStore.mcpServerRunning();
  });

  constructor() {
    // Initialize store and sync form when settings change
    this.initializeStore();
    this.syncFormWithSettings();

    // Handle form state based on loading status
    effect(() => {
      if (this.settingsStore.isLoading()) {
        this.settingsForm.disable();
      } else {
        this.settingsForm.enable();
      }
    });
  }

  private async initializeStore() {
    if (!this.settingsStore.isInitialized()) {
      await this.settingsStore.initialize();
    }
    this.isInitialized.set(true);
  }

  private syncFormWithSettings() {
    // Watch for settings changes and update form
    const settings = this.settingsStore.settings();
    if (settings && this.isInitialized()) {
      this.settingsForm.patchValue({
        workspaceName: 'My RAG Studio Workspace', // TODO: Add to backend interface
        dataDirectory: settings.system?.data_directory || './data',
        autoSave: settings.system?.auto_backup ?? true,
        autoBackup: settings.system?.auto_backup ?? false,
        backupInterval: 'daily', // TODO: Add to backend interface
        maxBackups: settings.system?.max_backups || 10,
        theme: 'system', // TODO: Add to backend interface
        language: 'en', // TODO: Add to backend interface
        logLevel: settings.system?.log_level || 'info',

        // Server settings
        mcpServerEnabled: settings.server?.mcp_server_enabled ?? true,
        mcpServerPort: settings.server?.mcp_server_port || 3000,
        maxConnections: settings.server?.max_connections || 100,

        // KB settings
        chunkSize: settings.kb?.chunk_size || 512,
        searchTopK: settings.kb?.search_top_k || 10,
        enableHybridSearch: settings.kb?.enable_hybrid_search ?? true,
      }, { emitEvent: false });
    }
  }

  // Directory selection
  async selectDataDirectory() {
    try {
      await this.settingsStore.selectDataDirectory();
      // The store will update the settings and trigger form sync
    } catch (error) {
      console.error('Failed to select data directory:', error);
    }
  }

  // Form methods
  async saveSettings() {
    if (this.settingsForm.valid) {
      const formValue = this.settingsForm.value;
      const currentSettings = this.settingsStore.settings();

      if (currentSettings) {
        await this.settingsStore.updateSettings({
          ...currentSettings,
          system: {
            ...currentSettings.system,
            // Only update fields that exist in the backend interface
            data_directory: formValue.dataDirectory!,
            auto_backup: formValue.autoBackup!,
            max_backups: formValue.maxBackups!,
            log_level: formValue.logLevel!,
            // TODO: Add these fields to backend interface:
            // workspace_name, backup_interval, theme, language, auto_save
          },
          server: {
            ...currentSettings.server,
            mcp_server_enabled: formValue.mcpServerEnabled!,
            mcp_server_port: formValue.mcpServerPort!,
            max_connections: formValue.maxConnections!,
          },
          kb: {
            ...currentSettings.kb,
            chunk_size: formValue.chunkSize!,
            search_top_k: formValue.searchTopK!,
            enable_hybrid_search: formValue.enableHybridSearch!,
          }
        });
      }
    }
  }

  // Server control methods
  async startServer() {
    try {
      await this.settingsStore.startMcpServer();
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  }

  async stopServer() {
    try {
      await this.settingsStore.stopMcpServer();
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  }

  resetSettings() {
    this.settingsForm.reset({
      workspaceName: 'My RAG Studio Workspace',
      dataDirectory: './data',
      autoSave: true,
      autoBackup: false,
      backupInterval: 'daily',
      maxBackups: 10,
      theme: 'system',
      language: 'en',
      logLevel: 'info',

      // Server settings
      mcpServerEnabled: true,
      mcpServerPort: 3000,
      maxConnections: 100,

      // KB settings
      chunkSize: 512,
      searchTopK: 10,
      enableHybridSearch: true,
    });
  }
}