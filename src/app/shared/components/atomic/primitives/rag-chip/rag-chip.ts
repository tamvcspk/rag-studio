import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../rag-icon/rag-icon';
import { X } from 'lucide-angular';

@Component({
  selector: 'rag-chip',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-chip.html',
  styleUrl: './rag-chip.scss'
})
export class RagChip {
  // Modern Angular 20: Use input() with proper typing
  readonly variant = input<'solid' | 'soft' | 'outline'>('soft');
  readonly color = input<'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple'>('gray');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly icon = input<any>(); // Now accepts icon component instead of string
  readonly dot = input(false);
  readonly removable = input(false);
  readonly selectable = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);

  // Modern Angular 20: Signal-based outputs
  readonly removed = output<void>();
  readonly selectionChange = output<boolean>();

  // Internal state for selection
  private readonly isSelected = signal(false);

  // Expose selection state as computed property
  readonly selected = computed(() => this.isSelected());

  // Modern Angular 20: Use computed for derived state
  readonly chipClasses = computed(() => [
    'rt-Chip',
    `rt-variant-${this.variant()}`,
    `rt-color-${this.color()}`,
    `rt-size-${this.size()}`,
    this.dot() ? 'rt-chip-dot' : '',
    this.selectable() ? 'rt-chip-selectable' : '',
    this.selected() ? 'rt-chip-selected' : '',
    this.disabled() ? 'rt-chip-disabled' : '',
    this.loading() ? 'rt-chip-loading' : ''
  ].filter(Boolean).join(' '));

  // Close icon reference
  readonly closeIcon = X;

  onChipClick(): void {
    if (this.disabled() || this.loading() || !this.selectable()) return;
    
    const newSelected = !this.isSelected();
    this.isSelected.set(newSelected);
    this.selectionChange.emit(newSelected);
  }

  onRemoveClick(event: Event): void {
    event.stopPropagation();
    if (this.disabled() || this.loading()) return;
    
    this.removed.emit();
  }
}
