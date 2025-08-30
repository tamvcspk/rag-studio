import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-angular';
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
  readonly icon = input<any>();
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onClose = output<void>();

  // Modern Angular 20: Use computed for derived state
  readonly alertClasses = computed(() => [
    'rt-Alert',
    `rt-variant-${this.variant()}`
  ].join(' '));

  readonly defaultIcon = computed(() => {
    switch (this.variant()) {
      case 'info': return Info;
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return Info;
    }
  });

  readonly displayIcon = computed(() => this.icon() || this.defaultIcon());

  // Icon constants
  readonly XIcon = X;

  handleClose(): void {
    this.onClose.emit();
  }
}
