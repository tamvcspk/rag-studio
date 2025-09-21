import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'rag-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-toggle.html',
  styleUrl: './rag-toggle.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagToggle),
      multi: true
    }
  ]
})
export class RagToggle implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly color = input<'blue' | 'green' | 'red'>('blue');
  readonly label = input<string>();
  readonly description = input<string>();
  readonly variant = input<'solid' | 'soft' | 'outline'>('solid');
  readonly onText = input('ON');
  readonly offText = input('OFF');

  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onToggle = output<boolean>();
  readonly valueChange = output<boolean>();

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
  readonly toggleClasses = computed(() => [
    'rt-Toggle',
    `rt-size-${this.size()}`,
    `rt-color-${this.color()}`,
    `rt-variant-${this.variant()}`,
    this.checked ? 'rt-checked' : '',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly wrapperClasses = computed(() => [
    'rt-toggle-wrapper',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly thumbClasses = computed(() => [
    'rt-toggle-thumb',
    this.checked ? 'rt-checked' : ''
  ].filter(Boolean).join(' '));

  readonly currentText = computed(() =>
    this.checked ? this.onText() : this.offText()
  );

  handleClick(): void {
    if (this.disabled()) return;

    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onToggle.emit(this.checked);
    this.valueChange.emit(this.checked);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleClick();
    }
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