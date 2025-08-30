import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Circle, Loader, CheckCircle, XCircle, AlertTriangle } from 'lucide-angular';
import { RagIcon } from '../../primitives';

@Component({
  selector: 'rag-status-indicator',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-status-indicator.html',
  styleUrl: './rag-status-indicator.scss'
})
export class RagStatusIndicator {
  // Modern Angular 20: Use input() with proper typing
  readonly status = input<'idle' | 'loading' | 'success' | 'error' | 'warning'>('idle');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly showIcon = input(true);
  readonly showLabel = input(false);
  readonly label = input<string>();
  readonly pulse = input(false); // For animated loading states
  
  // Modern Angular 20: Use computed for derived state
  readonly statusClasses = computed(() => [
    'rt-StatusIndicator',
    `rt-status-${this.status()}`,
    `rt-size-${this.size()}`,
    this.pulse() ? 'rt-pulse' : ''
  ].filter(Boolean).join(' '));

  readonly statusIcon = computed(() => {
    switch (this.status()) {
      case 'idle': return Circle;
      case 'loading': return Loader;
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      default: return Circle;
    }
  });

  readonly statusLabel = computed(() => {
    if (this.label()) {
      return this.label();
    }
    
    switch (this.status()) {
      case 'idle': return 'Ready';
      case 'loading': return 'Loading...';
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      default: return 'Unknown';
    }
  });

  readonly ariaLabel = computed(() => 
    `Status: ${this.statusLabel()}`
  );
}
