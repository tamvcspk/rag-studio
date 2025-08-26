import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-progress.html',
  styleUrl: './rag-progress.scss'
})
export class RagProgress {
  // Modern Angular 20: Use input() with proper typing
  readonly value = input(0);
  readonly max = input(100);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly color = input<'blue' | 'green' | 'amber' | 'red'>('blue');
  readonly indeterminate = input(false);

  // Modern Angular 20: Use computed for derived state
  readonly progressClasses = computed(() => [
    'rt-Progress',
    `rt-size-${this.size()}`,
    `rt-color-${this.color()}`,
    this.indeterminate() ? 'rt-indeterminate' : ''
  ].filter(Boolean).join(' '));

  readonly progressPercentage = computed(() => {
    if (this.indeterminate()) return 0;
    return Math.min(Math.max((this.value() / this.max()) * 100, 0), 100);
  });

  readonly indicatorStyles = computed(() => ({
    width: `${this.progressPercentage()}%`
  }));
}
