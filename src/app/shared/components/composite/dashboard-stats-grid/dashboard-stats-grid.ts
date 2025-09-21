import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagStatCard, StatCardData } from '../../semantic/data-display/rag-stat-card/rag-stat-card';
import { GitBranchIcon, WrenchIcon, BookOpenIcon, WorkflowIcon } from 'lucide-angular';
import { AppStore } from '../../../store/app.store';
import { KnowledgeBasesStore } from '../../../store/knowledge-bases.store';

export interface DashboardStats {
  flows: {
    total: number;
    active: number;
    draft: number;
  };
  activeTools: {
    total: number;
    search: number;
    answer: number;
  };
  knowledgeBases: {
    total: number;
    totalSize: string;
  };
  activePipelines: {
    total: number;
    nextRun: string;
  };
}

@Component({
  selector: 'rag-dashboard-stats-grid',
  imports: [CommonModule, RagStatCard],
  templateUrl: './dashboard-stats-grid.html',
  styleUrl: './dashboard-stats-grid.scss'
})
export class DashboardStatsGrid implements OnInit, OnDestroy {
  // Icon components
  readonly gitBranchIcon = GitBranchIcon;
  readonly wrenchIcon = WrenchIcon;
  readonly bookOpenIcon = BookOpenIcon;
  readonly workflowIcon = WorkflowIcon;

  // Inject appropriate stores for different domains
  private readonly appStore = inject(AppStore);
  private readonly kbStore = inject(KnowledgeBasesStore);

  // Live data computed from appropriate stores
  readonly stats = computed((): DashboardStats => {
    const kbMetrics = this.kbStore.computedMetrics();
    const kbRuns = this.kbStore.runs();
    const crossDomainStats = this.appStore.crossDomainStats();

    // Calculate total size from KB data (simplified)
    const totalSizeMB = Math.round(kbMetrics.total_chunks * 0.2); // Rough estimate: 0.2MB per 1000 chunks
    const totalSizeText = totalSizeMB > 1024
      ? `${(totalSizeMB / 1024).toFixed(1)} GB`
      : `${totalSizeMB} MB`;

    return {
      activeTools: {
        total: crossDomainStats.totalTools,
        search: Math.floor(crossDomainStats.activeTools * 0.6), // Mock breakdown
        answer: Math.floor(crossDomainStats.activeTools * 0.4)
      },
      knowledgeBases: {
        total: kbMetrics.total_kbs,
        totalSize: totalSizeText
      },
      activePipelines: {
        total: crossDomainStats.totalPipelines,
        nextRun: kbRuns.length > 0 ? 'Running now' : 'None scheduled'
      },
      flows: {
        total: crossDomainStats.totalFlows,
        active: crossDomainStats.activeFlows,
        draft: crossDomainStats.totalFlows - crossDomainStats.activeFlows
      },
    };
  });

  readonly statCards = computed((): StatCardData[] => {
    const currentStats = this.stats();
    
    return [
      {
        label: 'Active Tools',
        value: currentStats.activeTools.total,
        icon: this.wrenchIcon
      },
      {
        label: 'Knowledge Bases',
        value: currentStats.knowledgeBases.total,
        icon: this.bookOpenIcon
      },
      {
        label: 'Active Pipelines',
        value: currentStats.activePipelines.total,
        icon: this.workflowIcon
      },
      {
        label: 'Flows',
        value: currentStats.flows.total,
        icon: this.gitBranchIcon
      },
    ];
  });

  async ngOnInit() {
    // Initialize both stores
    if (!this.appStore.isInitialized()) {
      await this.appStore.initialize();
    }
    if (!this.kbStore.isInitialized()) {
      await this.kbStore.initialize();
    }
  }

  ngOnDestroy() {
    // Store cleanup is handled by the store itself (singleton)
    // Individual components don't need to destroy the store
  }
}
