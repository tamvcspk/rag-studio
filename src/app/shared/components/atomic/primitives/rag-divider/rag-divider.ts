import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type RagDividerOrientation = 'horizontal' | 'vertical';
export type RagDividerVariant = 'solid' | 'dashed' | 'dotted';

@Component({
  selector: 'rag-divider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-divider.html',
  styleUrls: ['./rag-divider.scss']
})
export class RagDivider {
  // Modern Angular 20: Use input() with proper typing
  readonly orientation = input<RagDividerOrientation>('horizontal');
  readonly variant = input<RagDividerVariant>('solid');
  readonly label = input<string>();
  readonly spacing = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');

  // Modern Angular 20: Use computed for derived state
  readonly dividerClasses = computed(() => [
    'rag-divider',
    `rag-divider--${this.orientation()}`,
    `rag-divider--${this.variant()}`,
    `rag-divider--spacing-${this.spacing()}`,
    this.label() ? 'rag-divider--with-label' : ''
  ].filter(Boolean).join(' '));
}