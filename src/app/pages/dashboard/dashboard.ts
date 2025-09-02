import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStatsGrid } from '../../shared/components/composite/dashboard-stats-grid/dashboard-stats-grid';
import { QueryPerformanceMetrics } from '../../shared/components/composite/query-performance-metrics/query-performance-metrics';
import { RecentActivityLog } from '../../shared/components/composite/recent-activity-log/recent-activity-log';
import { McpServerStatus } from '../../shared/components/composite/mcp-server-status/mcp-server-status';
import { RagAlert } from '../../shared/components/atomic/feedback/rag-alert/rag-alert';
import { RagCard } from '../../shared/components/semantic/data-display/rag-card/rag-card';
import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { BarChart3, Settings } from 'lucide-angular';

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
export class Dashboard implements OnInit {
  readonly showMaintenanceAlert = signal(true);
  readonly isLoading = signal(false);

  // Icon components
  readonly BarChart3Icon = BarChart3;
  readonly SettingsIcon = Settings;

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

  ngOnInit(): void {
    // Simulate initial loading
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 1000);
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
