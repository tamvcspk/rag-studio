import { Component, input, HostListener, ElementRef, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-tooltip.html',
  styleUrl: './rag-tooltip.scss'
})
export class RagTooltip implements OnDestroy {
  // Modern Angular 20: Use input() with proper typing
  readonly content = input('');
  readonly placement = input<'top' | 'bottom' | 'left' | 'right'>('top');
  readonly delay = input(500);
  readonly disabled = input(false);

  // Modern Angular 20: Use signals for reactive state
  private readonly isVisibleSignal = signal(false);
  private showTimeout?: number;
  private hideTimeout?: number;

  get isVisible(): boolean {
    return this.isVisibleSignal();
  }

  set isVisible(value: boolean) {
    this.isVisibleSignal.set(value);
  }

  constructor(private elementRef: ElementRef) {}

  // Modern Angular 20: Use computed for derived state
  readonly tooltipClasses = computed(() => [
    'rt-Tooltip',
    `rt-placement-${this.placement()}`,
    this.isVisible ? 'rt-visible' : ''
  ].filter(Boolean).join(' '));

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.disabled() || !this.content()) return;
    
    this.clearTimeouts();
    this.showTimeout = window.setTimeout(() => {
      this.isVisible = true;
    }, this.delay());
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.clearTimeouts();
    this.hideTimeout = window.setTimeout(() => {
      this.isVisible = false;
    }, 100);
  }

  @HostListener('focus')
  onFocus(): void {
    if (this.disabled() || !this.content()) return;
    this.isVisible = true;
  }

  @HostListener('blur')
  onBlur(): void {
    this.isVisible = false;
  }

  private clearTimeouts(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = undefined;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }
  }

  ngOnDestroy(): void {
    this.clearTimeouts();
  }
}
