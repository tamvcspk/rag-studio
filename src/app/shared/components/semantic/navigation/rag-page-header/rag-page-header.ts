import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';
import { RagButton } from '../../../atomic/primitives/rag-button/rag-button';

export interface PageHeaderAction {
  label: string;
  icon?: any; // Lucide icon component
  variant?: 'solid' | 'outline' | 'ghost' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  action: () => void;
}

@Component({
  selector: 'rag-page-header',
  standalone: true,
  imports: [CommonModule, RagIcon, RagButton],
  templateUrl: './rag-page-header.html',
  styleUrl: './rag-page-header.scss'
})
export class RagPageHeader {
  // Page header properties
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly icon = input<any>(); // Lucide icon component
  readonly actions = input<PageHeaderAction[]>([]);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  // Events
  readonly actionClick = output<PageHeaderAction>();

  // Computed classes for styling
  readonly headerClasses = computed(() => [
    'rag-page-header',
    `rag-page-header--${this.size()}`
  ].filter(Boolean).join(' '));

  readonly titleClasses = computed(() => [
    'rag-page-header__title',
    `rag-page-header__title--${this.size()}`
  ].filter(Boolean).join(' '));

  onActionClick(action: PageHeaderAction): void {
    if (!action.disabled && !action.loading) {
      this.actionClick.emit(action);
      action.action();
    }
  }
}
