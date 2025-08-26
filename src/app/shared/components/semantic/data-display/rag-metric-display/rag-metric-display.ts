import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  target?: number;
  threshold?: {
    good: number;
    warning: number;
  };
  format?: 'number' | 'percentage' | 'duration' | 'bytes';
}

@Component({
  selector: 'rag-metric-display',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './rag-metric-display.html',
  styleUrl: './rag-metric-display.scss'
})
export class RagMetricDisplay {
  readonly metric = input.required<PerformanceMetric>();
  readonly showTarget = input<boolean>(true);
  readonly variant = input<'default' | 'compact' | 'detailed'>('default');

  readonly metricStatus = computed(() => {
    const metric = this.metric();
    const threshold = metric.threshold;
    
    if (!threshold) return 'neutral';
    
    if (metric.value <= threshold.good) return 'good';
    if (metric.value <= threshold.warning) return 'warning';
    return 'critical';
  });

  readonly formattedValue = computed(() => {
    const metric = this.metric();
    const format = metric.format || 'number';
    
    switch (format) {
      case 'percentage':
        return `${metric.value.toFixed(1)}%`;
      case 'duration':
        return this.formatDuration(metric.value);
      case 'bytes':
        return this.formatBytes(metric.value);
      default:
        return `${metric.value.toLocaleString()}${metric.unit}`;
    }
  });

  readonly progressPercentage = computed(() => {
    const metric = this.metric();
    if (!metric.target) return null;
    
    const percentage = (metric.value / metric.target) * 100;
    return Math.min(percentage, 100);
  });

  readonly containerClasses = computed(() => [
    'rag-metric-display',
    `rag-metric-display--${this.variant()}`,
    `rag-metric-display--${this.metricStatus()}`
  ].join(' '));

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
