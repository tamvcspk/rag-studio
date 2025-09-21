import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'rag-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-slider.html',
  styleUrl: './rag-slider.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagSlider),
      multi: true
    }
  ]
})
export class RagSlider implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly showValue = input(true);
  readonly showMinMax = input(true);
  readonly label = input<string>();
  readonly description = input<string>();
  readonly color = input<'blue' | 'green' | 'red'>('blue');
  readonly unit = input<string>('');

  // Modern Angular 20: Use output() instead of EventEmitter
  readonly valueChange = output<number>();
  readonly onSliderChange = output<number>();

  // Modern Angular 20: Use signals for reactive state
  private readonly internalValue = signal(0);
  private onChange = (value: number) => {};
  private onTouched = () => {};

  get value(): number {
    return this.internalValue();
  }

  set value(val: number) {
    const clampedValue = this.clampValue(val);
    this.internalValue.set(clampedValue);
  }

  // Modern Angular 20: Use computed for derived state
  readonly sliderClasses = computed(() => [
    'rt-Slider',
    `rt-size-${this.size()}`,
    `rt-color-${this.color()}`,
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly wrapperClasses = computed(() => [
    'rt-slider-wrapper',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly progressPercentage = computed(() => {
    const range = this.max() - this.min();
    if (range === 0) return 0;
    return ((this.value - this.min()) / range) * 100;
  });

  readonly displayValue = computed(() => {
    const val = this.value.toString();
    const unit = this.unit();
    return unit ? `${val}${unit}` : val;
  });

  private clampValue(value: number): number {
    const min = this.min();
    const max = this.max();
    const step = this.step();

    // Clamp to min/max
    let clampedValue = Math.max(min, Math.min(max, value));

    // Round to nearest step
    if (step > 0) {
      clampedValue = Math.round((clampedValue - min) / step) * step + min;
    }

    return clampedValue;
  }

  handleInput(event: Event): void {
    if (this.disabled()) return;

    const target = event.target as HTMLInputElement;
    const numValue = parseFloat(target.value);

    if (!isNaN(numValue)) {
      this.value = numValue;
      this.onChange(this.value);
      this.valueChange.emit(this.value);
      this.onSliderChange.emit(this.value);
    }
  }

  handleBlur(): void {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: number): void {
    this.internalValue.set(this.clampValue(value || 0));
  }

  registerOnChange(fn: (value: number) => void): void {
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