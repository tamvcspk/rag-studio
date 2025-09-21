import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RefreshCw } from 'lucide-angular';
import { AppStore } from '../../../store/app.store';

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
export class QueryPerformanceMetrics implements OnInit, OnDestroy {
  // Icon components
  readonly RefreshCwIcon = RefreshCw;

  // Inject AppStore for performance metrics (not KB-specific)
  private readonly appStore = inject(AppStore);

  // Live metrics computed from AppStore
  readonly metrics = computed((): PerformanceMetrics => {
    const storeMetrics = this.appStore.performanceMetrics();

    return {
      p50Latency: `${storeMetrics.p50Latency}ms`,
      p95Latency: `${storeMetrics.p95Latency}ms`,
      hitRate: `${storeMetrics.hitRate.toFixed(1)}%`,
      totalQueries: storeMetrics.totalQueries,
      period: storeMetrics.period
    };
  });

  readonly isRefreshing = signal(false);

  async refresh(): Promise<void> {
    this.isRefreshing.set(true);

    try {
      // Refresh performance metrics from AppStore
      await this.appStore.refreshPerformanceMetrics();

      // Note: Metrics are computed signals, so they'll automatically update
      // when the store data refreshes

    } catch (error) {
      console.error('Failed to refresh performance metrics:', error);
    } finally {
      this.isRefreshing.set(false);
    }
  }

  async ngOnInit() {
    // Initialize the AppStore if not already done
    if (!this.appStore.isInitialized()) {
      await this.appStore.initialize();
    }
  }

  ngOnDestroy() {
    // Store cleanup is handled by the store itself (singleton)
    // Individual components don't need to destroy the store
  }
}
