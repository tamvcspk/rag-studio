import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RagIcon } from '../rag-icon/rag-icon';

export interface RagSelectOption<T = any> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}

@Component({
  selector: 'rag-select',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-select.html',
  styleUrl: './rag-select.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagSelect),
      multi: true
    }
  ]
})
export class RagSelect<T = any> implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly options = input<RagSelectOption<T>[]>([]);
  readonly placeholder = input('Select an option...');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly error = input(false);
  readonly searchable = input(false);
  readonly clearable = input(false);
  readonly value = input<T | null>(null);
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onSelectionChange = output<T | null>();
  readonly valueChange = output<T | null>();
  readonly onSearch = output<string>();

  // Modern Angular 20: Use signals for reactive state
  private readonly internalValue = signal<T | null>(null);
  private readonly isOpenSignal = signal(false);
  private readonly searchTermSignal = signal('');
  private onChange = (value: T | null) => {};
  private onTouched = () => {};

  // Computed value that prioritizes input() over internal state
  readonly currentValue = computed(() => 
    this.value() !== null ? this.value() : this.internalValue()
  );

  get selectedValue(): T | null {
    return this.currentValue();
  }

  set selectedValue(value: T | null) {
    this.internalValue.set(value);
  }

  get isOpen(): boolean {
    return this.isOpenSignal();
  }

  set isOpen(value: boolean) {
    this.isOpenSignal.set(value);
  }

  get searchTerm(): string {
    return this.searchTermSignal();
  }

  set searchTerm(value: string) {
    this.searchTermSignal.set(value);
  }

  // Modern Angular 20: Use computed for derived state
  readonly selectClasses = computed(() => [
    'rt-SelectTrigger',
    `rt-size-${this.size()}`,
    this.error() ? 'rt-error' : '',
    this.disabled() ? 'rt-disabled' : '',
    this.isOpen ? 'rt-open' : ''
  ].filter(Boolean).join(' '));

  readonly containerClasses = computed(() => [
    'rt-Select',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly selectedOption = computed(() => 
    this.options().find(option => option.value === this.selectedValue) || null
  );

  readonly filteredOptions = computed(() => {
    if (!this.searchTerm) return this.options();
    return this.options().filter(option => 
      option.label.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  });

  readonly displayValue = computed(() => 
    this.selectedOption()?.label || this.placeholder()
  );

  toggleDropdown(): void {
    if (this.disabled()) return;
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.onTouched();
      this.searchTerm = '';
    }
  }

  selectOption(option: RagSelectOption<T>): void {
    if (option.disabled) return;
    
    this.selectedValue = option.value;
    this.isOpen = false;
    this.searchTerm = '';
    
    this.onChange(this.selectedValue);
    this.onSelectionChange.emit(this.selectedValue);
    this.valueChange.emit(this.selectedValue);
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.selectedValue = null;
    this.onChange(this.selectedValue);
    this.onSelectionChange.emit(this.selectedValue);
    this.valueChange.emit(this.selectedValue);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.onSearch.emit(this.searchTerm);
  }

  // ControlValueAccessor implementation
  writeValue(value: T | null): void {
    this.internalValue.set(value);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Note: With input() signals, disabled state is managed externally via input binding
    // This method is kept for ControlValueAccessor compliance but doesn't modify the input
    // The parent component should bind [disabled]="formControl.disabled" to the component
  }
}
