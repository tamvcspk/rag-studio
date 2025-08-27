import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../rag-icon/rag-icon';

@Component({
  selector: 'rag-badge',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-badge.html',
  styleUrl: './rag-badge.scss'
})
export class RagBadge {
  // Modern Angular 20: Use input() with proper typing
  readonly variant = input<'solid' | 'soft' | 'outline'>('soft');
  readonly color = input<'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple'>('gray');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly icon = input<string>();
  readonly dot = input(false);

  // Modern Angular 20: Use computed for derived state
  readonly badgeClasses = computed(() => [
    'rt-Badge',
    `rt-variant-${this.variant()}`,
    `rt-color-${this.color()}`,
    `rt-size-${this.size()}`,
    this.dot() ? 'rt-badge-dot' : ''
  ].filter(Boolean).join(' '))
}
