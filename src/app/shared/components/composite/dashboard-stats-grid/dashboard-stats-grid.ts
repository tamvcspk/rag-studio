import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagStatCard, StatCardData } from '../../semantic/data-display/rag-stat-card/rag-stat-card';
import { LucideAngularModule } from 'lucide-angular';

export interface DashboardStats {
  mcpServer: {
    status: 'active' | 'inactive' | 'error';
    port: number;
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
  imports: [CommonModule, RagStatCard, LucideAngularModule],
  templateUrl: './dashboard-stats-grid.html',
  styleUrl: './dashboard-stats-grid.scss'
})
export class DashboardStatsGrid {
  // Mock data - in real app this would come from a service
  readonly stats = signal<DashboardStats>({
    mcpServer: {
      status: 'active',
      port: 3000
    },
    activeTools: {
      total: 7,
      search: 3,
      answer: 4
    },
    knowledgeBases: {
      total: 12,
      totalSize: '245 MB'
    },
    activePipelines: {
      total: 3,
      nextRun: '2h 15m'
    }
  });

  readonly statCards = computed((): StatCardData[] => {
    const currentStats = this.stats();
    
    return [
      {
        label: 'MCP Server',
        value: currentStats.mcpServer.status === 'active' ? 'Active' : 'Inactive',
        icon: 'server'
      },
      {
        label: 'Active Tools',
        value: currentStats.activeTools.total,
        icon: 'wrench'
      },
      {
        label: 'Knowledge Bases',
        value: currentStats.knowledgeBases.total,
        icon: 'book-open'
      },
      {
        label: 'Active Pipelines',
        value: currentStats.activePipelines.total,
        icon: 'workflow'
      }
    ];
  });
}
