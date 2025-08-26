import { Component, input, output, computed, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../rag-icon/rag-icon';
import { RagButton } from '../rag-button/rag-button';

export interface RagToastAction {
  label: string;
  handler: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
}

@Component({
  selector: 'rag-toast',
  standalone: true,
  imports: [CommonModule, RagIcon, RagButton],
  templateUrl: './rag-toast.html',
  styleUrl: './rag-toast.scss'
})
export class RagToast implements OnInit, OnDestroy {
  // Modern Angular 20: Use input() with proper typing
  readonly variant = input<'info' | 'success' | 'warning' | 'error'>('info');
  readonly title = input<string>();
  readonly message = input<string>();
  readonly duration = input(5000); // Auto-dismiss after 5 seconds
  readonly persistent = input(false); // If true, won't auto-dismiss
  readonly dismissible = input(true); // Show close button
  readonly icon = input<string>();
  readonly actions = input<RagToastAction[]>([]);
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onDismiss = output<void>();
  readonly onAction = output<string>();

  // Modern Angular 20: Use signals for reactive state
  private readonly isVisibleSignal = signal(true);
  private readonly isExitingSignal = signal(false);
  private dismissTimer?: number;

  get isVisible(): boolean {
    return this.isVisibleSignal();
  }

  get isExiting(): boolean {
    return this.isExitingSignal();
  }

  // Modern Angular 20: Use computed for derived state
  readonly toastClasses = computed(() => [
    'rt-Toast',
    `rt-variant-${this.variant()}`,
    this.isExiting ? 'rt-exiting' : '',
    !this.isVisible ? 'rt-hidden' : ''
  ].filter(Boolean).join(' '));

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

  ngOnInit(): void {
    if (!this.persistent() && this.duration() > 0) {
      this.startDismissTimer();
    }
  }

  ngOnDestroy(): void {
    this.clearDismissTimer();
  }

  dismiss(): void {
    this.isExitingSignal.set(true);
    // Wait for exit animation to complete
    setTimeout(() => {
      this.isVisibleSignal.set(false);
      this.onDismiss.emit();
    }, 300);
  }

  handleAction(action: RagToastAction): void {
    this.onAction.emit(action.label);
    action.handler();
  }

  private startDismissTimer(): void {
    this.dismissTimer = window.setTimeout(() => {
      this.dismiss();
    }, this.duration());
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }
  }

  // Pause auto-dismiss on hover
  onMouseEnter(): void {
    this.clearDismissTimer();
  }

  // Resume auto-dismiss on mouse leave
  onMouseLeave(): void {
    if (!this.persistent() && this.duration() > 0) {
      this.startDismissTimer();
    }
  }
}
