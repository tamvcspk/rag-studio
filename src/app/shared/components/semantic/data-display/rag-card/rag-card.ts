import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagSpinner } from '../../../atomic';

export type RagCardVariant = 'default' | 'elevated' | 'floating';

@Component({
  selector: 'rag-card',
  standalone: true,
  imports: [CommonModule, RagSpinner],
  templateUrl: './rag-card.html',
  styleUrl: './rag-card.scss'
})
export class RagCard {
  readonly variant = input<RagCardVariant>('default');
  readonly padding = input<boolean>(true);
  readonly interactive = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly loadingText = input<string>('Loading...');
  
  readonly cardClasses = computed(() => [
    'rag-card',
    `rag-card--${this.variant()}`,
    this.interactive() ? 'rag-card--interactive' : '',
    this.padding() ? 'rag-card--padded' : '',
    this.loading() ? 'rag-card--loading' : ''
  ].filter(Boolean).join(' '));
}
