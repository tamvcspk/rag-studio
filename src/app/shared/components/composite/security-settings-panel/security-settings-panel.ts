import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Shield, Lock, Network, Eye, AlertTriangle } from 'lucide-angular';

import { 
  RagSettingsSection,
  RagSettingsItem 
} from '../../semantic/forms';
import { 
  RagSwitch,
  RagSelect,
  RagSelectOption,
  RagButton,
  RagToggleGroup,
  RagToggleGroupOption,
} from '../../atomic/primitives';
import { RagAlert } from '../../atomic/feedback';

interface SecuritySettings {
  airGappedMode: boolean;
  networkPolicy: string;
  encryptData: boolean;
  logRetention: number;
  logRedaction: boolean;
  citationPolicy: boolean;
  permissionLevel: string;
  auditLogging: boolean;
}

@Component({
  selector: 'rag-security-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagSettingsSection,
    RagSettingsItem,
    RagSwitch,
    RagSelect,
    RagButton,
    RagToggleGroup,
    RagAlert
  ],
  templateUrl: './security-settings-panel.html',
  styleUrl: './security-settings-panel.scss'
})
export class RagSecuritySettingsPanel {
  // Icon constants
  readonly ShieldIcon = Shield;
  readonly LockIcon = Lock;
  readonly NetworkIcon = Network;
  readonly EyeIcon = Eye;
  readonly AlertTriangleIcon = AlertTriangle;

  // Modern Angular 20: Use input() with proper typing
  readonly settings = input<Partial<SecuritySettings>>();

  // Modern Angular 20: Use output() instead of EventEmitter
  readonly settingsChange = output<SecuritySettings>();

  // Modern Angular 20: Use signals for reactive state
  readonly isSaving = signal(false);

  // Form management
  readonly securityForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.securityForm = this.fb.group({
      airGappedMode: [false],
      networkPolicy: ['default-deny'],
      encryptData: [false],
      logRetention: [30],
      logRedaction: [true],
      citationPolicy: [true],
      permissionLevel: ['restricted'],
      auditLogging: [true]
    });

    // Watch for input changes and patch form
    this.securityForm.patchValue(this.settings() || {});
  }

  // Dropdown options
  readonly networkPolicyOptions = computed<RagSelectOption<string>[]>(() => [
    { value: 'allow-all', label: 'Allow All Connections' },
    { value: 'default-deny', label: 'Default Deny (Recommended)' },
    { value: 'whitelist-only', label: 'Whitelist Only' },
    { value: 'blocked', label: 'All Blocked' }
  ]);

  readonly permissionLevelOptions = computed<RagToggleGroupOption<string>[]>(() => [
    { value: 'minimal', label: 'Minimal' },
    { value: 'restricted', label: 'Restricted' },
    { value: 'standard', label: 'Standard' }
  ]);

  readonly logRetentionOptions = computed<RagSelectOption<number>[]>(() => [
    { value: 7, label: '7 Days' },
    { value: 14, label: '14 Days' },
    { value: 30, label: '30 Days (Recommended)' },
    { value: 90, label: '90 Days' },
    { value: 365, label: '1 Year' },
    { value: -1, label: 'Never Delete' }
  ]);

  async onSave(): Promise<void> {
    if (!this.securityForm.valid) return;

    this.isSaving.set(true);
    
    try {
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const formValue = this.securityForm.value as SecuritySettings;
      this.settingsChange.emit(formValue);
    } finally {
      this.isSaving.set(false);
    }
  }

  onReset(): void {
    this.securityForm.reset({
      airGappedMode: false,
      networkPolicy: 'default-deny',
      encryptData: false,
      logRetention: 30,
      logRedaction: true,
      citationPolicy: true,
      permissionLevel: 'restricted',
      auditLogging: true
    });
  }
}