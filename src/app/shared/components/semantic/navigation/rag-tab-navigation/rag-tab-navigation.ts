import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

export interface TabNavItem {
  id: string;
  label: string;
  icon?: any; // Accept any icon component
  disabled?: boolean;
  routerLink?: string;
  exact?: boolean; // For exact route matching
}

@Component({
  selector: 'rag-tab-navigation',
  imports: [CommonModule, RouterModule, RagIcon],
  templateUrl: './rag-tab-navigation.html',
  styleUrl: './rag-tab-navigation.scss'
})
export class RagTabNavigation {
  readonly items = input.required<TabNavItem[]>();
  readonly activeItem = input<string | null>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly variant = input<'default' | 'pills' | 'nav'>('nav');
  readonly disabled = input(false);

  // Navigation-specific outputs
  readonly itemChange = output<TabNavItem>();
  readonly indexChange = output<number>();

  private readonly currentActiveItem = signal<string | null>(null);

  readonly activeItemId = computed(() => {
    return this.activeItem() || this.currentActiveItem() || this.items()?.[0]?.id || null;
  });

  readonly navListClasses = computed(() => [
    'rt-TabNavList',
    `rt-size-${this.size()}`,
    `rt-variant-${this.variant()}`,
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  onItemClick(item: TabNavItem, index: number): void {
    if (this.disabled() || item.disabled) return;

    this.currentActiveItem.set(item.id);
    this.itemChange.emit(item);
    this.indexChange.emit(index);
  }

  isItemActive(itemId: string): boolean {
    return this.activeItemId() === itemId;
  }

  getItemClasses(item: TabNavItem): string {
    return [
      'rt-TabNavItem',
      this.isItemActive(item.id) ? 'rt-active' : '',
      item.disabled ? 'rt-disabled' : ''
    ].filter(Boolean).join(' ');
  }

  trackByItem(index: number, item: TabNavItem): string {
    return item.id;
  }
}
