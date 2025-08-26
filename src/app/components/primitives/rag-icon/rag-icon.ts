import { Component, Input, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-icon',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './rag-icon.html',
  styleUrl: './rag-icon.scss'
})
export class RagIcon {
  @Input({ required: true }) name!: string;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() color?: string;
  @Input() strokeWidth: number = 2;

  // Modern Angular 20: Use computed for derived state
  readonly iconClasses = computed(() => [
    'rag-icon',
    `rag-icon--${this.size}`
  ].join(' '));

  readonly iconStyles = computed(() => ({
    'color': this.color || 'currentColor',
    'stroke-width': this.strokeWidth
  }))
}
