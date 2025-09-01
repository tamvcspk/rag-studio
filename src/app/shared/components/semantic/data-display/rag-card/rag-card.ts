import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type RagCardVariant = 'default' | 'elevated' | 'floating';

@Component({
  selector: 'rag-card',
  imports: [CommonModule],
  templateUrl: './rag-card.html',
  styleUrl: './rag-card.scss'
})
export class RagCard {
  readonly variant = input<RagCardVariant>('default');
  readonly padding = input<boolean>(true);
  readonly interactive = input<boolean>(false);
  
  readonly cardClasses = computed(() => [
    'rag-card',
    `rag-card--${this.variant()}`,
    this.interactive() ? 'rag-card--interactive' : '',
    this.padding() ? 'rag-card--padded' : ''
  ].filter(Boolean).join(' '));
}
