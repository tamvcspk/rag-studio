import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Check, Minus } from 'lucide-angular';
import { RagIcon } from '../rag-icon/rag-icon';

@Component({
  selector: 'rag-checkbox',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-checkbox.html',
  styleUrl: './rag-checkbox.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagCheckbox),
      multi: true
    }
  ]
})
export class RagCheckbox implements ControlValueAccessor {
  // Icon constants
  readonly CheckIcon = Check;
  readonly MinusIcon = Minus;
  
  // Modern Angular 20: Use input() with proper typing
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly indeterminate = input(false);
  readonly color = input<'blue' | 'green' | 'red'>('blue');
  readonly label = input<string>();
  readonly description = input<string>();
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onCheckedChange = output<boolean>();

  // Modern Angular 20: Use signals for reactive state
  private readonly checkedSignal = signal(false);
  private onChange = (value: boolean) => {};
  private onTouched = () => {};

  get checked(): boolean {
    return this.checkedSignal();
  }

  set checked(value: boolean) {
    this.checkedSignal.set(value);
  }

  // Modern Angular 20: Use computed for derived state
  readonly checkboxClasses = computed(() => [
    'rt-Checkbox',
    `rt-size-${this.size()}`,
    `rt-color-${this.color()}`,
    this.checked ? 'rt-checked' : '',
    this.indeterminate() ? 'rt-indeterminate' : '',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly wrapperClasses = computed(() => [
    'rt-checkbox-wrapper',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  handleChange(event: Event): void {
    if (this.disabled()) return;
    
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    
    // Note: indeterminate state is now managed externally via input() binding
    // The parent component should handle clearing indeterminate state when checked changes
    
    this.onChange(this.checked);
    this.onCheckedChange.emit(this.checked);
  }

  handleBlur(): void {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: boolean): void {
    this.checkedSignal.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
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
