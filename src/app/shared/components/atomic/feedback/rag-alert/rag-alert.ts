import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagButton, RagIcon } from '../../primitives';

@Component({
  selector: 'rag-alert',
  standalone: true,
  imports: [CommonModule, RagIcon, RagButton],
  templateUrl: './rag-alert.html',
  styleUrl: './rag-alert.scss'
})
export class RagAlert {
  // Modern Angular 20: Use input() with proper typing
  readonly variant = input<'info' | 'success' | 'warning' | 'error'>('info');
  readonly title = input<string>();
  readonly closable = input(false);
  readonly icon = input<string>();
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onClose = output<void>();

  // Modern Angular 20: Use computed for derived state
  readonly alertClasses = computed(() => [
    'rt-Alert',
    `rt-variant-${this.variant()}`
  ].join(' '));

  readonly defaultIcon = computed(() => {
    switch (this.variant()) {
      case 'info': return 'info';
      case 'success': return 'check-circle';
      case 'warning': return 'alert-triangle';
      case 'error': return 'x-circle';
      default: return 'info';
    }
  });

  readonly displayIcon = computed(() => this.icon() || this.defaultIcon());

  handleClose(): void {
    this.onClose.emit();
  }
}
