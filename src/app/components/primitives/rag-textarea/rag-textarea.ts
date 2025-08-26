import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'rag-textarea',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-textarea.html',
  styleUrl: './rag-textarea.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagTextarea),
      multi: true
    }
  ]
})
export class RagTextarea implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly placeholder = input('');
  readonly rows = input(4);
  readonly minRows = input(2);
  readonly maxRows = input<number>();
  readonly resize = input<'none' | 'vertical' | 'horizontal' | 'both'>('vertical');
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly error = input(false);
  readonly maxlength = input<number>();
  readonly autoResize = input(false);
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly onFocus = output<FocusEvent>();
  readonly onBlur = output<FocusEvent>();

  // Modern Angular 20: Use signals for reactive state
  private readonly valueSignal = signal('');
  private onChange = (value: string) => {};
  private onTouched = () => {};

  get value(): string {
    return this.valueSignal();
  }

  set value(val: string) {
    this.valueSignal.set(val);
  }

  // Modern Angular 20: Use computed for derived state
  readonly textareaClasses = computed(() => [
    'rt-TextArea',
    this.error() ? 'rt-error' : '',
    this.resize() !== 'vertical' ? `rt-resize-${this.resize()}` : ''
  ].filter(Boolean).join(' '));

  readonly containerClasses = computed(() => [
    'rt-textarea-container',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly textareaStyles = computed(() => {
    const styles: any = {};
    if (!this.autoResize()) {
      styles.minHeight = `${this.minRows() * 1.5}rem`;
      const maxRows = this.maxRows();
      if (maxRows) {
        styles.maxHeight = `${maxRows * 1.5}rem`;
      }
    }
    return styles;
  });

  handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value = target.value;
    this.onChange(this.value);
    
    if (this.autoResize()) {
      this.adjustHeight(target);
    }
  }

  handleFocus(event: FocusEvent): void {
    this.onFocus.emit(event);
  }

  handleBlur(event: FocusEvent): void {
    this.onTouched();
    this.onBlur.emit(event);
  }

  private adjustHeight(element: HTMLTextAreaElement): void {
    element.style.height = 'auto';
    const scrollHeight = element.scrollHeight;
    const minHeight = this.minRows() * 24; // Approximate line height
    const maxRows = this.maxRows();
    const maxHeight = maxRows ? maxRows * 24 : Infinity;
    
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    element.style.height = `${newHeight}px`;
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
    // This method is kept for ControlValueAccessor compliance but doesn't modify the input
    // The parent component should bind [disabled]="formControl.disabled" to the component
  }
}
