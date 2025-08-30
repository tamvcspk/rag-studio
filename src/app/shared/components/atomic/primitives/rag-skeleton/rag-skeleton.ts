import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rag-skeleton.html',
  styleUrl: './rag-skeleton.scss'
})
export class RagSkeleton {
  // Modern Angular 20: Use input() with proper typing
  readonly variant = input<'text' | 'circular' | 'rectangular'>('text');
  readonly width = input<string | number>('100%');
  readonly height = input<string | number>('1rem');
  readonly count = input(1);

  // Modern Angular 20: Use computed for derived state
  readonly skeletonClasses = computed(() => [
    'rt-Skeleton',
    `rt-variant-${this.variant()}`
  ].join(' '));

  readonly skeletonStyles = computed(() => {
    const styles: Record<string, string> = {};
    const width = this.width();
    const height = this.height();
    
    if (typeof width === 'number') {
      styles['width'] = `${width}px`;
    } else {
      styles['width'] = width;
    }
    
    if (typeof height === 'number') {
      styles['height'] = `${height}px`;
    } else {
      styles['height'] = height;
    }
    
    return styles;
  });

  readonly skeletonArray = computed(() => Array(this.count()).fill(0));
}
