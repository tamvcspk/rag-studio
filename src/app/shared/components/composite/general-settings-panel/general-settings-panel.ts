import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Settings, Globe, FolderOpen, HardDrive } from 'lucide-angular';

import { 
  RagSettingsSection,
  RagSettingsItem
} from '../../semantic/forms';
import { 
  RagInput,
  RagSelect,
  RagSelectOption,
  RagSwitch,
  RagToggleGroup,
  RagToggleGroupOption,
  RagButton,
  RagIcon
} from '../../atomic/primitives';

interface GeneralSettings {
  workspaceName: string;
  dataDirectory: string;
  autoSave: boolean;
  autoBackup: boolean;
  backupInterval: string;
  maxBackups: number;
  logLevel: string;
  theme: string;
  language: string;
}

@Component({
  selector: 'rag-general-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagSettingsSection,
    RagSettingsItem,
    RagInput,
    RagSelect,
    RagSwitch,
    RagToggleGroup,
    RagButton,
    RagIcon
  ],
  templateUrl: './general-settings-panel.html',
  styleUrl: './general-settings-panel.scss'
})
export class RagGeneralSettingsPanel {
  // Icon constants
  readonly SettingsIcon = Settings;
  readonly GlobeIcon = Globe;
  readonly FolderOpenIcon = FolderOpen;
  readonly HardDriveIcon = HardDrive;

  // Modern Angular 20: Use input() with proper typing
  readonly settings = input<Partial<GeneralSettings>>();

  // Modern Angular 20: Use output() instead of EventEmitter
  readonly settingsChange = output<GeneralSettings>();
  readonly directorySelect = output<void>();

  // Modern Angular 20: Use signals for reactive state
  readonly isSaving = signal(false);

  // Form management
  readonly settingsForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.settingsForm = this.fb.group({
      workspaceName: ['RAG Studio'],
      dataDirectory: ['./data'],
      autoSave: [true],
      autoBackup: [false],
      backupInterval: ['daily'],
      maxBackups: [7],
      logLevel: ['info'],
      theme: ['light'],
      language: ['en']
    });

    // Watch for input changes and patch form
    this.settingsForm.patchValue(this.settings() || {});
  }

  // Dropdown options
  readonly backupIntervalOptions = computed<RagSelectOption<string>[]>(() => [
    { value: 'hourly', label: 'Every Hour' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ]);

  readonly themeOptions = computed<RagToggleGroupOption<string>[]>(() => [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ]);

  readonly languageOptions = computed<RagSelectOption<string>[]>(() => [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '中文' }
  ]);

  readonly logLevelOptions = computed<RagSelectOption<string>[]>(() => [
    { value: 'error', label: 'Error Only' },
    { value: 'warn', label: 'Warnings' },
    { value: 'info', label: 'Info' },
    { value: 'debug', label: 'Debug' },
    { value: 'trace', label: 'Trace' }
  ]);

  isFieldInvalid(fieldName: string): boolean {
    const field = this.settingsForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  async onSave(): Promise<void> {
    if (!this.settingsForm.valid) return;

    this.isSaving.set(true);
    
    try {
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const formValue = this.settingsForm.value as GeneralSettings;
      this.settingsChange.emit(formValue);
    } finally {
      this.isSaving.set(false);
    }
  }

  onReset(): void {
    this.settingsForm.reset({
      workspaceName: 'RAG Studio',
      dataDirectory: './data',
      autoSave: true,
      autoBackup: false,
      backupInterval: 'daily',
      maxBackups: 7,
      logLevel: 'info',
      theme: 'light',
      language: 'en'
    });
  }

  selectDirectory(): void {
    this.directorySelect.emit();
  }
}