import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';
import { RagDivider } from '../../../atomic/primitives/rag-divider/rag-divider';

export type RagSettingsSectionVariant = 'default' | 'card' | 'inline';

@Component({
  selector: 'rag-settings-section',
  standalone: true,
  imports: [CommonModule, RagIcon, RagDivider],
  templateUrl: './rag-settings-section.html',
  styleUrl: './rag-settings-section.scss'
})
export class RagSettingsSection {
  // Modern Angular 20: Use input() with proper typing
  readonly title = input<string>();
  readonly description = input<string>();
  readonly icon = input<any>(); // Lucide icon
  readonly variant = input<RagSettingsSectionVariant>('default');
  readonly spacing = input<'sm' | 'md' | 'lg' | 'xl'>('lg');

  // Modern Angular 20: Use computed for derived state
  readonly sectionClasses = computed(() => [
    'rag-settings-section',
    `rag-settings-section--${this.variant()}`,
    `rag-settings-section--spacing-${this.spacing()}`
  ].filter(Boolean).join(' '));
}