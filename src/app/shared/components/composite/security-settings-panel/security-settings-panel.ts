import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Shield, Lock, Network, FileText, Eye, ShieldCheck, AlertTriangle, ShieldX } from 'lucide-angular';

import {
  RagButton,
  RagCheckbox,
  RagAlert,
  RagInput,
  RagSelect
} from '../../atomic';
import {
  RagFormField,
  RagSettingsSection
} from '../../semantic';
import { SettingsStore } from '../../../store/settings.store';

interface SecuritySettingsForm {
  // Network security
  airGappedMode: FormControl<boolean>;
  networkPolicy: FormControl<string>;
  allowOutboundConnections: FormControl<boolean>;

  // Data protection
  encryptData: FormControl<boolean>;
  encryptionStrength: FormControl<string>;

  // Audit & logging
  auditLogging: FormControl<boolean>;
  logRetention: FormControl<number>;
  logRedaction: FormControl<boolean>;

  // Citations & compliance
  citationPolicy: FormControl<boolean>;
  requireCitations: FormControl<boolean>;
  permissionLevel: FormControl<string>;
}

@Component({
  selector: 'security-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagButton,
    RagCheckbox,
    RagAlert,
    RagInput,
    RagSelect,
    RagFormField,
    RagSettingsSection
  ],
  templateUrl: './security-settings-panel.html',
  styleUrls: ['./security-settings-panel.scss']
})
export class SecuritySettingsPanel {
  // Dependencies
  readonly settingsStore = inject(SettingsStore);

  // Icons
  readonly ShieldIcon = Shield;
  readonly LockIcon = Lock;
  readonly NetworkIcon = Network;
  readonly FileTextIcon = FileText;
  readonly EyeIcon = Eye;

  // Select options
  readonly networkPolicyOptions = [
    { value: 'strict', label: 'Strict (Minimal connections)' },
    { value: 'moderate', label: 'Moderate (Required connections only)' },
    { value: 'open', label: 'Open (All connections allowed)' }
  ];

  readonly encryptionStrengthOptions = [
    { value: 'aes-128', label: 'AES-128 (Standard)' },
    { value: 'aes-256', label: 'AES-256 (High Security)' },
    { value: 'chacha20', label: 'ChaCha20-Poly1305 (Modern)' }
  ];

  readonly permissionLevelOptions = [
    { value: 'basic', label: 'Basic (Read-only operations)' },
    { value: 'standard', label: 'Standard (Read-write operations)' },
    { value: 'admin', label: 'Admin (Full system access)' }
  ];

  // Form
  readonly settingsForm = new FormGroup<SecuritySettingsForm>({
    // Network security
    airGappedMode: new FormControl(false, { nonNullable: true }),
    networkPolicy: new FormControl('moderate', { nonNullable: true }),
    allowOutboundConnections: new FormControl(false, { nonNullable: true }),

    // Data protection
    encryptData: new FormControl(false, { nonNullable: true }),
    encryptionStrength: new FormControl('aes-256', { nonNullable: true }),

    // Audit & logging
    auditLogging: new FormControl(false, { nonNullable: true }),
    logRetention: new FormControl(30, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(7), Validators.max(365)]
    }),
    logRedaction: new FormControl(true, { nonNullable: true }),

    // Citations & compliance
    citationPolicy: new FormControl(true, { nonNullable: true }),
    requireCitations: new FormControl(true, { nonNullable: true }),
    permissionLevel: new FormControl('standard', { nonNullable: true }),
  });

  // State
  private readonly isInitialized = signal(false);

  // Computed values
  readonly networkMode = computed(() => {
    const airGapped = this.settingsForm.value.airGappedMode;
    const policy = this.settingsForm.value.networkPolicy;
    return airGapped ? 'Air-gapped' : `Network (${policy})`;
  });

  readonly encryptionStatus = computed(() => {
    const enabled = this.settingsForm.value.encryptData;
    const strength = this.settingsForm.value.encryptionStrength;
    return enabled ? `Enabled (${strength?.toUpperCase()})` : 'Disabled';
  });

  readonly auditStatus = computed(() => {
    const enabled = this.settingsForm.value.auditLogging;
    const retention = this.settingsForm.value.logRetention;
    return enabled ? `Enabled (${retention}d retention)` : 'Disabled';
  });

  readonly securityStatusVariant = computed(() => {
    const airGapped = this.settingsForm.value.airGappedMode;
    const encrypted = this.settingsForm.value.encryptData;

    if (airGapped && encrypted) return 'success';
    if (airGapped || encrypted) return 'warning';
    return 'error';
  });

  readonly securityStatusIcon = computed(() => {
    const variant = this.securityStatusVariant();
    return variant === 'success' ? ShieldCheck :
           variant === 'warning' ? AlertTriangle : ShieldX;
  });

  readonly securityStatusMessage = computed(() => {
    const airGapped = this.settingsForm.value.airGappedMode;
    const encrypted = this.settingsForm.value.encryptData;

    if (airGapped && encrypted) {
      return 'Security Status: High - Air-gapped mode with encryption enabled';
    }
    if (airGapped) {
      return 'Security Status: Medium - Air-gapped mode enabled, consider enabling encryption';
    }
    if (encrypted) {
      return 'Security Status: Medium - Encryption enabled, consider air-gapped mode for maximum security';
    }
    return 'Security Status: Low - Consider enabling air-gapped mode and encryption';
  });

  readonly isEncryptionEnabled = computed(() => {
    const settings = this.settingsStore.settings();
    return settings?.security?.encrypt_data ?? false;
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
        airGappedMode: settings.security?.air_gapped_mode ?? false,
        networkPolicy: settings.security?.network_policy || 'moderate',
        allowOutboundConnections: false, // TODO: Add to backend interface
        encryptData: settings.security?.encrypt_data ?? false,
        encryptionStrength: 'aes-256', // TODO: Add to backend interface
        auditLogging: settings.security?.audit_logging ?? false,
        logRetention: 30, // TODO: Add to backend interface
        logRedaction: settings.security?.log_redaction ?? true,
        citationPolicy: settings.security?.citation_policy ?? true,
        requireCitations: true, // TODO: Add to backend interface
        permissionLevel: settings.security?.permission_level || 'standard',
      }, { emitEvent: false });
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
          security: {
            ...currentSettings.security,
            // Only update fields that exist in the backend interface
            air_gapped_mode: formValue.airGappedMode!,
            network_policy: formValue.networkPolicy!,
            encrypt_data: formValue.encryptData!,
            audit_logging: formValue.auditLogging!,
            log_redaction: formValue.logRedaction!,
            citation_policy: formValue.citationPolicy!,
            permission_level: formValue.permissionLevel!,
            // TODO: Add these fields to backend interface:
            // allow_outbound_connections, encryption_strength, log_retention, require_citations
          }
        });
      }
    }
  }

  resetSettings() {
    this.settingsForm.reset({
      airGappedMode: false,
      networkPolicy: 'moderate',
      allowOutboundConnections: false,
      encryptData: false,
      encryptionStrength: 'aes-256',
      auditLogging: false,
      logRetention: 30,
      logRedaction: true,
      citationPolicy: true,
      requireCitations: true,
      permissionLevel: 'standard',
    });
  }
}