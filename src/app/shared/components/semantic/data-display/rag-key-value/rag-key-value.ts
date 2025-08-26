import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface KeyValuePair {
  key: string;
  value: string | number | boolean;
  icon?: string;
  copyable?: boolean;
}

@Component({
  selector: 'rag-key-value',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './rag-key-value.html',
  styleUrl: './rag-key-value.scss'
})
export class RagKeyValue {
  readonly data = input.required<KeyValuePair>();
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly variant = input<'default' | 'compact' | 'highlighted'>('default');
  readonly truncate = input<boolean>(false);

  readonly containerClasses = computed(() => [
    'rag-key-value',
    `rag-key-value--${this.orientation()}`,
    `rag-key-value--${this.variant()}`,
    this.truncate() ? 'rag-key-value--truncate' : ''
  ].filter(Boolean).join(' '));

  readonly displayValue = computed(() => {
    const value = this.data().value;
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  });

  async copyValue(): Promise<void> {
    if (this.data().copyable) {
      try {
        await navigator.clipboard.writeText(String(this.data().value));
      } catch (err) {
        console.error('Failed to copy value:', err);
      }
    }
  }
}
