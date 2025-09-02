import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';

type IconComponent = any; // Type for icon components
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';

@Component({
  selector: 'rag-empty-state-panel',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    RagCard,
    RagButton
  ],
  templateUrl: './empty-state-panel.html',
  styleUrl: './empty-state-panel.scss'
})
export class EmptyStatePanel {
  readonly icon = input.required<IconComponent>();
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly actionLabel = input<string>();
  readonly showAction = input(true);

  readonly action = output<void>();

  onAction(): void {
    this.action.emit();
  }
}
