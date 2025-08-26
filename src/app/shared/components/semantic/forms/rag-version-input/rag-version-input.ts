import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { RagInput, RagSelect } from '../../../atomic';

export type VersionType = 'exact' | 'range' | 'latest';

export interface VersionValue {
  type: VersionType;
  version: string;
}

@Component({
  selector: 'rag-version-input',
  standalone: true,
  imports: [CommonModule, RagInput, RagSelect, LucideAngularModule],
  templateUrl: './rag-version-input.html',
  styleUrl: './rag-version-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagVersionInput),
      multi: true
    }
  ]
})
export class RagVersionInput implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly placeholder = input('e.g., 1.0.0');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly allowLatest = input(true);
  readonly allowRange = input(true);

  // Modern Angular 20: Use output() instead of EventEmitter
  readonly versionChange = output<VersionValue>();

  // Modern Angular 20: Use signals for reactive state
  private readonly versionTypeSignal = signal<VersionType>('exact');
  private readonly versionValueSignal = signal('');
  private onChange = (value: VersionValue) => {};
  private onTouched = () => {};

  get versionType(): VersionType {
    return this.versionTypeSignal();
  }

  set versionType(val: VersionType) {
    this.versionTypeSignal.set(val);
  }

  get versionValue(): string {
    return this.versionValueSignal();
  }

  set versionValue(val: string) {
    this.versionValueSignal.set(val);
  }

  // Modern Angular 20: Use computed for derived state
  readonly versionOptions = computed(() => {
    const options = [{ value: 'exact', label: 'Exact Version' }];
    if (this.allowRange()) {
      options.push({ value: 'range', label: 'Version Range' });
    }
    if (this.allowLatest()) {
      options.push({ value: 'latest', label: 'Latest' });
    }
    return options;
  });

  readonly currentValue = computed<VersionValue>(() => ({
    type: this.versionType,
    version: this.versionValue
  }));

  readonly isExactOrRange = computed(() => 
    this.versionType === 'exact' || this.versionType === 'range'
  );

  readonly inputPlaceholder = computed(() => {
    switch (this.versionType) {
      case 'exact':
        return this.placeholder();
      case 'range':
        return 'e.g., ^1.0.0, ~1.0.0, >=1.0.0';
      case 'latest':
        return 'Latest version will be used';
      default:
        return this.placeholder();
    }
  });

  readonly isValidVersion = computed(() => {
    if (this.versionType === 'latest') return true;
    if (!this.versionValue.trim()) return false;
    
    // Basic semver validation (simplified)
    if (this.versionType === 'exact') {
      return /^\d+\.\d+\.\d+(-.*)?$/.test(this.versionValue.trim());
    }
    
    // Range validation (simplified)
    if (this.versionType === 'range') {
      return /^[\^~>=<*\s\d\.\-\|]+$/.test(this.versionValue.trim());
    }
    
    return true;
  });

  handleTypeChange(type: string | null): void {
    if (type === null) return;
    
    this.versionType = type as VersionType;
    if (type === 'latest') {
      this.versionValue = 'latest';
    }
    this.emitChange();
  }

  handleVersionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.versionValue = target.value;
    this.emitChange();
  }

  private emitChange(): void {
    const value = this.currentValue();
    this.onChange(value);
    this.versionChange.emit(value);
  }

  // ControlValueAccessor implementation
  writeValue(value: VersionValue | null): void {
    if (value) {
      this.versionTypeSignal.set(value.type);
      this.versionValueSignal.set(value.version);
    } else {
      this.versionTypeSignal.set('exact');
      this.versionValueSignal.set('');
    }
  }

  registerOnChange(fn: (value: VersionValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Note: With input() signals, disabled state is managed externally via input binding
  }
}
