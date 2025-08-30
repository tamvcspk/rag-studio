import { Component, input, output, signal, computed, effect, ElementRef, viewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: any; // Icon component, not string
  disabled?: boolean;
  separator?: boolean;
  href?: string;
  shortcut?: string;
}

@Component({
  selector: 'rag-dropdown',
  standalone: true,
  imports: [CommonModule, RagIcon, OverlayModule],
  templateUrl: './rag-dropdown.html',
  styleUrl: './rag-dropdown.scss'
})
export class RagDropdownComponent {
  readonly items = input<DropdownItem[]>([]);
  readonly open = input<boolean>(false);
  readonly triggerContent = input<string>('');
  readonly triggerIcon = input<any | null>(null); // Icon component
  readonly chevronDown = input<any>(); // Chevron down icon component
  readonly placement = input<'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start' | 'left-start'>('bottom-start');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly variant = input<'default' | 'ghost' | 'outline'>('default');
  readonly disabled = input<boolean>(false);
  readonly closeOnSelect = input<boolean>(true);
  readonly showArrow = input<boolean>(true);

  readonly openChange = output<boolean>();
  readonly itemSelect = output<DropdownItem>();
  readonly close = output<void>();

  private readonly triggerElement = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  readonly isOpen = signal(false);
  private readonly focusedIndex = signal(-1);

  readonly triggerClasses = computed(() => [
    'rt-DropdownTrigger',
    `rt-size-${this.size()}`,
    `rt-variant-${this.variant()}`,
    this.disabled() ? 'rt-disabled' : '',
    this.isOpen() ? 'rt-open' : ''
  ].filter(Boolean).join(' '));

  readonly contentClasses = computed(() => [
    'rt-DropdownContent',
    `rt-size-${this.size()}`,
    `rt-placement-${this.placement()}`
  ].filter(Boolean).join(' '));

  readonly visibleItems = computed(() => 
    this.items().filter(item => !item.separator)
  );

  constructor() {
    // Sync external open state
    effect(() => {
      this.isOpen.set(this.open());
    });

    // Handle click outside
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.onDocumentClick.bind(this));
    }
  }

  private onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const trigger = this.triggerElement()?.nativeElement;
    
    if (this.isOpen() && trigger && !trigger.contains(target)) {
      this.closeDropdown();
    }
  }

  onTriggerClick(): void {
    if (this.disabled()) return;
    
    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.openDropdown();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.openDropdown();
        this.focusFirstItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.openDropdown();
        this.focusLastItem();
        break;
      case 'Escape':
        this.closeDropdown();
        break;
    }
  }

  onItemClick(item: DropdownItem): void {
    if (item.disabled || item.separator) return;

    this.itemSelect.emit(item);
    
    if (this.closeOnSelect()) {
      this.closeDropdown();
    }
  }

  onItemKeydown(event: KeyboardEvent, item: DropdownItem, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onItemClick(item);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousItem();
        break;
      case 'Escape':
        this.closeDropdown();
        this.focusTrigger();
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirstItem();
        break;
      case 'End':
        event.preventDefault();
        this.focusLastItem();
        break;
    }
  }

  private openDropdown(): void {
    this.isOpen.set(true);
    this.openChange.emit(true);
  }

  private closeDropdown(): void {
    this.isOpen.set(false);
    this.focusedIndex.set(-1);
    this.openChange.emit(false);
    this.close.emit();
  }

  private focusTrigger(): void {
    this.triggerElement()?.nativeElement?.focus();
  }

  private focusFirstItem(): void {
    const items = this.visibleItems();
    const firstEnabledIndex = items.findIndex(item => !item.disabled);
    if (firstEnabledIndex !== -1) {
      this.focusedIndex.set(firstEnabledIndex);
    }
  }

  private focusLastItem(): void {
    const items = this.visibleItems();
    for (let i = items.length - 1; i >= 0; i--) {
      if (!items[i].disabled) {
        this.focusedIndex.set(i);
        break;
      }
    }
  }

  private focusNextItem(): void {
    const items = this.visibleItems();
    const currentIndex = this.focusedIndex();
    
    for (let i = currentIndex + 1; i < items.length; i++) {
      if (!items[i].disabled) {
        this.focusedIndex.set(i);
        return;
      }
    }
    
    // Wrap to first item
    this.focusFirstItem();
  }

  private focusPreviousItem(): void {
    const items = this.visibleItems();
    const currentIndex = this.focusedIndex();
    
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!items[i].disabled) {
        this.focusedIndex.set(i);
        return;
      }
    }
    
    // Wrap to last item
    this.focusLastItem();
  }

  getItemClasses(item: DropdownItem, index: number): string {
    const visibleIndex = this.visibleItems().indexOf(item);
    return [
      'rt-DropdownItem',
      item.disabled ? 'rt-disabled' : '',
      item.separator ? 'rt-separator' : '',
      this.focusedIndex() === visibleIndex ? 'rt-focused' : ''
    ].filter(Boolean).join(' ');
  }
}
