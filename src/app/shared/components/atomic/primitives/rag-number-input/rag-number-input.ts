import { Component, input, output, signal, computed, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { RagIcon } from '../rag-icon/rag-icon';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-angular';

export type NumberInputSize = 'sm' | 'md' | 'lg';
export type NumberInputButtonLayout = 'stacked' | 'horizontal';

@Component({
  selector: 'rag-number-input',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-number-input.html',
  styleUrl: './rag-number-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagNumberInput),
      multi: true
    }
  ]
})
export class RagNumberInput implements ControlValueAccessor {
  // Input properties using Angular 20 signals
  readonly placeholder = input<string>('');
  readonly size = input<NumberInputSize>('md');
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly error = input(false);
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly step = input<number>(1);
  readonly locale = input<string>('en-US');
  readonly prefix = input<string>('');
  readonly suffix = input<string>('');
  readonly showButtons = input(false);
  readonly buttonLayout = input<NumberInputButtonLayout>('stacked');
  readonly minimumFractionDigits = input<number | undefined>(undefined);
  readonly maximumFractionDigits = input<number | undefined>(undefined);
  readonly useGrouping = input(true);
  readonly allowEmpty = input(false);
  readonly value = input<number | null>(null);

  // Output events
  readonly valueChange = output<number | null>();
  readonly onFocus = output<FocusEvent>();
  readonly onBlur = output<FocusEvent>();
  readonly onIncrement = output<number | null>();
  readonly onDecrement = output<number | null>();

  // Internal state - separate value and display
  private readonly internalValue = signal<number | null>(null);
  private readonly _focused = signal(false);
  private readonly _displayValue = signal('');

  // ControlValueAccessor implementation
  private onChange = (value: number | null) => {};
  private onTouched = () => {};

  // Icons for spinner buttons
  readonly ChevronUpIcon = ChevronUpIcon;
  readonly ChevronDownIcon = ChevronDownIcon;

  // Computed values aligned with RagInput
  readonly containerClasses = computed(() => [
    'rt-TextField',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly inputClasses = computed(() => [
    'rt-TextFieldInput',
    `rt-size-${this.size()}`,
    this.error() ? 'rt-error' : '',
    this.showButtons() ? `rt-has-buttons rt-buttons-${this.buttonLayout()}` : ''
  ].filter(Boolean).join(' '));

  // Computed property that prioritizes input() over internal state
  readonly currentValue = computed(() =>
    this.value() !== null ? this.value() : this.internalValue()
  );

  readonly displayValue = computed(() => this._displayValue());
  readonly focused = computed(() => this._focused());

  readonly canIncrement = computed(() => {
    const currentValue = this.currentValue();
    const maxValue = this.max();
    if (currentValue === null && this.allowEmpty()) return true;
    if (currentValue === null) return true;
    return maxValue === undefined || currentValue < maxValue;
  });

  readonly canDecrement = computed(() => {
    const currentValue = this.currentValue();
    const minValue = this.min();
    if (currentValue === null && this.allowEmpty()) return true;
    if (currentValue === null) return true;
    return minValue === undefined || currentValue > minValue;
  });

  // Enhanced number formatting with proper grouping and fraction digit support
  private formatNumber(value: number | null): string {
    if (value === null) return '';

    try {
      const options: Intl.NumberFormatOptions = {
        useGrouping: this.useGrouping()
      };

      // Set minimum and maximum fraction digits
      if (this.minimumFractionDigits() !== undefined) {
        options.minimumFractionDigits = this.minimumFractionDigits();
      }
      if (this.maximumFractionDigits() !== undefined) {
        options.maximumFractionDigits = this.maximumFractionDigits();
      }

      // If neither is set, use smart defaults based on step
      if (options.minimumFractionDigits === undefined && options.maximumFractionDigits === undefined) {
        const stepDecimals = this.getDecimalPlaces(this.step());
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = Math.max(stepDecimals, 10);
      }

      const formatter = new Intl.NumberFormat(this.locale(), options);
      let formatted = formatter.format(value);

      // Add prefix and suffix to display
      if (this.prefix()) {
        formatted = this.prefix() + ' ' + formatted;
      }
      if (this.suffix()) {
        formatted = formatted + ' ' + this.suffix();
      }

      return formatted;
    } catch {
      // Fallback to basic formatting if locale is invalid
      let result = value.toString();
      if (this.prefix()) result = this.prefix() + ' ' + result;
      if (this.suffix()) result = result + ' ' + this.suffix();
      return result;
    }
  }

  // Helper to get decimal places from a number
  private getDecimalPlaces(num: number): number {
    const str = num.toString();
    if (str.indexOf('.') !== -1 && str.indexOf('e-') === -1) {
      return str.split('.')[1].length;
    } else if (str.indexOf('e-') !== -1) {
      const parts = str.split('e-');
      return parseInt(parts[1], 10);
    }
    return 0;
  }

  // Enhanced parsing with prefix/suffix support
  private parseNumber(str: string): number | null {
    if (!str.trim()) return this.allowEmpty() ? null : 0;

    // Remove prefix and suffix for parsing
    let cleanStr = str.trim();
    if (this.prefix() && cleanStr.startsWith(this.prefix())) {
      cleanStr = cleanStr.substring(this.prefix().length).trim();
    }
    if (this.suffix() && cleanStr.endsWith(this.suffix())) {
      cleanStr = cleanStr.substring(0, cleanStr.length - this.suffix().length).trim();
    }

    if (!cleanStr) return this.allowEmpty() ? null : 0;

    // Remove grouping characters based on locale
    try {
      const formatter = new Intl.NumberFormat(this.locale());
      const parts = formatter.formatToParts(1234.5);
      const groupChar = parts.find(p => p.type === 'group')?.value || ',';
      const decimalChar = parts.find(p => p.type === 'decimal')?.value || '.';

      // Remove group separators and replace decimal separator with dot
      cleanStr = cleanStr.replace(new RegExp(`\\${groupChar}`, 'g'), '');
      if (decimalChar !== '.') {
        cleanStr = cleanStr.replace(decimalChar, '.');
      }
    } catch {
      // Fallback: remove common group separators
      cleanStr = cleanStr.replace(/[,\s]/g, '');
    }

    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? null : parsed;
  }

  // Clamp value to min/max constraints
  private clampValue(value: number | null): number | null {
    if (value === null) return null;

    const minValue = this.min();
    const maxValue = this.max();

    if (minValue !== undefined && value < minValue) return minValue;
    if (maxValue !== undefined && value > maxValue) return maxValue;

    return value;
  }

  // Update internal value and notify changes with separated display logic
  private updateValue(newValue: number | null, fromInput = false): void {
    const clampedValue = this.clampValue(newValue);

    if (clampedValue !== this.internalValue()) {
      this.internalValue.set(clampedValue);
      this.onChange(clampedValue);
      this.valueChange.emit(clampedValue);
    }

    // Update display value - always format when not focused or when setting programmatically
    if (!fromInput || !this._focused()) {
      this._displayValue.set(this.formatNumber(clampedValue));
    }
  }

  // Event handlers
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const rawValue = target.value;
    const oldValue = this._displayValue();
    const selectionStart = target.selectionStart || 0;
    const selectionEnd = target.selectionEnd || 0;

    // Parse the new value
    const parsedValue = this.parseNumber(rawValue);

    // Update internal value first
    if (parsedValue !== this.internalValue()) {
      this.internalValue.set(this.clampValue(parsedValue));
      this.onChange(this.internalValue());
      this.valueChange.emit(this.internalValue());
    }

    // Handle formatting and cursor position preservation when focused
    if (this._focused()) {
      // During typing, we want to preserve cursor position
      // So we keep the raw input but need to handle cursor restoration
      this._displayValue.set(rawValue);

      // If the value changed significantly (like adding thousand separators)
      // we need to format and adjust cursor position
      const shouldFormat = this.shouldFormatDuringInput(rawValue, parsedValue);

      if (shouldFormat) {
        const formattedValue = this.formatNumberForInput(parsedValue);
        const cursorOffset = this.calculateCursorOffset(oldValue, formattedValue, selectionStart);

        this._displayValue.set(formattedValue);

        // Restore cursor position after Angular updates
        Promise.resolve().then(() => {
          const newPosition = Math.max(0, Math.min(selectionStart + cursorOffset, formattedValue.length));
          target.setSelectionRange(newPosition, newPosition);
        });
      }
    } else {
      // Not focused - apply full formatting
      this._displayValue.set(this.formatNumber(this.internalValue()));
    }
  }

  // Helper method to determine if we should format during input
  private shouldFormatDuringInput(rawValue: string, parsedValue: number | null): boolean {
    if (parsedValue === null) return false;

    // Format if the number is large enough to need thousand separators
    // and useGrouping is enabled
    if (this.useGrouping() && Math.abs(parsedValue) >= 1000) {
      // Check if current raw value doesn't have proper grouping
      const expectedFormatted = this.formatNumberForInput(parsedValue);
      const cleanRaw = this.stripFormatting(rawValue);
      const cleanExpected = this.stripFormatting(expectedFormatted);

      return cleanRaw === cleanExpected && rawValue !== expectedFormatted;
    }

    return false;
  }

  // Format number for input (lighter formatting than display formatting)
  private formatNumberForInput(value: number | null): string {
    if (value === null) return '';

    try {
      const options: Intl.NumberFormatOptions = {
        useGrouping: this.useGrouping(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 10 // Allow more digits during input
      };

      return new Intl.NumberFormat(this.locale(), options).format(value);
    } catch {
      return value.toString();
    }
  }

  // Strip formatting characters for comparison
  private stripFormatting(str: string): string {
    if (!str) return '';

    try {
      const formatter = new Intl.NumberFormat(this.locale());
      const parts = formatter.formatToParts(1234.5);
      const groupChar = parts.find(p => p.type === 'group')?.value || ',';
      const decimalChar = parts.find(p => p.type === 'decimal')?.value || '.';

      return str
        .replace(new RegExp(`\\${groupChar}`, 'g'), '')
        .replace(decimalChar, '.');
    } catch {
      return str.replace(/[,\s]/g, '');
    }
  }

  // Calculate cursor offset when formatting changes
  private calculateCursorOffset(oldValue: string, newValue: string, cursorPosition: number): number {
    if (!oldValue || !newValue) return 0;

    // Count characters added/removed before cursor position
    let offset = 0;
    const minLength = Math.min(oldValue.length, newValue.length);

    for (let i = 0; i < Math.min(cursorPosition, minLength); i++) {
      if (oldValue[i] !== newValue[i]) {
        // Character difference detected
        // Count additional characters in new value
        let newIndex = i;
        let oldIndex = i;

        // Skip through added characters in new value
        while (newIndex < newValue.length && oldIndex < oldValue.length) {
          if (newValue[newIndex] === oldValue[oldIndex]) {
            break;
          }
          newIndex++;
          offset++;
        }
        break;
      }
    }

    // Handle case where new value is longer (characters added)
    if (newValue.length > oldValue.length && cursorPosition >= oldValue.length) {
      offset += newValue.length - oldValue.length;
    }

    return offset;
  }

  onInputFocus(event: FocusEvent): void {
    this._focused.set(true);
    this.onFocus.emit(event);

    // Show raw number format on focus for easier editing
    const currentValue = this.currentValue();
    if (currentValue !== null) {
      // Use a simplified format during focus for easier editing
      // Remove prefix/suffix but keep basic grouping if enabled
      const rawFormat = this.useGrouping() ?
        this.formatNumberForInput(currentValue) :
        currentValue.toString();
      this._displayValue.set(rawFormat);
    } else {
      this._displayValue.set('');
    }

    // Position cursor at the end after focus
    const target = event.target as HTMLInputElement;
    Promise.resolve().then(() => {
      const length = target.value.length;
      target.setSelectionRange(length, length);
    });
  }

  onInputBlur(event: FocusEvent): void {
    this._focused.set(false);
    this.onTouched();
    this.onBlur.emit(event);

    // Format display value on blur with prefix/suffix
    this._displayValue.set(this.formatNumber(this.currentValue()));
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled() || this.readonly()) return;

    // Handle special navigation and control keys first
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.increment();
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.decrement();
        return;
      case 'Enter':
        // Force blur to apply formatting
        (event.target as HTMLInputElement).blur();
        return;
      case 'Tab':
      case 'Escape':
        // Allow these keys to pass through
        return;
    }

    // Allow navigation and editing keys
    if (this.isNavigationKey(event) || this.isEditingKey(event)) {
      return;
    }

    // Validate numeric input
    if (!this.isValidNumericInput(event)) {
      event.preventDefault();
      return;
    }

    // Additional validation for decimal places and value constraints
    if (!this.isInputAllowed(event)) {
      event.preventDefault();
      return;
    }
  }

  // Check if key is a navigation key (arrows, home, end, page up/down)
  private isNavigationKey(event: KeyboardEvent): boolean {
    const navigationKeys = [
      'ArrowLeft', 'ArrowRight', 'Home', 'End',
      'PageUp', 'PageDown'
    ];
    return navigationKeys.includes(event.key);
  }

  // Check if key is an editing key (backspace, delete, select all, etc.)
  private isEditingKey(event: KeyboardEvent): boolean {
    // Allow editing keys
    if (['Backspace', 'Delete'].includes(event.key)) {
      return true;
    }

    // Allow Ctrl/Cmd combinations for copy, paste, cut, select all, undo, redo
    if (event.ctrlKey || event.metaKey) {
      const allowedCtrlKeys = ['a', 'c', 'v', 'x', 'z', 'y'];
      return allowedCtrlKeys.includes(event.key.toLowerCase());
    }

    return false;
  }

  // Check if the pressed key represents valid numeric input
  private isValidNumericInput(event: KeyboardEvent): boolean {
    const key = event.key;

    // Allow digits
    if (/^\d$/.test(key)) {
      return true;
    }

    // Allow decimal separator based on locale
    if (this.isDecimalSeparator(key)) {
      return true;
    }

    // Allow minus sign for negative numbers (only at the beginning)
    if (key === '-' || key === '+') {
      const target = event.target as HTMLInputElement;
      const cursorPosition = target.selectionStart || 0;
      const currentValue = target.value;

      // Only allow at the beginning or if selecting all text
      return cursorPosition === 0 ||
             (target.selectionStart === 0 && target.selectionEnd === currentValue.length);
    }

    // Allow grouping separator (thousand separator) based on locale
    if (this.useGrouping() && this.isGroupingSeparator(key)) {
      return true;
    }

    return false;
  }

  // Check if additional input constraints are met
  private isInputAllowed(event: KeyboardEvent): boolean {
    const target = event.target as HTMLInputElement;
    const key = event.key;
    const currentValue = target.value;
    const cursorPosition = target.selectionStart || 0;

    // Check decimal separator constraints
    if (this.isDecimalSeparator(key)) {
      // Only one decimal separator allowed
      const decimalChar = this.getDecimalSeparator();
      if (currentValue.includes(decimalChar)) {
        return false;
      }
    }

    // Check for maximum decimal places
    if (/^\d$/.test(key)) {
      const decimalChar = this.getDecimalSeparator();
      const decimalIndex = currentValue.indexOf(decimalChar);

      if (decimalIndex !== -1) {
        // We're after decimal point
        const afterDecimal = currentValue.substring(decimalIndex + 1);
        const maxFractionDigits = this.maximumFractionDigits();

        if (maxFractionDigits !== undefined &&
            cursorPosition > decimalIndex &&
            afterDecimal.length >= maxFractionDigits) {
          return false;
        }
      }
    }

    // Prevent multiple minus/plus signs
    if ((key === '-' || key === '+') && /^[-+]/.test(currentValue)) {
      return false;
    }

    return true;
  }

  // Get the decimal separator for current locale
  private getDecimalSeparator(): string {
    try {
      const formatter = new Intl.NumberFormat(this.locale());
      const parts = formatter.formatToParts(1.1);
      return parts.find(part => part.type === 'decimal')?.value || '.';
    } catch {
      return '.';
    }
  }

  // Get the grouping separator for current locale
  private getGroupingSeparator(): string {
    try {
      const formatter = new Intl.NumberFormat(this.locale());
      const parts = formatter.formatToParts(1234);
      return parts.find(part => part.type === 'group')?.value || ',';
    } catch {
      return ',';
    }
  }

  // Check if key is the decimal separator for current locale
  private isDecimalSeparator(key: string): boolean {
    const decimalChar = this.getDecimalSeparator();
    // Also allow period as it's common input
    return key === decimalChar || key === '.';
  }

  // Check if key is the grouping separator for current locale
  private isGroupingSeparator(key: string): boolean {
    const groupingChar = this.getGroupingSeparator();
    // Also allow comma as it's common input
    return key === groupingChar || key === ',';
  }

  increment(): void {
    if (this.disabled() || this.readonly() || !this.canIncrement()) return;

    const currentValue = this.currentValue() ?? 0;
    const newValue = currentValue + this.step();
    this.updateValue(newValue);
    this.onIncrement.emit(this.currentValue());
  }

  decrement(): void {
    if (this.disabled() || this.readonly() || !this.canDecrement()) return;

    const currentValue = this.currentValue() ?? 0;
    const newValue = currentValue - this.step();
    this.updateValue(newValue);
    this.onDecrement.emit(this.currentValue());
  }

  // ControlValueAccessor implementation
  writeValue(value: number | null): void {
    this.updateValue(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Note: This would need to be implemented with a signal update
    // For now, the disabled state is controlled via the input property
  }
}