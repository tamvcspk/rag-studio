import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagBadge } from '../../atomic/primitives/rag-badge/rag-badge';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { Activity } from 'lucide-angular';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  category?: string;
}

@Component({
  selector: 'rag-recent-activity-log',
  imports: [CommonModule, RagCard, RagBadge, RagIcon],
  templateUrl: './recent-activity-log.html',
  styleUrl: './recent-activity-log.scss'
})
export class RecentActivityLog implements OnInit {
  readonly activities = signal<ActivityLogEntry[]>([]);
  readonly maxEntries = signal(10);

  // Icon components
  readonly ActivityIcon = Activity;

  ngOnInit(): void {
    this.loadMockData();
  }

  private loadMockData(): void {
    const mockActivities: ActivityLogEntry[] = [
      {
        id: '1',
        timestamp: '10:45:23',
        level: 'info',
        message: 'Tool "angular.search" activated successfully',
        category: 'tools'
      },
      {
        id: '2',
        timestamp: '10:42:15',
        level: 'success',
        message: 'Pipeline "docs-sync" completed (1,234 documents)',
        category: 'pipelines'
      },
      {
        id: '3',
        timestamp: '10:38:47',
        level: 'info',
        message: 'Knowledge base "react-docs@18.2.0" indexed',
        category: 'knowledge-bases'
      },
      {
        id: '4',
        timestamp: '10:35:02',
        level: 'warning',
        message: 'Embedding cache 85% full, consider cleanup',
        category: 'system'
      },
      {
        id: '5',
        timestamp: '10:32:18',
        level: 'success',
        message: 'Tool "python.answer" registration successful',
        category: 'tools'
      },
      {
        id: '6',
        timestamp: '10:28:55',
        level: 'info',
        message: 'MCP server started on port 3000',
        category: 'system'
      },
      {
        id: '7',
        timestamp: '10:25:33',
        level: 'error',
        message: 'Failed to connect to external service',
        category: 'network'
      }
    ];

    this.activities.set(mockActivities.slice(0, this.maxEntries()));
  }

  getBadgeVariant(level: string): 'solid' | 'soft' | 'outline' {
    return 'soft';
  }

  getBadgeColor(level: string): 'gray' | 'blue' | 'green' | 'amber' | 'red' {
    switch (level) {
      case 'success': return 'green';
      case 'warning': return 'amber';
      case 'error': return 'red';
      case 'info': return 'blue';
      default: return 'gray';
    }
  }
}
