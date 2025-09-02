import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-spinner.html',
  styleUrl: './rag-spinner.scss'
})
export class RagSpinner {
  // Modern Angular 20: Use input() with proper typing
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly color = input<string>();
  readonly diameter = input<number>();
  readonly mode = input<'determinate' | 'indeterminate'>('indeterminate');
  readonly strokeWidth = input<number>(2);

  // Modern Angular 20: Use computed for derived state
  readonly spinnerClasses = computed(() => [
    'rt-Spinner',
    `rt-size-${this.size()}`,
    `rt-mode-${this.mode()}`
  ].filter(Boolean).join(' '));

  readonly spinnerStyles = computed(() => {
    const styles: { [key: string]: string } = {};
    
    const color = this.color();
    if (color) {
      styles['border-top-color'] = color;
    }
    
    const diameter = this.diameter();
    if (diameter) {
      styles['width'] = `${diameter}px`;
      styles['height'] = `${diameter}px`;
    }
    
    const strokeWidth = this.strokeWidth();
    if (strokeWidth) {
      styles['border-width'] = `${strokeWidth}px`;
    }
    
    return styles;
  })
}
