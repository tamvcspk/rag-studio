import { Component, input, computed, contentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertCircle } from 'lucide-angular';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

export type RagFormFieldSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'rag-form-field',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-form-field.html',
  styleUrl: './rag-form-field.scss'
})
export class RagFormField {
  // Modern Angular 20: Use input() with proper typing
  readonly label = input<string>();
  readonly description = input<string>();
  readonly error = input<string>();
  readonly required = input(false);
  readonly size = input<RagFormFieldSize>('md');

  // Icon constants
  readonly AlertCircleIcon = AlertCircle;
  readonly disabled = input(false);
  readonly htmlFor = input<string>();

  // Content projection for custom input elements
  readonly inputTemplate = contentChild<TemplateRef<any>>('input');

  // Modern Angular 20: Use computed for derived state
  readonly fieldClasses = computed(() => [
    'rag-form-field',
    `rag-form-field--${this.size()}`,
    this.disabled() ? 'rag-form-field--disabled' : '',
    this.error() ? 'rag-form-field--error' : ''
  ].filter(Boolean).join(' '));

  readonly labelClasses = computed(() => [
    'rag-form-field__label',
    this.required() ? 'rag-form-field__label--required' : ''
  ].filter(Boolean).join(' '));
}
