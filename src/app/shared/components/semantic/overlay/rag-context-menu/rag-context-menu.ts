import { Component, input, output, signal, computed, effect, ElementRef, viewChild, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: any; // Icon component, not string
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'rag-context-menu',
  standalone: true,
  imports: [CommonModule, RagIcon, OverlayModule],
  templateUrl: './rag-context-menu.html',
  styleUrl: './rag-context-menu.scss'
})
export class RagContextMenu implements OnDestroy {
  readonly items = input<ContextMenuItem[]>([]);
  readonly position = input<ContextMenuPosition | null>(null);
  readonly chevronRight = input<any>(); // Chevron right icon component for submenus
  readonly open = input<boolean>(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly openChange = output<boolean>();
  readonly itemSelect = output<ContextMenuItem>();
  readonly close = output<void>();

  private readonly menuElement = viewChild<ElementRef<HTMLDivElement>>('menu');
  readonly isOpen = signal(false);
  private readonly focusedIndex = signal(-1);
  private readonly submenuOpen = signal<string | null>(null);
  private readonly menuPosition = signal<ContextMenuPosition>({ x: 0, y: 0 });

  readonly menuClasses = computed(() => [
    'rt-ContextMenu',
    `rt-size-${this.size()}`,
    this.isOpen() ? 'rt-open' : ''
  ].filter(Boolean).join(' '));

  readonly visibleItems = computed(() => 
    this.items().filter(item => !item.separator)
  );

  readonly menuStyle = computed(() => {
    const pos = this.menuPosition();
    return {
      left: `${pos.x}px`,
      top: `${pos.y}px`
    };
  });

  constructor() {
    // Sync external open state
    effect(() => {
      this.isOpen.set(this.open());
      if (this.open() && this.position()) {
        this.updatePosition(this.position()!);
      }
    });

    // Handle document clicks
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.onDocumentClick.bind(this));
      document.addEventListener('contextmenu', this.onDocumentContextMenu.bind(this));
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.onDocumentClick.bind(this));
      document.removeEventListener('contextmenu', this.onDocumentContextMenu.bind(this));
    }
  }

  private onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const menu = this.menuElement()?.nativeElement;
    
    if (this.isOpen() && menu && !menu.contains(target)) {
      this.closeMenu();
    }
  }

  private onDocumentContextMenu(event: MouseEvent): void {
    // Close any existing context menu when a new one is opened
    if (this.isOpen()) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeMenu();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousItem();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.openSubmenu();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.closeSubmenu();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectFocusedItem();
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

  private updatePosition(pos: ContextMenuPosition): void {
    // Ensure menu stays within viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const menuSize = {
      width: 250, // Estimated menu width
      height: this.items().length * 32 + 16 // Estimated menu height
    };

    let x = pos.x;
    let y = pos.y;

    // Adjust horizontal position
    if (x + menuSize.width > viewport.width) {
      x = viewport.width - menuSize.width - 8;
    }
    if (x < 0) x = 8;

    // Adjust vertical position
    if (y + menuSize.height > viewport.height) {
      y = viewport.height - menuSize.height - 8;
    }
    if (y < 0) y = 8;

    this.menuPosition.set({ x, y });
  }

  onItemClick(item: ContextMenuItem): void {
    if (item.disabled || item.separator) return;

    if (item.submenu) {
      this.toggleSubmenu(item.id);
    } else {
      this.itemSelect.emit(item);
      this.closeMenu();
    }
  }

  onItemMouseEnter(item: ContextMenuItem): void {
    if (item.submenu && !item.disabled) {
      this.submenuOpen.set(item.id);
    }
  }

  private closeMenu(): void {
    this.isOpen.set(false);
    this.focusedIndex.set(-1);
    this.submenuOpen.set(null);
    this.openChange.emit(false);
    this.close.emit();
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

  private selectFocusedItem(): void {
    const focusedIndex = this.focusedIndex();
    const items = this.visibleItems();
    
    if (focusedIndex >= 0 && focusedIndex < items.length) {
      const item = items[focusedIndex];
      this.onItemClick(item);
    }
  }

  private toggleSubmenu(itemId: string): void {
    const current = this.submenuOpen();
    this.submenuOpen.set(current === itemId ? null : itemId);
  }

  private openSubmenu(): void {
    const focusedIndex = this.focusedIndex();
    const items = this.visibleItems();
    
    if (focusedIndex >= 0 && focusedIndex < items.length) {
      const item = items[focusedIndex];
      if (item.submenu) {
        this.submenuOpen.set(item.id);
      }
    }
  }

  private closeSubmenu(): void {
    this.submenuOpen.set(null);
  }

  getItemClasses(item: ContextMenuItem, index: number): string {
    const visibleIndex = this.visibleItems().indexOf(item);
    return [
      'rt-ContextMenuItem',
      item.disabled ? 'rt-disabled' : '',
      item.separator ? 'rt-separator' : '',
      this.focusedIndex() === visibleIndex ? 'rt-focused' : '',
      item.submenu ? 'rt-has-submenu' : ''
    ].filter(Boolean).join(' ');
  }

  isSubmenuOpen(itemId: string): boolean {
    return this.submenuOpen() === itemId;
  }
}
