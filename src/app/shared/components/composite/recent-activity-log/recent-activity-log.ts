import { Component, signal, OnInit, OnDestroy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { Activity } from 'lucide-angular';
import { AppStore, ActivityLogEntry } from '../../../store/app.store';
import { KnowledgeBasesStore } from '../../../store/knowledge-bases.store';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

@Component({
  selector: 'rag-recent-activity-log',
  imports: [CommonModule, RagCard, RagChip, RagIcon],
  templateUrl: './recent-activity-log.html',
  styleUrl: './recent-activity-log.scss'
})
export class RecentActivityLog implements OnInit, OnDestroy {
  readonly maxEntries = signal(10);

  // Icon components
  readonly ActivityIcon = Activity;

  // Inject proper stores for different domains
  private readonly appStore = inject(AppStore);
  private readonly kbStore = inject(KnowledgeBasesStore); // Only for KB-specific events
  private unlistenEvents?: UnlistenFn;

  // Get activities from AppStore
  readonly activities = this.appStore.recentActivity;

  async ngOnInit(): Promise<void> {
    // Initialize AppStore for activity logs
    if (!this.appStore.isInitialized()) {
      await this.appStore.initialize();
    }

    // Initialize KBStore for KB-specific events
    if (!this.kbStore.isInitialized()) {
      await this.kbStore.initialize();
    }

    // Setup KB-specific event listeners
    await this.setupKBEventListeners();
  }

  ngOnDestroy(): void {
    if (this.unlistenEvents) {
      this.unlistenEvents();
    }
  }

  private async setupKBEventListeners(): Promise<void> {
    try {
      // Listen specifically for KB-related events and forward to AppStore
      this.unlistenEvents = await listen<any>('state_delta', (event) => {
        const { type, payload } = event.payload;
        this.handleKBActivityEvent(type, payload);
      });
    } catch (error) {
      console.error('Failed to setup KB activity event listeners:', error);
    }
  }

  private handleKBActivityEvent(type: string, payload: any): void {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let entry: ActivityLogEntry | null = null;

    // Only handle KB-specific events, forward to AppStore
    switch (type) {
      case 'kb_created':
        entry = {
          id: `activity_${Date.now()}`,
          timestamp,
          level: 'success',
          message: `Knowledge base "${payload.kb?.name || 'New KB'}" created`,
          category: 'knowledge-bases'
        };
        break;

      case 'kb_deleted':
        entry = {
          id: `activity_${Date.now()}`,
          timestamp,
          level: 'info',
          message: `Knowledge base deleted`,
          category: 'knowledge-bases'
        };
        break;

      case 'kb_status_updated':
        if (payload.status === 'indexed') {
          entry = {
            id: `activity_${Date.now()}`,
            timestamp,
            level: 'success',
            message: `Knowledge base indexing completed`,
            category: 'knowledge-bases'
          };
        } else if (payload.status === 'failed') {
          entry = {
            id: `activity_${Date.now()}`,
            timestamp,
            level: 'error',
            message: `Knowledge base indexing failed`,
            category: 'knowledge-bases'
          };
        }
        break;

      case 'kb_indexing_progress':
        const progress = Math.round((payload.progress || 0) * 100);
        entry = {
          id: `activity_${Date.now()}`,
          timestamp,
          level: 'info',
          message: `Indexing progress: ${progress}% (${payload.step || 'processing'})`,
          category: 'knowledge-bases'
        };
        break;

      case 'search_completed':
        entry = {
          id: `activity_${Date.now()}`,
          timestamp,
          level: 'info',
          message: `Search completed in ${payload.latency_ms || 0}ms`,
          category: 'search'
        };
        break;

      default:
        // Skip non-KB events
        return;
    }

    // Forward KB events to AppStore for centralized activity management
    if (entry) {
      this.appStore.addActivity(entry);
    }
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
