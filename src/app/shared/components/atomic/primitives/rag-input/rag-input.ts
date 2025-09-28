import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RagIcon } from '../rag-icon/rag-icon';
import { RagButton } from '../rag-button/rag-button';
import { FolderIcon, FileIcon } from 'lucide-angular';

@Component({
  selector: 'rag-input',
  standalone: true,
  imports: [CommonModule, RagIcon, RagButton],
  templateUrl: './rag-input.html',
  styleUrl: './rag-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagInput),
      multi: true
    }
  ]
})
export class RagInput implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly placeholder = input('');
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'search' | 'path'>('text');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly error = input(false);
  readonly leftIcon = input<any>(); // Now accepts icon component instead of string
  readonly rightIcon = input<any>(); // Now accepts icon component instead of string
  readonly maxlength = input<number>();
  readonly value = input<string>('');

  // Path-specific properties
  readonly browseMode = input<'file' | 'folder'>('folder'); // For path type: what to browse for
  readonly browseTitle = input<string>(''); // Title for the browse dialog
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly valueChange = output<string>();
  readonly onFocus = output<FocusEvent>();
  readonly onBlur = output<FocusEvent>();
  readonly onRightIconClick = output<void>();
  readonly onBrowse = output<void>(); // Emitted when browse button is clicked

  // Modern Angular 20: Use signals for reactive state
  private readonly internalValue = signal('');
  private onChange = (value: string) => {};
  private onTouched = () => {};

  // Computed value that prioritizes input() over internal state
  readonly currentValue = computed(() => 
    this.value() || this.internalValue()
  );

  // Modern Angular 20: Use computed for derived state
  readonly inputClasses = computed(() => [
    'rt-TextFieldInput',
    `rt-size-${this.size()}`,
    this.error() ? 'rt-error' : '',
    this.leftIcon() ? 'rt-has-left-icon' : '',
    this.rightIcon() || this.type() === 'path' ? 'rt-has-right-icon' : '',
    this.type() === 'path' ? 'rt-path-input' : ''
  ].filter(Boolean).join(' '));

  readonly containerClasses = computed(() => [
    'rt-TextField',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  // Computed property to determine if browse button should be shown
  readonly showBrowseButton = computed(() => this.type() === 'path');

  // Icons for browse button
  readonly FolderIcon = FolderIcon;
  readonly FileIcon = FileIcon;

  // Computed property for browse icon
  readonly browseIcon = computed(() => this.browseMode() === 'folder' ? this.FolderIcon : this.FileIcon);

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.internalValue.set(target.value);
    this.onChange(target.value);
    this.valueChange.emit(target.value);
  }

  handleFocus(event: FocusEvent): void {
    this.onFocus.emit(event);
  }

  handleBlur(event: FocusEvent): void {
    this.onTouched();
    this.onBlur.emit(event);
  }

  handleRightIconClick(): void {
    this.onRightIconClick.emit();
  }

  handleBrowseClick(): void {
    this.onBrowse.emit();
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.internalValue.set(value || '');
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
