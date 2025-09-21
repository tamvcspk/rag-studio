import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Settings, Server, Database, Shield } from 'lucide-angular';

import {
  RagButton,
  RagCheckbox,
  RagAlert
} from '../../../atomic';
import {
  RagFormField,
  RagSettingsSection
} from '../../../semantic';
import { SettingsStore } from '../../../../store/settings.store';

interface SettingsForm {
  // Server settings
  mcpServerEnabled: FormControl<boolean>;
  mcpServerPort: FormControl<number>;
  maxConnections: FormControl<number>;

  // KB settings
  chunkSize: FormControl<number>;
  searchTopK: FormControl<number>;
  enableHybridSearch: FormControl<boolean>;

  // System settings
  storageQuotaGb: FormControl<number>;
  autoBackup: FormControl<boolean>;

  // Security settings
  airGappedMode: FormControl<boolean>;
  encryptData: FormControl<boolean>;
}

@Component({
  selector: 'rag-simple-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagButton,
    RagCheckbox,
    RagAlert,
    RagFormField,
    RagSettingsSection
  ],
  template: `
    <div class="simple-settings-panel">
      @if (settingsStore.error()) {
        <rag-alert variant="error" [icon]="'alert-circle'">
          {{ settingsStore.error() }}
        </rag-alert>
      }

      <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()" class="settings-form">

        <!-- Server Settings Section -->
        <rag-settings-section
          title="Server Settings"
          description="Configure MCP server and connection settings"
          [icon]="ServerIcon">

          <div class="server-status" slot="header-actions">
            Status: {{ serverStatus() }}
          </div>

          <div class="form-grid">
            <rag-form-field label="Enable MCP Server">
              <rag-checkbox formControlName="mcpServerEnabled">
                Start server automatically
              </rag-checkbox>
            </rag-form-field>

            <rag-form-field label="Server Port">
              <input
                type="number"
                formControlName="mcpServerPort"
                [disabled]="settingsStore.isLoading()"
                min="1024"
                max="65535"
                class="form-input" />
            </rag-form-field>

            <rag-form-field label="Max Connections">
              <input
                type="number"
                formControlName="maxConnections"
                [disabled]="settingsStore.isLoading()"
                min="1"
                max="1000"
                class="form-input" />
            </rag-form-field>
          </div>

          <div class="section-actions">
            @if (isServerRunning()) {
              <rag-button
                variant="outline"
                color="red"
                [loading]="settingsStore.isLoading()"
                (click)="stopServer()">
                Stop Server
              </rag-button>
            } @else {
              <rag-button
                variant="solid"
                color="green"
                [loading]="settingsStore.isLoading()"
                (click)="startServer()">
                Start Server
              </rag-button>
            }
          </div>
        </rag-settings-section>

        <!-- Knowledge Base Settings Section -->
        <rag-settings-section
          title="Knowledge Base Settings"
          description="Configure embedding models, chunk size, and search parameters"
          [icon]="DatabaseIcon">

          <div class="form-grid">
            <rag-form-field label="Chunk Size (tokens)">
              <input
                type="number"
                formControlName="chunkSize"
                [disabled]="settingsStore.isLoading()"
                min="128"
                max="2048"
                class="form-input" />
            </rag-form-field>

            <rag-form-field label="Search Top-K Results">
              <input
                type="number"
                formControlName="searchTopK"
                [disabled]="settingsStore.isLoading()"
                min="1"
                max="50"
                class="form-input" />
            </rag-form-field>

            <rag-form-field label="Search Options">
              <rag-checkbox formControlName="enableHybridSearch">
                Enable hybrid search (Vector + BM25)
              </rag-checkbox>
            </rag-form-field>
          </div>
        </rag-settings-section>

        <!-- System Settings Section -->
        <rag-settings-section
          title="System Settings"
          description="Configure storage quotas, cache settings, and logging"
          [icon]="SettingsIcon">

          <div class="form-grid">
            <rag-form-field label="Storage Quota (GB)">
              <input
                type="number"
                formControlName="storageQuotaGb"
                [disabled]="settingsStore.isLoading()"
                min="1"
                max="50"
                class="form-input" />
            </rag-form-field>

            <rag-form-field label="Backup Options">
              <rag-checkbox formControlName="autoBackup">
                Enable automatic backups
              </rag-checkbox>
            </rag-form-field>
          </div>
        </rag-settings-section>

        <!-- Security Settings Section -->
        <rag-settings-section
          title="Security Settings"
          description="Configure air-gapped mode and data protection settings"
          [icon]="ShieldIcon">

          <div class="security-status" slot="header-actions">
            Mode: {{ securityMode() }}
          </div>

          <div class="form-grid">
            <rag-form-field label="Network Security">
              <rag-checkbox formControlName="airGappedMode">
                Enable air-gapped mode (requires restart)
              </rag-checkbox>
            </rag-form-field>

            <rag-form-field label="Data Protection">
              <rag-checkbox formControlName="encryptData">
                Encrypt data at rest
              </rag-checkbox>
            </rag-form-field>
          </div>

          @if (settingsForm.value.airGappedMode) {
            <rag-alert variant="warning" [icon]="'alert-triangle'">
              Air-gapped mode will be enabled after application restart
            </rag-alert>
          }
        </rag-settings-section>

        <!-- Form Actions -->
        <div class="form-actions">
          <rag-button
            type="button"
            variant="outline"
            (click)="resetSettings()"
            [disabled]="settingsStore.isLoading()">
            Reset to Defaults
          </rag-button>

          <rag-button
            type="submit"
            variant="solid"
            [loading]="settingsStore.isLoading()"
            [disabled]="settingsForm.invalid">
            Save All Settings
          </rag-button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./simple-settings-panel.scss']
})
export class RagSimpleSettingsPanel {
  // Dependencies
  readonly settingsStore = inject(SettingsStore);

  // Icons
  readonly SettingsIcon = Settings;
  readonly ServerIcon = Server;
  readonly DatabaseIcon = Database;
  readonly ShieldIcon = Shield;

  // Form
  readonly settingsForm = new FormGroup<SettingsForm>({
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

    // System settings
    storageQuotaGb: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(50)]
    }),
    autoBackup: new FormControl(false, { nonNullable: true }),

    // Security settings
    airGappedMode: new FormControl(false, { nonNullable: true }),
    encryptData: new FormControl(false, { nonNullable: true }),
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

  readonly securityMode = computed(() => {
    const airGapped = this.settingsForm.value.airGappedMode;
    return airGapped ? 'Air-gapped' : 'Network Enabled';
  });

  constructor() {
    // Initialize store and sync form when settings change
    this.initializeStore();
    this.syncFormWithSettings();
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
        mcpServerEnabled: settings.server.mcp_server_enabled,
        mcpServerPort: settings.server.mcp_server_port,
        maxConnections: settings.server.max_connections,
        chunkSize: settings.kb.chunk_size,
        searchTopK: settings.kb.search_top_k,
        enableHybridSearch: settings.kb.enable_hybrid_search,
        storageQuotaGb: settings.system.storage_quota_gb,
        autoBackup: settings.system.auto_backup,
        airGappedMode: settings.security.air_gapped_mode,
        encryptData: settings.security.encrypt_data,
      }, { emitEvent: false });
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

  // Form methods
  async saveSettings() {
    if (this.settingsForm.valid) {
      const formValue = this.settingsForm.value;
      const currentSettings = this.settingsStore.settings();

      if (currentSettings) {
        await this.settingsStore.updateSettings({
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
          },
          system: {
            ...currentSettings.system,
            storage_quota_gb: formValue.storageQuotaGb!,
            auto_backup: formValue.autoBackup!,
          },
          security: {
            ...currentSettings.security,
            air_gapped_mode: formValue.airGappedMode!,
            encrypt_data: formValue.encryptData!,
          }
        });
      }
    }
  }

  resetSettings() {
    this.settingsForm.reset({
      mcpServerEnabled: true,
      mcpServerPort: 3000,
      maxConnections: 100,
      chunkSize: 512,
      searchTopK: 10,
      enableHybridSearch: true,
      storageQuotaGb: 5,
      autoBackup: false,
      airGappedMode: false,
      encryptData: false,
    });
  }
}