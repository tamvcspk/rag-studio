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
  readonly variant = input<'text' | 'heading' | 'button' | 'card' | 'circle'>('text');
  readonly width = input<string>();
  readonly height = input<string>();
  readonly count = input(1);

  // Modern Angular 20: Use computed for derived state
  readonly skeletonClasses = computed(() => [
    'rt-Skeleton',
    `rt-${this.variant()}`
  ].join(' '));

  readonly skeletonStyles = computed(() => {
    const styles: Record<string, string> = {};
    const width = this.width();
    const height = this.height();
    if (width) styles['width'] = width;
    if (height) styles['height'] = height;
    return styles;
  });

  readonly skeletonArray = computed(() => Array(this.count()).fill(0))
}
