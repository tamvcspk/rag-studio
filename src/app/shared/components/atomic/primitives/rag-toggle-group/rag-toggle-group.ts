import { Component, input, output, signal, computed, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RagIcon } from '../rag-icon/rag-icon';

export interface RagToggleGroupOption<T = string> {
  value: T;
  label: string;
  icon?: any; // Lucide icon
  disabled?: boolean;
}

export type RagToggleGroupSize = 'sm' | 'md' | 'lg';
export type RagToggleGroupVariant = 'default' | 'outline' | 'ghost';

@Component({
  selector: 'rag-toggle-group',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-toggle-group.html',
  styleUrls: ['./rag-toggle-group.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagToggleGroup),
      multi: true
    }
  ]
})
export class RagToggleGroup<T = string> implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly options = input<RagToggleGroupOption<T>[]>([]);
  readonly size = input<RagToggleGroupSize>('md');
  readonly variant = input<RagToggleGroupVariant>('default');
  readonly disabled = input(false);
  readonly multiple = input(false);
  readonly value = input<T | T[] | null>(null);

  // Modern Angular 20: Use output() instead of EventEmitter
  readonly valueChange = output<T | T[] | null>();

  // Modern Angular 20: Use signals for reactive state
  private readonly internalValue = signal<T | T[] | null>(null);
  private onChange = (value: T | T[] | null) => {};
  private onTouched = () => {};

  // Computed value that prioritizes input() over internal state
  readonly currentValue = computed(() => 
    this.value() !== null ? this.value() : this.internalValue()
  );

  // Modern Angular 20: Use computed for derived state
  readonly containerClasses = computed(() => [
    'rag-toggle-group',
    `rag-toggle-group--${this.size()}`,
    `rag-toggle-group--${this.variant()}`,
    this.disabled() ? 'rag-toggle-group--disabled' : ''
  ].filter(Boolean).join(' '));

  readonly iconSize = computed(() => {
    const sizeMap = { sm: 'sm', md: 'md', lg: 'lg' } as const;
    return sizeMap[this.size()];
  });

  getOptionClasses(option: RagToggleGroupOption<T>): string {
    return [
      'rag-toggle-group__option',
      this.isSelected(option.value) ? 'rag-toggle-group__option--selected' : '',
      option.disabled ? 'rag-toggle-group__option--disabled' : ''
    ].filter(Boolean).join(' ');
  }

  isSelected(value: T): boolean {
    const current = this.currentValue();
    if (this.multiple()) {
      return Array.isArray(current) && current.includes(value);
    }
    return current === value;
  }

  selectOption(option: RagToggleGroupOption<T>): void {
    if (option.disabled || this.disabled()) return;

    const current = this.currentValue();
    let newValue: T | T[] | null;

    if (this.multiple()) {
      const currentArray = Array.isArray(current) ? current : [];
      if (currentArray.includes(option.value)) {
        // Remove from selection
        newValue = currentArray.filter(v => v !== option.value);
        if (newValue.length === 0) newValue = null;
      } else {
        // Add to selection
        newValue = [...currentArray, option.value];
      }
    } else {
      // Single selection - toggle off if already selected
      newValue = current === option.value ? null : option.value;
    }

    this.internalValue.set(newValue);
    this.onChange(newValue);
    this.onTouched();
    this.valueChange.emit(newValue);
  }

  // ControlValueAccessor implementation
  writeValue(value: T | T[] | null): void {
    this.internalValue.set(value);
  }

  registerOnChange(fn: (value: T | T[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Note: With input() signals, disabled state is managed externally
    // This method is kept for ControlValueAccessor compliance
  }
}