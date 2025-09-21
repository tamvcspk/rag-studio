import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Settings as SettingsIcon, Shield, Code, Database, Info } from 'lucide-angular';

import {
  RagTabs,
  RagTabPanelDirective
} from '../../shared/components/semantic/navigation/rag-tabs/rag-tabs';
import {
  RagSimpleSettingsPanel,
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
import { SettingsStore } from '../../shared/store/settings.store';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RagTabs,
    RagTabPanelDirective,
    RagSimpleSettingsPanel,
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
  // Dependencies
  readonly settingsStore = inject(SettingsStore);

  // Icon constants
  readonly SettingsIcon = SettingsIcon;
  readonly ShieldIcon = Shield;
  readonly CodeIcon = Code;
  readonly DatabaseIcon = Database;
  readonly InfoIcon = Info;

  // Modern Angular 20: Use signals for reactive state
  private readonly selectedTabIndex = signal<number>(0);

  // Computed values
  readonly currentTabIndex = computed(() => this.selectedTabIndex());

  // App info
  readonly appVersion = computed(() => '1.0.0-beta');
  readonly platform = computed(() => 'Windows 11');
  readonly dataDirectory = computed(() => this.settingsStore.settings()?.system?.data_directory || './data');
  readonly uptime = computed(() => '2h 15m');

  constructor() {
    // Initialize settings store when component loads
    this.initializeSettings();
  }

  private async initializeSettings() {
    if (!this.settingsStore.isInitialized()) {
      await this.settingsStore.initialize();
    }
  }

  onTabIndexChange(index: number): void {
    this.selectedTabIndex.set(index);
  }
}
