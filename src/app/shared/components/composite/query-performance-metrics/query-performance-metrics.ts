import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RefreshCw } from 'lucide-angular';

export interface PerformanceMetrics {
  p50Latency: string;
  p95Latency: string;
  hitRate: string;
  totalQueries: number;
  period: string;
}

@Component({
  selector: 'rag-query-performance-metrics',
  imports: [CommonModule, RagCard, RagButton, RagIcon],
  templateUrl: './query-performance-metrics.html',
  styleUrl: './query-performance-metrics.scss'
})
export class QueryPerformanceMetrics {
  // Icon components
  readonly RefreshCwIcon = RefreshCw;
  
  // Mock data - in real app this would come from a service
  readonly metrics = signal<PerformanceMetrics>({
    p50Latency: '124ms',
    p95Latency: '287ms',
    hitRate: '94.2%',
    totalQueries: 1247,
    period: 'Last 24 hours'
  });

  readonly isRefreshing = signal(false);

  refresh(): void {
    this.isRefreshing.set(true);
    
    // Simulate API call
    setTimeout(() => {
      // Update with new mock data
      this.metrics.update(current => ({
        ...current,
        p50Latency: `${Math.floor(Math.random() * 50) + 100}ms`,
        p95Latency: `${Math.floor(Math.random() * 100) + 250}ms`,
        hitRate: `${(Math.random() * 5 + 92).toFixed(1)}%`,
        totalQueries: Math.floor(Math.random() * 500) + 1000
      }));
      
      this.isRefreshing.set(false);
    }, 1000);
  }
}
