import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
  disabled?: boolean;
  current?: boolean;
}

@Component({
  selector: 'rag-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './rag-breadcrumb.html',
  styleUrl: './rag-breadcrumb.scss'
})
export class RagBreadcrumbComponent {
  readonly items = input.required<BreadcrumbItem[]>();
  readonly separator = input<string>('chevron-right');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly maxItems = input<number | null>(null);
  readonly showHome = input(true);
  readonly homeIcon = input<string>('house');
  readonly homeLabel = input<string>('Home');
  readonly homeUrl = input<string>('/');

  readonly itemClick = output<BreadcrumbItem>();

  readonly displayItems = computed(() => {
    let allItems = [...this.items()];
    
    // Add home item if enabled
    if (this.showHome()) {
      const homeItem: BreadcrumbItem = {
        label: this.homeLabel(),
        url: this.homeUrl(),
        icon: this.homeIcon()
      };
      allItems.unshift(homeItem);
    }

    // Truncate items if maxItems is set
    const maxItems = this.maxItems();
    if (maxItems && allItems.length > maxItems) {
      const start = allItems.slice(0, 1); // Keep first item (usually home)
      const end = allItems.slice(-(maxItems - 2)); // Keep last items
      return [...start, { label: '...', disabled: true }, ...end];
    }

    return allItems;
  });

  readonly breadcrumbClasses = computed(() => [
    'rt-Breadcrumb',
    `rt-size-${this.size()}`
  ].filter(Boolean).join(' '));

  onItemClick(item: BreadcrumbItem): void {
    if (!item.disabled && !item.current) {
      this.itemClick.emit(item);
    }
  }

  getItemClasses(item: BreadcrumbItem, isLast: boolean): string {
    return [
      'rt-BreadcrumbItem',
      item.disabled ? 'rt-disabled' : '',
      item.current || isLast ? 'rt-current' : '',
      item.url && !item.disabled && !item.current && !isLast ? 'rt-link' : ''
    ].filter(Boolean).join(' ');
  }
}
