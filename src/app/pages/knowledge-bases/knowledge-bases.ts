import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookOpen, Plus, Upload, Search, CheckCircle, AlertTriangle, Clock, Pause } from 'lucide-angular';
import { Observable, map } from 'rxjs';
import { 
  KnowledgeBase, 
  CreateKBFormData,
  KnowledgeBaseStatus 
} from '../../shared/types';
import { KnowledgeBasesStore } from '../../shared/store/knowledge-bases.store';
import { KnowledgeBaseCard } from '../../shared/components/composite/knowledge-base-card/knowledge-base-card';
import { CreateKBWizard } from '../../shared/components/composite/create-kb-wizard/create-kb-wizard';
import { KBPipelineCreator } from '../../shared/components/composite/kb-pipeline-creator/kb-pipeline-creator';
import { EmptyStatePanel } from '../../shared/components/composite/empty-state-panel/empty-state-panel';
import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { RagStatsOverview, StatItem } from '../../shared/components/semantic/data-display/rag-stats-overview';
import { RagDialogService } from '../../shared/components/semantic/overlay/rag-dialog/rag-dialog.service';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';

type FilterType = 'all' | 'indexed' | 'indexing' | 'failed';

@Component({
  selector: 'app-knowledge-bases',
  standalone: true,
  imports: [
    CommonModule,
    KnowledgeBaseCard,
    RagPageHeader,
    RagStatsOverview,
    EmptyStatePanel
  ],
  templateUrl: './knowledge-bases.html',
  styleUrl: './knowledge-bases.scss'
})
export class KnowledgeBases implements OnInit {
  private readonly store = inject(KnowledgeBasesStore);
  private readonly dialogService = inject(RagDialogService);
  private readonly toastService = inject(RagToastService);
  
  // Icon components
  readonly SearchIcon = Search;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly ClockIcon = Clock;
  readonly PauseIcon = Pause;

  // Use signals from the store for real-time updates
  private readonly allKnowledgeBases = this.store.knowledgeBases;
  readonly searchQuery = signal('');
  readonly selectedFilters = signal<string[]>([]);
  private statusFilter = signal<FilterType>('all');
  readonly isLoading = this.store.isLoading;

  // Computed filtered knowledge bases
  readonly filteredKBs = computed(() => {
    const kbs = this.allKnowledgeBases();
    const query = this.searchQuery().toLowerCase().trim();
    const selectedFilters = this.selectedFilters();
    
    if (!kbs || kbs.length === 0) {
      return [];
    }
    
    // First filter by search query
    let filteredKBs = !query ? kbs : kbs.filter(kb => {
      if (!kb) return false;

      // Check if query matches any searchable field
      return [
        kb.name?.toLowerCase() || '',
        kb.product?.toLowerCase() || '',
        kb.description?.toLowerCase() || '',
        kb.version?.toLowerCase() || ''
      ].some(field => field.includes(query));
    });
    
    // Then filter by selected status filters if any
    if (selectedFilters.length > 0) {
      // Map stat IDs to KB statuses
      const statusMapping: Record<string, KnowledgeBaseStatus> = {
        'indexed': 'indexed',
        'indexing': 'indexing',
        'failed': 'failed'
      };
      
      filteredKBs = filteredKBs.filter(kb => {
        if (!kb.status) return false;
        
        // Check if KB status matches any selected filter
        return selectedFilters.some(filterId => {
          const mappedStatus = statusMapping[filterId];
          return mappedStatus && kb.status === mappedStatus;
        });
      });
    }
    
    return filteredKBs;
  });

  readonly isEmpty = computed(() => this.allKnowledgeBases().length === 0);
  readonly hasResults = computed(() => this.filteredKBs().length > 0);
  readonly totalCount = computed(() => this.allKnowledgeBases().length);
  readonly filteredCount = computed(() => this.filteredKBs().length);

  // Use computed statistics from the store
  readonly kbStats = computed(() => {
    const metrics = this.store.computedMetrics();
    return {
      total: metrics.total_kbs,
      indexed: metrics.indexed_kbs,
      indexing: metrics.indexing_kbs,
      failed: metrics.failed_kbs
    };
  });
  
  // Computed statistics for overview component
  readonly kbStatsItems = computed(() => {
    const stats = this.kbStats();
    const items: StatItem[] = [
      {
        id: 'total',
        label: 'Total KBs',
        value: stats.total,
        icon: this.iconComponents.BookOpen,
        color: 'blue',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'indexed',
        label: 'Indexed',
        value: stats.indexed,
        icon: this.CheckCircleIcon,
        color: 'green',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'indexing',
        label: 'Indexing',
        value: stats.indexing,
        icon: this.ClockIcon,
        color: 'amber',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'failed',
        label: 'Failed',
        value: stats.failed,
        icon: this.AlertTriangleIcon,
        color: 'red',
        variant: 'solid',
        clickable: true
      }
    ];
    return items;
  });

  readonly filterOptions = computed(() => {
    const stats = this.kbStats();
    return [
      { value: 'all' as FilterType, label: `All (${stats.total})` },
      { value: 'indexed' as FilterType, label: `Indexed (${stats.indexed})` },
      { value: 'indexing' as FilterType, label: `Indexing (${stats.indexing})` },
      { value: 'failed' as FilterType, label: `Failed (${stats.failed})` }
    ];
  });

  readonly iconComponents = {
    BookOpen,
    Plus,
    Upload
  };

  // Page header actions
  readonly headerActions = computed(() => [
    {
      label: 'Import KB',
      icon: Upload,
      variant: 'outline' as const,
      action: () => this.onImportKB()
    },
    {
      label: 'Create KB',
      icon: Plus,
      variant: 'solid' as const,
      action: () => this.openCreateWizard()
    }
  ]);

  constructor() {}

  async ngOnInit(): Promise<void> {
    // Initialize the store if not already initialized
    if (!this.store.isInitialized()) {
      await this.store.initialize();
    }
    console.log('KnowledgeBases component initialized with NgRx Signal Store');
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }
  
  onSearchClear(): void {
    this.searchQuery.set('');
    this.selectedFilters.set([]);
  }

  onFilterChange(selectedFilters: string[]): void {
    console.log('Filter change received:', selectedFilters);
    this.selectedFilters.set(selectedFilters);
  }

  openCreateWizard(): void {
    // Use the new Pipeline-based KB creator instead of the old wizard
    const dialogRef = this.dialogService.open(KBPipelineCreator, {
      title: 'Create Knowledge Base via Pipeline',
      description: 'Create a new knowledge base using Pipeline templates',
      size: 'lg',
      showCloseButton: true
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result && result.type === 'pipeline-execution') {
        this.toastService.show({
          variant: 'success',
          title: 'Knowledge base creation started',
          message: `Pipeline execution initiated for "${result.kbParameters.name}". Check the Pipelines page for progress.`
        });
      }
    });
  }

  async onCreateKB(formData: CreateKBFormData): Promise<void> {
    try {
      const newKB = await this.store.createKnowledgeBase(formData);
      console.log('Knowledge base creation initiated:', newKB);
      this.toastService.show({
        variant: 'success',
        title: 'Knowledge base creation started',
        message: 'The indexing process will begin shortly.'
      });
    } catch (error: any) {
      console.error('Failed to create knowledge base:', error);
      this.toastService.show({
        variant: 'error',
        title: 'Creation failed',
        message: error.message || 'Failed to create knowledge base'
      });
    }
  }

  async onReindexKB(kbId: string): Promise<void> {
    try {
      await this.store.reindexKnowledgeBase(kbId);
      console.log('Reindexing started for KB:', kbId);
      this.toastService.show({
        variant: 'info',
        title: 'Reindexing started',
        message: 'The knowledge base will be reindexed.'
      });
    } catch (error: any) {
      console.error('Failed to start reindexing:', error);
      this.toastService.show({
        variant: 'error',
        title: 'Reindexing failed',
        message: error.message || 'Failed to start reindexing'
      });
    }
  }

  async onExportKB(kbId: string): Promise<void> {
    const kb = this.allKnowledgeBases().find(kb => kb.id === kbId);
    if (!kb) return;

    try {
      const blob = await this.store.exportKnowledgeBase(kbId);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${kb.product}-${kb.version}.kbpack`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      console.log('Export started for KB:', kbId);
    } catch (error: any) {
      console.error('Failed to export knowledge base:', error);
      this.toastService.show({
        variant: 'error',
        title: 'Export failed',
        message: error.message || 'Failed to export knowledge base'
      });
    }
  }

  async onDeleteKB(kbId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this knowledge base? This action cannot be undone.')) {
      try {
        await this.store.deleteKnowledgeBase(kbId);
        console.log('Knowledge base deletion initiated:', kbId);
        this.toastService.show({
          variant: 'success',
          title: 'Knowledge base deleted',
          message: 'The knowledge base has been successfully deleted.'
        });
      } catch (error: any) {
        console.error('Failed to delete knowledge base:', error);
        this.toastService.show({
          variant: 'error',
          title: 'Deletion failed',
          message: error.message || 'Failed to delete knowledge base'
        });
      }
    }
  }

  onPauseKB(kbId: string): void {
    console.log('Pausing KB indexing:', kbId);
    // In a real app, this would call the service to pause indexing
  }

  onCancelKB(kbId: string): void {
    if (confirm('Are you sure you want to cancel the indexing? Progress will be lost.')) {
      console.log('Cancelling KB indexing:', kbId);
      // For MVP, treat cancel as delete
      this.onDeleteKB(kbId);
    }
  }

  onImportKB(): void {
    // Create file input for import
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.kbpack';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Importing knowledge base from file:', file.name);
        // In a real app, this would handle the file upload and import
      }
    };
    input.click();
  }
}
