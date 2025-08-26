import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'rag-radio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-radio.html',
  styleUrl: './rag-radio.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagRadio),
      multi: true
    }
  ]
})
export class RagRadio implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly value = input.required<any>();
  readonly name = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly color = input<'blue' | 'green' | 'red'>('blue');
  readonly label = input<string>();
  readonly description = input<string>();
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onSelectionChange = output<any>();

  // Modern Angular 20: Use signals for reactive state
  private readonly selectedValueSignal = signal<any>(null);
  private onChange = (value: any) => {};
  private onTouched = () => {};

  get selectedValue(): any {
    return this.selectedValueSignal();
  }

  set selectedValue(val: any) {
    this.selectedValueSignal.set(val);
  }

  // Modern Angular 20: Use computed for derived state
  readonly isChecked = computed(() => this.selectedValue === this.value());

  readonly radioClasses = computed(() => [
    'rt-Radio',
    `rt-size-${this.size()}`,
    `rt-color-${this.color()}`,
    this.isChecked() ? 'rt-checked' : '',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly wrapperClasses = computed(() => [
    'rt-radio-wrapper',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  handleChange(event: Event): void {
    if (this.disabled()) return;
    
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectedValue = this.value();
      this.onChange(this.selectedValue);
      this.onSelectionChange.emit(this.selectedValue);
    }
  }

  handleBlur(): void {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.selectedValueSignal.set(value);
  }

  registerOnChange(fn: (value: any) => void): void {
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
