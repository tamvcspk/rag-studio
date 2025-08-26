import { Component, input, output, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { RagInput, RagSelect } from '../../../atomic';

export type CronPreset = 'custom' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface CronValue {
  preset: CronPreset;
  expression: string;
  description: string;
}

@Component({
  selector: 'rag-cron-input',
  standalone: true,
  imports: [CommonModule, RagInput, RagSelect, LucideAngularModule],
  templateUrl: './rag-cron-input.html',
  styleUrl: './rag-cron-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagCronInput),
      multi: true
    }
  ]
})
export class RagCronInput implements ControlValueAccessor {
  // Modern Angular 20: Use input() with proper typing
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly showPresets = input(true);
  readonly timezone = input('UTC');

  // Modern Angular 20: Use output() instead of EventEmitter
  readonly cronChange = output<CronValue>();

  // Modern Angular 20: Use signals for reactive state
  private readonly presetSignal = signal<CronPreset>('daily');
  private readonly expressionSignal = signal('0 9 * * *');
  private onChange = (value: CronValue) => {};
  private onTouched = () => {};

  get preset(): CronPreset {
    return this.presetSignal();
  }

  set preset(val: CronPreset) {
    this.presetSignal.set(val);
  }

  get expression(): string {
    return this.expressionSignal();
  }

  set expression(val: string) {
    this.expressionSignal.set(val);
  }

  // Predefined cron presets
  readonly presetOptions = computed(() => [
    { value: 'custom', label: 'Custom Expression' },
    { value: 'hourly', label: 'Every Hour' },
    { value: 'daily', label: 'Daily at 9 AM' },
    { value: 'weekly', label: 'Weekly (Monday 9 AM)' },
    { value: 'monthly', label: 'Monthly (1st day, 9 AM)' }
  ]);

  readonly presetExpressions: Record<CronPreset, string> = {
    custom: '',
    hourly: '0 * * * *',
    daily: '0 9 * * *',
    weekly: '0 9 * * 1',
    monthly: '0 9 1 * *'
  };

  // Modern Angular 20: Use computed for derived state
  readonly currentValue = computed<CronValue>(() => ({
    preset: this.preset,
    expression: this.expression,
    description: this.getCronDescription()
  }));

  readonly isCustom = computed(() => this.preset === 'custom');

  readonly isValidCron = computed(() => {
    if (!this.expression.trim()) return false;
    
    // Basic cron validation (simplified)
    const parts = this.expression.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    
    // Check each part is either *, number, or valid range/list
    return parts.every(part => 
      /^(\*|(\d+(-\d+)?(,\d+(-\d+)?)*))$/.test(part) ||
      /^(\*\/\d+)$/.test(part) // step values
    );
  });

  readonly placeholder = computed(() => {
    if (this.preset === 'custom') {
      return 'e.g., 0 9 * * * (daily at 9 AM)';
    }
    return this.presetExpressions[this.preset];
  });

  handlePresetChange(preset: string | null): void {
    if (preset === null) return;
    
    this.preset = preset as CronPreset;
    
    if (preset !== 'custom') {
      this.expression = this.presetExpressions[preset as CronPreset];
    }
    
    this.emitChange();
  }

  handleExpressionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.expression = target.value;
    
    // If user types a custom expression, switch to custom mode
    if (!Object.values(this.presetExpressions).includes(target.value)) {
      this.preset = 'custom';
    }
    
    this.emitChange();
  }

  private getCronDescription(): string {
    const expr = this.expression.trim();
    if (!expr || !this.isValidCron()) return 'Invalid cron expression';

    // Simple cron description generator (basic cases)
    const parts = expr.split(/\s+/);
    const [minute, hour, day, month, weekday] = parts;

    if (expr === '0 * * * *') return 'Every hour';
    if (expr === '0 9 * * *') return 'Daily at 9:00 AM';
    if (expr === '0 9 * * 1') return 'Every Monday at 9:00 AM';
    if (expr === '0 9 1 * *') return 'Monthly on the 1st at 9:00 AM';
    if (expr === '*/15 * * * *') return 'Every 15 minutes';
    if (expr === '0 */6 * * *') return 'Every 6 hours';
    
    // For other expressions, provide a basic description
    let desc = 'At ';
    if (minute === '0' && hour !== '*') {
      desc += `${hour}:00`;
    } else if (minute !== '*' && hour !== '*') {
      desc += `${hour}:${minute.padStart(2, '0')}`;
    } else {
      desc = 'Custom schedule';
    }
    
    if (weekday !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      desc += ` on ${days[parseInt(weekday)]}`;
    } else if (day !== '*' && day !== '1') {
      desc += ` on day ${day}`;
    }

    return desc;
  }

  private emitChange(): void {
    const value = this.currentValue();
    this.onChange(value);
    this.cronChange.emit(value);
  }

  // ControlValueAccessor implementation
  writeValue(value: CronValue | string | null): void {
    if (typeof value === 'string') {
      // Handle string input (just the cron expression)
      this.expressionSignal.set(value);
      // Try to match against presets
      const matchedPreset = Object.entries(this.presetExpressions).find(
        ([, expr]) => expr === value
      );
      this.presetSignal.set(matchedPreset ? matchedPreset[0] as CronPreset : 'custom');
    } else if (value && typeof value === 'object') {
      // Handle full CronValue object
      this.presetSignal.set(value.preset);
      this.expressionSignal.set(value.expression);
    } else {
      // Default values
      this.presetSignal.set('daily');
      this.expressionSignal.set('0 9 * * *');
    }
  }

  registerOnChange(fn: (value: CronValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Note: With input() signals, disabled state is managed externally via input binding
  }
}
