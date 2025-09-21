import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookOpen, Plus, Upload, Search, CheckCircle, AlertTriangle, Clock, Pause } from 'lucide-angular';
import { Observable, map } from 'rxjs';
import { 
  KnowledgeBase, 
  CreateKBFormData,
  KnowledgeBaseStatus 
} from '../../shared/types';
import { KnowledgeBasesService } from '../../shared/services/knowledge-bases.service';
import { KnowledgeBaseCard } from '../../shared/components/composite/knowledge-base-card/knowledge-base-card';
import { CreateKBWizard } from '../../shared/components/composite/create-kb-wizard/create-kb-wizard';
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
  private readonly kbService = inject(KnowledgeBasesService);
  private readonly dialogService = inject(RagDialogService);
  private readonly toastService = inject(RagToastService);
  
  // Icon components
  readonly SearchIcon = Search;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly ClockIcon = Clock;
  readonly PauseIcon = Pause;

  // Use signals from the service for real-time updates
  private readonly allKnowledgeBases = this.kbService.knowledgeBases;
  readonly searchQuery = signal('');
  readonly selectedFilters = signal<string[]>([]);
  private statusFilter = signal<FilterType>('all');
  readonly isLoading = this.kbService.isLoading;

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

  // Use computed statistics from the service
  readonly kbStats = computed(() => {
    const metrics = this.kbService.metrics();
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

  ngOnInit(): void {
    // Initial load is handled by the service automatically
    // Real-time updates will come through service signals
    console.log('KnowledgeBases component initialized with real-time service');
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
    const dialogRef = this.dialogService.open(CreateKBWizard, {
      title: 'Create Knowledge Base',
      description: 'Create a new versioned knowledge base from your content',
      size: 'lg',
      showCloseButton: true
    });

    dialogRef.closed.subscribe((result: CreateKBFormData | undefined) => {
      if (result) {
        this.onCreateKB(result);
      }
    });
  }

  onCreateKB(formData: CreateKBFormData): void {
    this.kbService.createKnowledgeBase(formData).subscribe({
      next: (newKB) => {
        // State is automatically updated via real-time events
        console.log('Knowledge base creation initiated:', newKB);
        this.toastService.show({
          variant: 'success',
          title: 'Knowledge base creation started',
          message: 'The indexing process will begin shortly.'
        });
      },
      error: (error) => {
        console.error('Failed to create knowledge base:', error);
        this.toastService.show({
          variant: 'error',
          title: 'Creation failed',
          message: error.message || 'Failed to create knowledge base'
        });
      }
    });
  }

  onReindexKB(kbId: string): void {
    this.kbService.reindexKnowledgeBase(kbId).subscribe({
      next: () => {
        console.log('Reindexing started for KB:', kbId);
        this.toastService.show({
          variant: 'info',
          title: 'Reindexing started',
          message: 'The knowledge base will be reindexed.'
        });
      },
      error: (error) => {
        console.error('Failed to start reindexing:', error);
        this.toastService.show({
          variant: 'error',
          title: 'Reindexing failed',
          message: error.message || 'Failed to start reindexing'
        });
      }
    });
  }

  onExportKB(kbId: string): void {
    const kb = this.allKnowledgeBases().find(kb => kb.id === kbId);
    if (!kb) return;

    this.kbService.exportKnowledgeBase(kbId).subscribe({
      next: (blob) => {
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
      },
      error: (error) => {
        console.error('Failed to export knowledge base:', error);
      }
    });
  }

  onDeleteKB(kbId: string): void {
    if (confirm('Are you sure you want to delete this knowledge base? This action cannot be undone.')) {
      this.kbService.deleteKnowledgeBase(kbId).subscribe({
        next: () => {
          // State is automatically updated via real-time events
          console.log('Knowledge base deletion initiated:', kbId);
          this.toastService.show({
            variant: 'success',
            title: 'Knowledge base deleted',
            message: 'The knowledge base has been successfully deleted.'
          });
        },
        error: (error) => {
          console.error('Failed to delete knowledge base:', error);
          this.toastService.show({
            variant: 'error',
            title: 'Deletion failed',
            message: error.message || 'Failed to delete knowledge base'
          });
        }
      });
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
