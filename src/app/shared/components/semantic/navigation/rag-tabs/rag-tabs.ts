import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

export interface TabItem {
  id: string;
  label: string;
  icon?: any; // Icon component, not string
  disabled?: boolean;
}

@Component({
  selector: 'rag-tabs',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-tabs.html',
  styleUrl: './rag-tabs.scss'
})
export class RagTabs {
  readonly tabs = input.required<TabItem[]>();
  readonly activeTab = input<string | null>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly variant = input<'default' | 'pills'>('default');
  readonly disabled = input(false);

  readonly tabChange = output<string>();

  private readonly currentActiveTab = signal<string | null>(null);

  readonly activeTabId = computed(() => {
    return this.activeTab() || this.currentActiveTab() || this.tabs()?.[0]?.id || null;
  });

  readonly tabsListClasses = computed(() => [
    'rt-TabsList',
    `rt-size-${this.size()}`,
    `rt-variant-${this.variant()}`,
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  onTabClick(tabId: string): void {
    if (this.disabled()) return;
    
    const tab = this.tabs().find(t => t.id === tabId);
    if (tab?.disabled) return;

    this.currentActiveTab.set(tabId);
    this.tabChange.emit(tabId);
  }

  isTabActive(tabId: string): boolean {
    return this.activeTabId() === tabId;
  }

  getTabClasses(tab: TabItem): string {
    return [
      'rt-TabsTrigger',
      this.isTabActive(tab.id) ? 'rt-active' : '',
      tab.disabled ? 'rt-disabled' : ''
    ].filter(Boolean).join(' ');
  }
}
