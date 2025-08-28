import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

type LucideIcon = any; // Type for Lucide icons
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';

@Component({
  selector: 'app-empty-state-panel',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    RagCard,
    RagButton
  ],
  templateUrl: './empty-state-panel.html',
  styleUrl: './empty-state-panel.scss'
})
export class EmptyStatePanelComponent {
  readonly icon = input.required<LucideIcon>();
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly actionLabel = input<string>();
  readonly showAction = input(true);

  readonly action = output<void>();

  onAction(): void {
    this.action.emit();
  }
}
