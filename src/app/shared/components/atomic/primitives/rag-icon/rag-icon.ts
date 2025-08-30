import { Component, input, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { ComponentArchetypes } from '../../../../tokens/design-tokens';

@Component({
  selector: 'rag-icon',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './rag-icon.html',
  styleUrl: './rag-icon.scss'
})
export class RagIcon {
  // Modern Angular 20: Use input() with proper typing
  readonly img = input.required<any>(); // The actual icon component
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl' | number>('md');
  readonly variant = input<'default' | 'subtle' | 'muted' | 'primary' | 'success' | 'warning' | 'danger'>('default');
  readonly color = input<string>();
  readonly strokeWidth = input<number>(2);

  // Modern Angular 20: Use computed for derived state
  readonly iconClasses = computed(() => [
    'rag-icon',
    typeof this.size() === 'string' ? `rag-icon--${this.size()}` : '',
    this.variant() !== 'default' ? `rag-icon--${this.variant()}` : ''
  ].filter(Boolean).join(' '));

  readonly iconSize = computed(() => {
    const size = this.size();
    if (typeof size === 'number') {
      return size;
    }
    // Use design tokens as single source of truth
    const tokenSize = ComponentArchetypes.icon.size[size as keyof typeof ComponentArchetypes.icon.size];
    return parseInt(tokenSize.replace('px', ''), 10);
  });

  readonly iconStyles = computed(() => {
    const styles: Record<string, any> = {
      'stroke-width': this.strokeWidth()
    };

    // Handle custom color or size
    if (this.color()) {
      styles['color'] = this.color();
    }
    
    if (typeof this.size() === 'number') {
      styles['width'] = `${this.size()}px`;
      styles['height'] = `${this.size()}px`;
    }

    return styles;
  });
}
