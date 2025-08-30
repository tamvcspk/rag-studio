import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStatsGrid } from '../../shared/components/composite/dashboard-stats-grid/dashboard-stats-grid';
import { QueryPerformanceMetrics } from '../../shared/components/composite/query-performance-metrics/query-performance-metrics';
import { RecentActivityLog } from '../../shared/components/composite/recent-activity-log/recent-activity-log';
import { McpServerStatus } from '../../shared/components/composite/mcp-server-status/mcp-server-status';
import { RagAlert } from '../../shared/components/atomic/feedback/rag-alert/rag-alert';
import { RagCard } from '../../shared/components/semantic/data-display/rag-card/rag-card';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { Loader2 } from 'lucide-angular';

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
    RagIcon
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  readonly showMaintenanceAlert = signal(true);
  readonly isLoading = signal(false);

  // Icon components
  readonly Loader2Icon = Loader2;

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
}
