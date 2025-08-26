import { Component, input, output, forwardRef, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { RagInput } from '../../../atomic';

@Component({
  selector: 'rag-search-input',
  standalone: true,
  imports: [CommonModule, RagInput, LucideAngularModule],
  templateUrl: './rag-search-input.html',
  styleUrl: './rag-search-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagSearchInput),
      multi: true
    }
  ]
})
export class RagSearchInput implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly placeholder = input('Search...');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly showClearButton = input(true);
  readonly debounceTime = input(300);

  // Modern Angular 20: Use output() instead of EventEmitter
  readonly search = output<string>();
  readonly clear = output<void>();

  // Modern Angular 20: Use signals for reactive state
  private readonly valueSignal = signal('');
  private readonly isSearchingSignal = signal(false);
  private onChange = (value: string) => {};
  private onTouched = () => {};
  private debounceTimer: any;

  constructor() {
    // Modern Angular 20: Use effect() for reactive side effects
    effect(() => {
      const value = this.valueSignal();
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        this.search.emit(value);
      }, this.debounceTime());
    });
  }

  get value(): string {
    return this.valueSignal();
  }

  set value(val: string) {
    this.valueSignal.set(val);
  }

  // Modern Angular 20: Use computed for derived state
  readonly hasValue = computed(() => this.valueSignal().length > 0);
  readonly showClear = computed(() => this.showClearButton() && this.hasValue() && !this.disabled());

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  handleClear(): void {
    this.value = '';
    this.onChange(this.value);
    this.clear.emit();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.hasValue()) {
      event.preventDefault();
      this.handleClear();
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.valueSignal.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Note: With input() signals, disabled state is managed externally via input binding
  }
}
