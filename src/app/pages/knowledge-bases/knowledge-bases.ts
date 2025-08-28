import { Component, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, BookOpen, Plus, Upload } from 'lucide-angular';
import { Observable, map } from 'rxjs';
import { 
  KnowledgeBase, 
  CreateKBFormData,
  KnowledgeBaseStatus 
} from '../../shared/types';
import { MockKnowledgeBasesService } from '../../shared/services/mock-knowledge-bases';
import { KnowledgeBaseCardComponent } from '../../shared/components/composite/knowledge-base-card/knowledge-base-card';
import { CreateKBWizardComponent } from '../../shared/components/composite/create-kb-wizard/create-kb-wizard';
import { EmptyStatePanelComponent } from '../../shared/components/composite/empty-state-panel/empty-state-panel';
import { RagButton } from '../../shared/components/atomic/primitives/rag-button/rag-button';
import { RagSearchInput } from '../../shared/components/semantic/forms/rag-search-input/rag-search-input';
import { RagSelect } from '../../shared/components/atomic/primitives/rag-select/rag-select';

type FilterType = 'all' | 'indexed' | 'indexing' | 'failed';

@Component({
  selector: 'app-knowledge-bases',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    KnowledgeBaseCardComponent,
    CreateKBWizardComponent,
    EmptyStatePanelComponent,
    RagButton,
    RagSearchInput,
    RagSelect
  ],
  templateUrl: './knowledge-bases.html',
  styleUrl: './knowledge-bases.scss'
})
export class KnowledgeBasesPageComponent implements OnInit {
  @ViewChild(CreateKBWizardComponent) createWizard!: CreateKBWizardComponent;

  private allKnowledgeBases = signal<KnowledgeBase[]>([]);
  private searchQuery = signal('');
  private statusFilter = signal<FilterType>('all');
  private isLoading = signal(true);

  readonly knowledgeBases$ = computed(() => {
    const kbs = this.allKnowledgeBases();
    const query = this.searchQuery().toLowerCase();
    const filter = this.statusFilter();

    let filtered = kbs;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(kb => kb.status === filter);
    }

    // Apply search filter
    if (query.trim()) {
      filtered = filtered.filter(kb => 
        kb.name.toLowerCase().includes(query) ||
        kb.product.toLowerCase().includes(query) ||
        kb.description?.toLowerCase().includes(query) ||
        kb.version.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  readonly isEmpty = computed(() => this.allKnowledgeBases().length === 0);
  readonly hasResults = computed(() => this.knowledgeBases$().length > 0);
  readonly totalCount = computed(() => this.allKnowledgeBases().length);
  readonly filteredCount = computed(() => this.knowledgeBases$().length);

  readonly statusCounts = computed(() => {
    const kbs = this.allKnowledgeBases();
    return {
      all: kbs.length,
      indexed: kbs.filter(kb => kb.status === 'indexed').length,
      indexing: kbs.filter(kb => kb.status === 'indexing').length,
      failed: kbs.filter(kb => kb.status === 'failed').length
    };
  });

  readonly filterOptions = computed(() => {
    const counts = this.statusCounts();
    return [
      { value: 'all' as FilterType, label: `All (${counts.all})` },
      { value: 'indexed' as FilterType, label: `Indexed (${counts.indexed})` },
      { value: 'indexing' as FilterType, label: `Indexing (${counts.indexing})` },
      { value: 'failed' as FilterType, label: `Failed (${counts.failed})` }
    ];
  });

  readonly iconComponents = {
    BookOpen,
    Plus,
    Upload
  };

  constructor(private kbService: MockKnowledgeBasesService) {}

  ngOnInit(): void {
    this.loadKnowledgeBases();
  }

  private loadKnowledgeBases(): void {
    this.isLoading.set(true);
    this.kbService.getKnowledgeBases().subscribe({
      next: (kbs) => {
        this.allKnowledgeBases.set(kbs);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load knowledge bases:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value as FilterType);
  }

  openCreateWizard(): void {
    this.createWizard.open();
  }

  onCreateKB(formData: CreateKBFormData): void {
    this.kbService.createKnowledgeBase({
      name: formData.name,
      version: formData.version,
      product: formData.product,
      description: formData.description,
      contentSource: formData.contentSource,
      sourceUrl: formData.sourceUrl,
      embeddingModel: formData.embeddingModel
    }).subscribe({
      next: (newKB) => {
        // Add the new KB to the list
        this.allKnowledgeBases.update(kbs => [newKB, ...kbs]);
        console.log('Knowledge base created:', newKB);
      },
      error: (error) => {
        console.error('Failed to create knowledge base:', error);
      }
    });
  }

  onReindexKB(kbId: string): void {
    this.kbService.reindexKnowledgeBase(kbId).subscribe({
      next: () => {
        console.log('Reindexing started for KB:', kbId);
        this.loadKnowledgeBases(); // Refresh to show updated status
      },
      error: (error) => {
        console.error('Failed to start reindexing:', error);
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
          this.allKnowledgeBases.update(kbs => kbs.filter(kb => kb.id !== kbId));
          console.log('Knowledge base deleted:', kbId);
        },
        error: (error) => {
          console.error('Failed to delete knowledge base:', error);
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
      // In a real app, this would call the service to cancel indexing
      this.allKnowledgeBases.update(kbs => 
        kbs.filter(kb => kb.id !== kbId)
      );
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
