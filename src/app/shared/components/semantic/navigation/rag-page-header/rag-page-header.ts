import { Component, input, output, computed, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Overlay, OverlayRef, OverlayConfig } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ViewContainerRef } from '@angular/core';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';
import { RagButton } from '../../../atomic/primitives/rag-button/rag-button';
import { RagSearchInput } from '../../forms/rag-search-input/rag-search-input';
import { MoreHorizontal } from 'lucide-angular';

export interface PageHeaderAction {
  label: string;
  icon?: any; // Lucide icon component
  variant?: 'solid' | 'outline' | 'ghost' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  action: () => void;
}

@Component({
  selector: 'rag-page-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RagIcon, RagButton, RagSearchInput],
  templateUrl: './rag-page-header.html',
  styleUrl: './rag-page-header.scss'
})
export class RagPageHeader implements AfterViewInit, OnDestroy {
  readonly MoreHorizontal = MoreHorizontal;
  
  @ViewChild('headerContent', { static: false }) headerContent!: ElementRef<HTMLDivElement>;
  @ViewChild('rightSection', { static: false }) rightSection!: ElementRef<HTMLDivElement>;
  @ViewChild('actionsContainer', { static: false }) actionsContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('moreButton', { static: false }) moreButton!: ElementRef<HTMLDivElement>;
  @ViewChild('overflowMenuTemplate', { static: false }) overflowMenuTemplate!: TemplateRef<any>;
  // Page header properties
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly icon = input<any>(); // Lucide icon component
  readonly actions = input<PageHeaderAction[]>([]);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  
  // Search functionality properties
  readonly showSearch = input<boolean>(false);
  readonly searchPlaceholder = input<string>('Search...');
  readonly searchValue = input<string>('');

  // Events
  readonly actionClick = output<PageHeaderAction>();
  readonly searchChange = output<string>();
  readonly searchClear = output<void>();

  // Overflow detection signals
  readonly isOverflowing = signal(false);
  readonly showMoreMenu = signal(false);
  readonly overflowActions = signal<PageHeaderAction[]>([]);
  readonly visibleActions = signal<PageHeaderAction[]>([]);

  private resizeObserver?: ResizeObserver;
  private overlayRef?: OverlayRef;
  private debounceTimeout?: number;
  private isDestroyed = false;
  private lastKnownWidth = 0; // Track last known width to detect width changes
  private readonly OVERFLOW_THRESHOLD = 48; // Buffer space in pixels
  private readonly DEBOUNCE_TIME = 100; // Debounce resize events by 100ms

  // Computed classes for styling
  readonly headerClasses = computed(() => [
    'rag-page-header',
    `rag-page-header--${this.size()}`,
    this.isOverflowing() ? 'rag-page-header--overflowing' : ''
  ].filter(Boolean).join(' '));

  readonly titleClasses = computed(() => [
    'rag-page-header__title',
    `rag-page-header__title--${this.size()}`
  ].filter(Boolean).join(' '));

  constructor(
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef
  ) {
    // Watch for actions changes and recalculate overflow
    effect(() => {
      if (this.isDestroyed) return;
      
      const actions = this.actions();
      this.visibleActions.set(actions);
      this.overflowActions.set([]);
      
      // Recalculate overflow after view updates
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.checkOverflow();
        }
      }, 0);
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
    this.checkOverflow();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    
    this.resizeObserver?.disconnect();
    this.closeOverflowMenu();
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined' && this.headerContent) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const currentWidth = entry.contentRect.width;
          
          // Only trigger overflow check if width actually changed
          if (currentWidth !== this.lastKnownWidth) {
            console.log('Header content width changed:', this.lastKnownWidth, '->', currentWidth);
            this.lastKnownWidth = currentWidth;
            this.debouncedCheckOverflow();
          }
        }
      });
      this.resizeObserver.observe(this.headerContent.nativeElement);
      
      // Initialize last known width
      this.lastKnownWidth = this.headerContent.nativeElement.getBoundingClientRect().width;
    }
  }

  private debouncedCheckOverflow(): void {
    if (this.isDestroyed) {
      return;
    }
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      if (!this.isDestroyed) {
        this.checkOverflow();
      }
    }, this.DEBOUNCE_TIME);
  }

  private checkOverflow(): void {
    if (this.isDestroyed || !this.headerContent || !this.rightSection) {
      return;
    }

    const headerContent = this.headerContent.nativeElement;
    const rightSection = this.rightSection.nativeElement;
    
    try {
      const containerComputedStyle = getComputedStyle(headerContent);
      const containerWidth = parseFloat(containerComputedStyle.width);
      const infoWidth = headerContent.querySelector('.rag-page-header__info')?.getBoundingClientRect().width || 0;
      
      // Get natural width of right section - use different method based on visibility
      const naturalWidth: number = this.getHiddenElementOuterWidth(rightSection);
      
      const availableWidth = containerWidth - infoWidth - this.OVERFLOW_THRESHOLD;
      const shouldOverflow = naturalWidth > availableWidth;
      
      if (shouldOverflow !== this.isOverflowing()) {
        if (shouldOverflow) {
          this.handleOverflow();
        } else {
          this.handleNoOverflow();
        }
      }
    } catch (error) {
      console.warn('Error measuring overflow:', error);
    }
  }

  // Utility function to measure element width when fully visible
  private getHiddenElementOuterWidth(element: HTMLElement): number {
    const originalVisibility = element.style.visibility;
    const originalDisplay = element.style.display;
    const originalPosition = element.style.position;
    
    // Store current overflow state
    const wasOverflowing = this.isOverflowing();
    
    // Temporarily show all content to measure natural width
    if (wasOverflowing) {
      this.visibleActions.set(this.actions());
      this.overflowActions.set([]);
      this.isOverflowing.set(false);
    }
    
    // Make element measurable but invisible
    element.style.visibility = 'hidden';
    element.style.display = 'block';
    element.style.position = 'absolute';
    
    const elementWidth = element.offsetWidth;
    
    // Restore original styles
    element.style.visibility = originalVisibility;
    element.style.display = originalDisplay;
    element.style.position = originalPosition;
    
    // Restore overflow state
    if (wasOverflowing) {
      this.handleOverflow();
    }
    
    return elementWidth;
  }

  private handleOverflow(): void {
    if (this.isDestroyed) return;
    
    const actions = this.actions();
    const hasSearch = this.showSearch();
    
    if (actions.length > 0) {
      // Move actions to overflow menu, keep search visible if possible
      this.visibleActions.set([]);
      this.overflowActions.set(actions);
      this.isOverflowing.set(true);
    } else if (hasSearch) {
      // If only search is causing overflow, we'll handle it differently
      this.isOverflowing.set(true);
    }
  }

  private handleNoOverflow(): void {
    if (this.isDestroyed) return;
    
    // Restore all actions to visible state
    this.visibleActions.set(this.actions());
    this.overflowActions.set([]);
    this.isOverflowing.set(false);
    this.showMoreMenu.set(false);
  }

  toggleMoreMenu(): void {
    if (this.isDestroyed) return;
    
    if (this.showMoreMenu()) {
      this.closeOverflowMenu();
    } else {
      this.openOverflowMenu();
    }
  }

  private openOverflowMenu(): void {
    if (!this.moreButton || !this.overflowMenuTemplate) {
      console.warn('ViewChild references not available');
      return;
    }

    const buttonElement = this.moreButton.nativeElement;
    if (!buttonElement) {
      console.warn('More button element not found');
      return;
    }

    const overlayConfig = new OverlayConfig({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy: this.overlay.position()
        .flexibleConnectedTo(buttonElement)
        .withPositions([
          {
            originX: 'end',
            originY: 'bottom',
            overlayX: 'end',
            overlayY: 'top',
            offsetY: 8
          },
          {
            originX: 'end',
            originY: 'top',
            overlayX: 'end',
            overlayY: 'bottom',
            offsetY: -8
          }
        ])
        .withFlexibleDimensions(true)
        .withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.reposition()
    });

    this.overlayRef = this.overlay.create(overlayConfig);
    const portal = new TemplatePortal(this.overflowMenuTemplate, this.viewContainerRef);
    
    this.overlayRef.attach(portal);
    if (!this.isDestroyed) {
      this.showMoreMenu.set(true);
    }

    // Close menu when backdrop is clicked
    this.overlayRef.backdropClick().subscribe(() => {
      this.closeOverflowMenu();
    });

    // Close menu on escape key
    this.overlayRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        this.closeOverflowMenu();
      }
    });
  }

  private closeOverflowMenu(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = undefined;
      if (!this.isDestroyed) {
        this.showMoreMenu.set(false);
      }
    }
  }

  onOverflowActionClick(action: PageHeaderAction): void {
    this.closeOverflowMenu();
    this.onActionClick(action);
  }

  onActionClick(action: PageHeaderAction): void {
    if (!action.disabled && !action.loading) {
      this.actionClick.emit(action);
      action.action();
    }
  }

  onSearchChange(searchQuery: string): void {
    this.searchChange.emit(searchQuery);
  }

  onSearchClear(): void {
    this.searchClear.emit();
  }
}
