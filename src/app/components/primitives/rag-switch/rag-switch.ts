import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'rag-switch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-switch.html',
  styleUrl: './rag-switch.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagSwitch),
      multi: true
    }
  ]
})
export class RagSwitch implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly color = input<'blue' | 'green' | 'red'>('blue');
  readonly label = input<string>();
  readonly description = input<string>();
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onToggle = output<boolean>();

  // Modern Angular 20: Use signals for reactive state
  private readonly checkedSignal = signal(false);

  get checked(): boolean {
    return this.checkedSignal();
  }

  set checked(value: boolean) {
    this.checkedSignal.set(value);
  }
  private onChange = (value: boolean) => {};
  private onTouched = () => {};

  // Modern Angular 20: Use computed for derived state
  readonly switchClasses = computed(() => [
    'rt-Switch',
    `rt-size-${this.size()}`,
    `rt-color-${this.color()}`,
    this.checked ? 'rt-checked' : '',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly wrapperClasses = computed(() => [
    'rt-switch-wrapper',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  handleChange(event: Event): void {
    if (this.disabled()) return;
    
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    
    this.onChange(this.checked);
    this.onToggle.emit(this.checked);
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
    // Note: With input() signals, disabled state is managed externally
    // This method is kept for ControlValueAccessor compliance
  }
}
