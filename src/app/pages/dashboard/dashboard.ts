import { Component, signal, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStatsGrid } from '../../shared/components/composite/dashboard-stats-grid/dashboard-stats-grid';
import { QueryPerformanceMetrics } from '../../shared/components/composite/query-performance-metrics/query-performance-metrics';
import { RecentActivityLog } from '../../shared/components/composite/recent-activity-log/recent-activity-log';
import { McpServerStatus } from '../../shared/components/composite/mcp-server-status/mcp-server-status';
import { RagAlert } from '../../shared/components/atomic/feedback/rag-alert/rag-alert';
import { RagCard } from '../../shared/components/semantic/data-display/rag-card/rag-card';
import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { BarChart3, Settings } from 'lucide-angular';
import { AppStore } from '../../shared/store/app.store';
import { KnowledgeBasesStore } from '../../shared/store/knowledge-bases.store';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    DashboardStatsGrid,
    QueryPerformanceMetrics,
    RecentActivityLog,
    McpServerStatus,
    RagAlert,
    RagCard,
    RagPageHeader
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {
  readonly showMaintenanceAlert = signal(true);
  readonly isLoading = signal(false);

  // Inject appropriate stores for different concerns
  readonly appStore = inject(AppStore);
  readonly kbStore = inject(KnowledgeBasesStore);

  // Icon components
  readonly BarChart3Icon = BarChart3;
  readonly SettingsIcon = Settings;

  // Dashboard status computed from system status (not just KB status)
  readonly dashboardStatus = computed(() => {
    if (!this.appStore.isInitialized() || !this.kbStore.isInitialized()) {
      return { status: 'initializing', message: 'Loading RAG Studio...' };
    }

    // Check system-wide status first
    const systemStatus = this.appStore.systemStatus();
    if (systemStatus.status === 'error') {
      return { status: 'error', message: systemStatus.message };
    }

    // Check KB-specific status
    const lastError = this.kbStore.lastError();
    if (lastError) {
      return { status: 'error', message: lastError };
    }

    const kbs = this.kbStore.knowledgeBases();
    const runs = this.kbStore.runs();

    if (runs.length > 0) {
      return { status: 'indexing', message: `${runs.length} knowledge base(s) indexing...` };
    }

    if (kbs.length === 0) {
      return { status: 'empty', message: 'No knowledge bases created yet' };
    }

    return { status: 'ready', message: `${kbs.length} knowledge base(s) ready | ${systemStatus.message}` };
  });

  // Page header actions
  readonly headerActions = signal([
    {
      label: 'Settings',
      icon: Settings,
      variant: 'outline' as const,
      action: () => this.openSettings()
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      variant: 'solid' as const,
      action: () => this.openAnalytics()
    }
  ]);

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);

    try {
      // Initialize both stores (order matters: AppStore first for system-wide state)
      if (!this.appStore.isInitialized()) {
        await this.appStore.initialize();
      }
      if (!this.kbStore.isInitialized()) {
        await this.kbStore.initialize();
      }

      console.log('✅ Dashboard initialized with proper store separation');
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    // Store cleanup is handled by the store itself (singleton)
    // The dashboard doesn't need to destroy the store
  }

  dismissMaintenanceAlert(): void {
    this.showMaintenanceAlert.set(false);
  }

  openSettings(): void {
    // Navigate to settings
    console.log('Opening settings...');
  }

  openAnalytics(): void {
    // Navigate to analytics
    console.log('Opening analytics...');
  }
}
