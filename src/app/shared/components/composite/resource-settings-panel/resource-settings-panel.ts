import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  HardDrive,
  Database,
  Trash2,
  FolderOpen,
  Archive,
  Clock,
  AlertCircle,
  CheckCircle,
  Settings,
  MemoryStick,
  Cpu
} from 'lucide-angular';

import {
  RagButton,
  RagIcon,
  RagInput,
  RagNumberInput,
  RagSelect,
  RagCheckbox,
  RagAlert
} from '../../atomic';
import {
  RagCard,
  RagFormField,
  RagSettingsSection
} from '../../semantic';
import { SettingsStore } from '../../../store/settings.store';

interface ResourceSettingsForm {
  storageQuotaGb: FormControl<number>;
  cacheSizeMb: FormControl<number>;
  cacheTtlSeconds: FormControl<number>;
  logLevel: FormControl<string>;
  logRetentionDays: FormControl<number>;
  autoBackup: FormControl<boolean>;
  backupIntervalHours: FormControl<number>;
  maxBackups: FormControl<number>;
  dataDirectory: FormControl<string>;
}

@Component({
  selector: 'resource-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagButton,
    RagIcon,
    RagInput,
    RagNumberInput,
    RagSelect,
    RagCheckbox,
    RagAlert,
    RagCard,
    RagFormField,
    RagSettingsSection
  ],
  templateUrl: './resource-settings-panel.html',
  styleUrls: ['./resource-settings-panel.scss']
})
export class ResourceSettingsPanel {
  // Dependencies
  readonly settingsStore = inject(SettingsStore);

  // Icons
  readonly HardDriveIcon = HardDrive;
  readonly DatabaseIcon = Database;
  readonly Trash2Icon = Trash2;
  readonly FolderOpenIcon = FolderOpen;
  readonly ArchiveIcon = Archive;
  readonly ClockIcon = Clock;
  readonly AlertCircleIcon = AlertCircle;
  readonly CheckCircleIcon = CheckCircle;
  readonly SettingsIcon = Settings;
  readonly MemoryStickIcon = MemoryStick;
  readonly CpuIcon = Cpu;

  // Form
  readonly resourceForm = new FormGroup<ResourceSettingsForm>({
    storageQuotaGb: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(50)]
    }),
    cacheSizeMb: new FormControl(256, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(64), Validators.max(2048)]
    }),
    cacheTtlSeconds: new FormControl(3600, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(300), Validators.max(86400)]
    }),
    logLevel: new FormControl('info', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    logRetentionDays: new FormControl(30, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(365)]
    }),
    autoBackup: new FormControl(false, { nonNullable: true }),
    backupIntervalHours: new FormControl(24, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(168)]
    }),
    maxBackups: new FormControl(7, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(30)]
    }),
    dataDirectory: new FormControl('./data', {
      nonNullable: true,
      validators: [Validators.required]
    }),
  });

  // Configuration options
  readonly logLevels = [
    {
      value: 'trace',
      label: 'Trace',
      description: 'Very detailed',
      badge: 'secondary' as const
    },
    {
      value: 'debug',
      label: 'Debug',
      description: 'Detailed info',
      badge: 'secondary' as const
    },
    {
      value: 'info',
      label: 'Info',
      description: 'General info',
      badge: 'success' as const
    },
    {
      value: 'warn',
      label: 'Warn',
      description: 'Warnings only',
      badge: 'warning' as const
    },
    {
      value: 'error',
      label: 'Error',
      description: 'Errors only',
      badge: 'error' as const
    }
  ];

  // State
  private readonly isInitialized = signal(false);

  // Computed values
  readonly systemSettings = computed(() => this.settingsStore.settings()?.system);

  readonly storageStatus = computed(() => {
    const settings = this.systemSettings();
    if (!settings) {
      return {
        variant: 'secondary' as const,
        icon: this.AlertCircleIcon,
        text: 'Not Configured'
      };
    }

    if (settings.auto_backup && settings.storage_quota_gb >= 5) {
      return {
        variant: 'success' as const,
        icon: this.CheckCircleIcon,
        text: 'Optimized'
      };
    }

    return {
      variant: 'warning' as const,
      icon: this.HardDriveIcon,
      text: 'Basic Setup'
    };
  });

  constructor() {
    this.initializeStore();
    this.syncFormWithSettings();

    // Handle form state based on loading status
    effect(() => {
      if (this.settingsStore.isLoading()) {
        this.resourceForm.disable();
      } else {
        this.resourceForm.enable();
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
    const systemSettings = this.systemSettings();

    if (systemSettings && this.isInitialized()) {
      this.resourceForm.patchValue({
        storageQuotaGb: systemSettings.storage_quota_gb,
        cacheSizeMb: systemSettings.cache_size_mb,
        cacheTtlSeconds: systemSettings.cache_ttl_seconds,
        logLevel: systemSettings.log_level,
        logRetentionDays: systemSettings.log_retention_days,
        autoBackup: systemSettings.auto_backup,
        backupIntervalHours: systemSettings.backup_interval_hours,
        maxBackups: systemSettings.max_backups,
        dataDirectory: systemSettings.data_directory,
      }, { emitEvent: false });
    }
  }

  // Actions
  async saveSettings() {
    if (this.resourceForm.valid) {
      const formValue = this.resourceForm.value;
      const currentSettings = this.settingsStore.settings();

      if (currentSettings) {
        await this.settingsStore.updateSettings({
          system: {
            ...currentSettings.system,
            storage_quota_gb: formValue.storageQuotaGb!,
            cache_size_mb: formValue.cacheSizeMb!,
            cache_ttl_seconds: formValue.cacheTtlSeconds!,
            log_level: formValue.logLevel!,
            log_retention_days: formValue.logRetentionDays!,
            auto_backup: formValue.autoBackup!,
            backup_interval_hours: formValue.backupIntervalHours!,
            max_backups: formValue.maxBackups!,
            data_directory: formValue.dataDirectory!,
          }
        });
      }
    }
  }

  async selectDataDirectory() {
    try {
      const selectedPath = await this.settingsStore.selectDataDirectory();
      if (selectedPath) {
        this.resourceForm.patchValue({ dataDirectory: selectedPath });
      }
    } catch (error) {
      console.error('Failed to select data directory:', error);
    }
  }

  async clearCache() {
    try {
      await this.settingsStore.clearCache();
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  resetSettings() {
    this.resourceForm.reset({
      storageQuotaGb: 5,
      cacheSizeMb: 256,
      cacheTtlSeconds: 3600,
      logLevel: 'info',
      logRetentionDays: 30,
      autoBackup: false,
      backupIntervalHours: 24,
      maxBackups: 7,
      dataDirectory: './data',
    });
  }

  hasUnsavedChanges(): boolean {
    return this.resourceForm.dirty;
  }

  // Utility methods
  formatCacheTtl = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours >= 1) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    return `${minutes}m`;
  };
}