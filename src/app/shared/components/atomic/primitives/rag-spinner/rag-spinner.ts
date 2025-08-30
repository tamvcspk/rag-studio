import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-spinner.html',
  styleUrl: './rag-spinner.scss'
})
export class RagSpinner {
  // Modern Angular 20: Use input() with proper typing
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly color = input<string>();

  // Modern Angular 20: Use computed for derived state
  readonly spinnerClasses = computed(() => [
    'rt-Spinner',
    `rt-size-${this.size()}`
  ].join(' '));

  readonly spinnerStyles = computed(() => {
    const color = this.color();
    return color ? { 'border-top-color': color } : {};
  })
}
