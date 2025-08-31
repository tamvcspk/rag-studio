import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

@Component({
  selector: 'rag-sidebar-item',
  standalone: true,
  imports: [CommonModule, RouterModule, RagIcon],
  templateUrl: './rag-sidebar-item.html',
  styleUrl: './rag-sidebar-item.scss'
})
export class RagSidebarItem {
  readonly label = input.required<string>();
  readonly icon = input<any | null>(null); // Icon component
  readonly url = input<string | null>(null);
  readonly active = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly badge = input<string | number | null>(null);
  readonly badgeVariant = input<'default' | 'success' | 'warning' | 'error'>('default');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly variant = input<'default' | 'ghost' | 'subtle'>('default');
  readonly indent = input<boolean>(false);
  readonly collapsible = input<boolean>(false);
  readonly collapsed = input<boolean>(false);
  readonly hasChildren = input<boolean>(false);
  readonly chevronRight = input<any>(); // Icon component for collapsed state
  readonly chevronDown = input<any>(); // Icon component for expanded state

  readonly click = output<void>();
  readonly toggle = output<boolean>();

  readonly itemClasses = computed(() => [
    'rt-SidebarItem',
    `rt-size-${this.size()}`,
    `rt-variant-${this.variant()}`,
    this.active() ? 'rt-active' : '',
    this.disabled() ? 'rt-disabled' : '',
    this.indent() ? 'rt-indent' : '',
    this.collapsible() ? 'rt-collapsible' : ''
  ].filter(Boolean).join(' '));

  readonly badgeClasses = computed(() => [
    'rt-SidebarBadge',
    `rt-variant-${this.badgeVariant()}`
  ].filter(Boolean).join(' '));

  onItemClick(event: Event): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.click.emit();
  }

  onToggleClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.disabled() || !this.collapsible()) return;
    
    const newCollapsed = !this.collapsed();
    this.toggle.emit(newCollapsed);
  }
}
