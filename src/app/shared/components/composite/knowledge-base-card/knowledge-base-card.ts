import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Globe, FileText, RefreshCw, Download, Trash2, Pause, X, LoaderCircle } from 'lucide-angular';
import { KnowledgeBase, KnowledgeBaseStatus } from '../../../types';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagBadge } from '../../atomic/primitives/rag-badge/rag-badge';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagProgress } from '../../atomic/primitives/rag-progress/rag-progress';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';

@Component({
  selector: 'app-knowledge-base-card',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    RagCard,
    RagBadge,
    RagButton,
    RagProgress
  ],
  templateUrl: './knowledge-base-card.html',
  styleUrl: './knowledge-base-card.scss'
})
export class KnowledgeBaseCardComponent {
  readonly knowledgeBase = input.required<KnowledgeBase>();
  readonly showActions = input(true);

  readonly reindex = output<string>();
  readonly export = output<string>();
  readonly delete = output<string>();
  readonly pause = output<string>();
  readonly cancel = output<string>();

  readonly statusConfig = computed(() => {
    const status = this.knowledgeBase().status;
    const configs: Record<KnowledgeBaseStatus, { 
      badge: { variant: 'solid' | 'soft' | 'outline'; color: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple'; icon?: any }; 
      icon: { component: any; color: string } 
    }> = {
      'indexed': {
        badge: { variant: 'solid' as const, color: 'green' as const },
        icon: { component: Globe, color: 'var(--blue-9)' }
      },
      'indexing': {
        badge: { variant: 'solid' as const, color: 'amber' as const, icon: LoaderCircle },
        icon: { component: FileText, color: 'var(--amber-9)' }
      },
      'failed': {
        badge: { variant: 'solid' as const, color: 'red' as const },
        icon: { component: FileText, color: 'var(--red-9)' }
      },
      'pending': {
        badge: { variant: 'soft' as const, color: 'gray' as const },
        icon: { component: FileText, color: 'var(--gray-9)' }
      }
    };
    return configs[status];
  });

  readonly isIndexing = computed(() => this.knowledgeBase().status === 'indexing');
  readonly isFailed = computed(() => this.knowledgeBase().status === 'failed');
  readonly isIndexed = computed(() => this.knowledgeBase().status === 'indexed');

  readonly iconComponents = {
    RefreshCw,
    Download,
    Trash2,
    Pause,
    X
  };

  readonly Math = Math; // Expose Math object to template

  onReindex(): void {
    this.reindex.emit(this.knowledgeBase().id);
  }

  onExport(): void {
    this.export.emit(this.knowledgeBase().id);
  }

  onDelete(): void {
    this.delete.emit(this.knowledgeBase().id);
  }

  onPause(): void {
    this.pause.emit(this.knowledgeBase().id);
  }

  onCancel(): void {
    this.cancel.emit(this.knowledgeBase().id);
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  }
}
