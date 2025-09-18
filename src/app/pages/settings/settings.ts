import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Settings as SettingsIcon, Shield, Zap, Code, Database, Info } from 'lucide-angular';

import { 
  RagTabs, 
  RagTabPanelDirective 
} from '../../shared/components/semantic/navigation/rag-tabs/rag-tabs';
import { 
  RagGeneralSettingsPanel,
  RagSecuritySettingsPanel,
  EmptyStatePanel
} from '../../shared/components/composite';
import { 
  RagButton,
  RagIcon 
} from '../../shared/components/atomic/primitives';
import { RagCard } from '../../shared/components/semantic/data-display';
import { RagPageHeader } from '../../shared/components/semantic/navigation';

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
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RagTabs,
    RagTabPanelDirective,
    RagGeneralSettingsPanel,
    RagSecuritySettingsPanel,
    EmptyStatePanel,
    RagButton,
    RagIcon,
    RagCard,
    RagPageHeader
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings {
  // Icon constants
  readonly SettingsIcon = SettingsIcon;
  readonly ShieldIcon = Shield;
  readonly ZapIcon = Zap;
  readonly CodeIcon = Code;
  readonly DatabaseIcon = Database;
  readonly InfoIcon = Info;

  // Modern Angular 20: Use signals for reactive state
  private readonly selectedTabIndex = signal<number>(0);
  
  // Settings state
  private readonly generalSettingsSignal = signal<GeneralSettings>({
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

  private readonly securitySettingsSignal = signal<SecuritySettings>({
    airGappedMode: false,
    networkPolicy: 'default-deny',
    encryptData: false,
    logRetention: 30,
    logRedaction: true,
    citationPolicy: true,
    permissionLevel: 'restricted',
    auditLogging: true
  });

  // Computed values
  readonly currentTabIndex = computed(() => this.selectedTabIndex());
  readonly generalSettings = computed(() => this.generalSettingsSignal());
  readonly securitySettings = computed(() => this.securitySettingsSignal());

  // App info
  readonly appVersion = computed(() => '1.0.0-beta');
  readonly platform = computed(() => 'Windows 11');
  readonly dataDirectory = computed(() => this.generalSettings().dataDirectory);
  readonly uptime = computed(() => '2h 15m');

  onTabIndexChange(index: number): void {
    this.selectedTabIndex.set(index);
  }

  onGeneralSettingsChange(settings: GeneralSettings): void {
    this.generalSettingsSignal.set(settings);
    console.log('General settings updated:', settings);
    // TODO: Save to backend
  }

  onSecuritySettingsChange(settings: SecuritySettings): void {
    this.securitySettingsSignal.set(settings);
    console.log('Security settings updated:', settings);
    // TODO: Save to backend
  }

  selectDataDirectory(): void {
    // TODO: Open directory selector
    console.log('Opening directory selector...');
  }
}
