import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Settings, FolderOpen, Palette, Globe } from 'lucide-angular';

import {
  RagButton,
  RagCheckbox,
  RagAlert
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
}

@Component({
  selector: 'rag-general-settings-panel',
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
  templateUrl: './general-settings-panel.html',
  styleUrls: ['./general-settings-panel.scss']
})
export class RagGeneralSettingsPanel {
  // Dependencies
  readonly settingsStore = inject(SettingsStore);

  // Icons
  readonly SettingsIcon = Settings;
  readonly FolderOpenIcon = FolderOpen;
  readonly PaletteIcon = Palette;
  readonly GlobeIcon = Globe;

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
  });

  // State
  private readonly isInitialized = signal(false);

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
        workspaceName: 'My RAG Studio Workspace', // TODO: Add to backend interface
        dataDirectory: settings.system?.data_directory || './data',
        autoSave: settings.system?.auto_backup ?? true,
        autoBackup: settings.system?.auto_backup ?? false,
        backupInterval: 'daily', // TODO: Add to backend interface
        maxBackups: settings.system?.max_backups || 10,
        theme: 'system', // TODO: Add to backend interface
        language: 'en', // TODO: Add to backend interface
        logLevel: settings.system?.log_level || 'info',
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
          }
        });
      }
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
    });
  }
}