import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

export type RagSettingsItemLayout = 'horizontal' | 'vertical';

@Component({
  selector: 'rag-settings-item',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-settings-item.html',
  styleUrl: './rag-settings-item.scss'
})
export class RagSettingsItem {
  // Modern Angular 20: Use input() with proper typing
  readonly label = input<string>();
  readonly description = input<string>();
  readonly icon = input<any>(); // Lucide icon
  readonly required = input(false);
  readonly layout = input<RagSettingsItemLayout>('horizontal');
  readonly htmlFor = input<string>();

  // Modern Angular 20: Use computed for derived state
  readonly itemClasses = computed(() => [
    'rag-settings-item',
    `rag-settings-item--${this.layout()}`
  ].filter(Boolean).join(' '));

  readonly iconSize = computed(() => 
    this.layout() === 'vertical' ? 'md' : 'sm'
  );
}