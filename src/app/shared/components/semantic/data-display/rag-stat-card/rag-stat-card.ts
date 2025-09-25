import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrendingUp, TrendingDown, Minus } from 'lucide-angular';
import { RagIcon } from '../../../atomic';

export interface StatCardData {
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: any; // Now accepts icon component instead of string
}

@Component({
  selector: 'rag-stat-card',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-stat-card.html',
  styleUrl: './rag-stat-card.scss'
})
export class RagStatCard {
  // Icon constants
  readonly TrendingUpIcon = TrendingUp;
  readonly TrendingDownIcon = TrendingDown;
  readonly MinusIcon = Minus;
  
  readonly data = input.required<StatCardData>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly variant = input<'default' | 'minimal'>('default');

  readonly cardClasses = computed(() => [
    'rag-stat-card',
    `rag-stat-card--${this.size()}`,
    `rag-stat-card--${this.variant()}`
  ].join(' '));

  readonly trendClasses = computed(() => {
    const trend = this.data().change?.trend;
    if (!trend) return '';
    
    return [
      'rag-stat-card__change',
      `rag-stat-card__change--${trend}`
    ].join(' ');
  });
}
