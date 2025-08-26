import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-button.html',
  styleUrl: './rag-button.scss'
})
export class RagButton {
  // Modern Angular 20: Use input() with proper typing
  readonly variant = input<'solid' | 'outline' | 'ghost' | 'soft'>('solid');
  readonly size = input<'1' | '2' | '3'>('2');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly fullWidth = input(false);
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onClick = output<Event>();

  // Modern Angular 20: Use computed for reactive state
  private readonly isInteractionDisabled = computed(() => this.disabled() || this.loading());

  handleClick(event: Event): void {
    if (!this.isInteractionDisabled()) {
      this.onClick.emit(event);
    }
  }

  // Modern Angular 20: Use computed for derived state
  readonly buttonClasses = computed(() => [
    'rt-Button',
    `rt-variant-${this.variant()}`,
    `rt-size-${this.size()}`,
    this.isInteractionDisabled() ? 'rt-disabled' : '',
    this.loading() ? 'rt-loading' : '',
    this.fullWidth() ? 'rt-full-width' : ''
  ].filter(Boolean).join(' '));
}
