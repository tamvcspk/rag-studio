import { Component, input, output, signal, computed, ElementRef, AfterViewInit, OnDestroy, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../rag-icon/rag-icon';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-angular';

@Component({
  selector: 'rag-overflow-bar',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-overflow-bar.html',
  styleUrl: './rag-overflow-bar.scss'
})
export class RagOverflowBar implements AfterViewInit, OnDestroy {
  // Icon imports for template usage
  readonly ChevronLeftIcon = ChevronLeftIcon;
  readonly ChevronRightIcon = ChevronRightIcon;
  
  // Modern Angular 20: Use input() with proper typing
  readonly scrollAmount = input<number>(200);
  readonly hideButtons = input(false);
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onNavigate = output<'left' | 'right'>();

  // Modern Angular 20: Use viewChild() for template references
  readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  
  // Internal signals for state
  private readonly canScrollLeft = signal(false);
  private readonly canScrollRight = signal(false);
  private readonly isHovered = signal(false);
  
  // ResizeObserver for monitoring container width changes
  private resizeObserver?: ResizeObserver;
  
  // Modern Angular 20: Use computed for derived state
  readonly showLeftButton = computed(() => 
    !this.hideButtons() && this.isHovered() && this.canScrollLeft()
  );
  
  readonly showRightButton = computed(() => 
    !this.hideButtons() && this.isHovered() && this.canScrollRight()
  );

  ngAfterViewInit(): void {
    this.updateScrollButtons();
    this.setupResizeObserver();
  }

  onMouseEnter(): void {
    this.isHovered.set(true);
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
  }

  onScroll(): void {
    this.updateScrollButtons();
  }

  scrollLeft(): void {
    const container = this.scrollContainer()?.nativeElement;
    if (container) {
      container.scrollBy({
        left: -this.scrollAmount(),
        behavior: 'smooth'
      });
      this.onNavigate.emit('left');
    }
  }

  scrollRight(): void {
    const container = this.scrollContainer()?.nativeElement;
    if (container) {
      container.scrollBy({
        left: this.scrollAmount(),
        behavior: 'smooth'
      });
      this.onNavigate.emit('right');
    }
  }

  private updateScrollButtons(): void {
    const container = this.scrollContainer()?.nativeElement;
    if (container) {
      this.canScrollLeft.set(container.scrollLeft > 0);
      this.canScrollRight.set(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }
  }

  private setupResizeObserver(): void {
    const container = this.scrollContainer()?.nativeElement;
    if (container && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateScrollButtons();
      });
      this.resizeObserver.observe(container);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
  }
}