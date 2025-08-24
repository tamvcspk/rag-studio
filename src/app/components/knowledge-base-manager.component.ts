import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProgressBarModule } from 'primeng/progressbar';

interface KnowledgeBase {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'INDEXED' | 'INDEXING' | 'ERROR' | 'DRAFT';
  chunks: number;
  embeddings: number;
  size: string;
  lastIndexed: string;
  createdAt: string;
}

@Component({
  selector: 'app-knowledge-base-manager',
  imports: [
    CommonModule, CardModule, ButtonModule, TagModule, DialogModule,
    InputTextModule, TextareaModule, SelectModule, FormsModule,
    ProgressBarModule
  ],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg font-medium">Knowledge Bases</h3>
          <p class="text-sm text-gray-600">
            {{ knowledgeBases().length }} knowledge bases, {{ indexedCount() }} indexed
          </p>
        </div>
        <p-button 
          label="Create KB" 
          icon="pi pi-plus"
          (onClick)="showCreateDialog = true"
        ></p-button>
      </div>

      <div *ngIf="knowledgeBases().length === 0" class="text-center py-12">
        <p-card>
          <ng-template pTemplate="content">
            <div class="text-center">
              <i class="pi pi-database text-4xl text-gray-400 mb-4"></i>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No knowledge bases yet</h3>
              <p class="text-gray-600 mb-4">
                Create your first knowledge base to start building your RAG system.
              </p>
              <p-button 
                label="Create Your First KB" 
                icon="pi pi-plus"
                (onClick)="showCreateDialog = true"
              ></p-button>
            </div>
          </ng-template>
        </p-card>
      </div>

      <div *ngIf="knowledgeBases().length > 0" class="grid gap-4">
        <p-card *ngFor="let kb of knowledgeBases()" styleClass="w-full">
          <ng-template pTemplate="header">
            <div class="flex items-center justify-between p-4">
              <div class="flex items-center space-x-3">
                <i class="pi pi-book text-blue-600 text-xl"></i>
                <div>
                  <h3 class="text-lg font-semibold">{{ kb.name }}</h3>
                  <div class="text-sm text-gray-600">v{{ kb.version }}</div>
                </div>
                <p-tag 
                  [value]="kb.status" 
                  [severity]="getStatusSeverity(kb.status)"
                  [icon]="getStatusIcon(kb.status)"
                ></p-tag>
              </div>
              <div class="flex items-center space-x-2">
                <p-button 
                  label="Reindex" 
                  icon="pi pi-refresh"
                  severity="secondary"
                  size="small"
                  [disabled]="kb.status === 'INDEXING'"
                  (onClick)="reindexKB(kb)"
                ></p-button>
                <p-button 
                  label="Export" 
                  icon="pi pi-download"
                  severity="secondary"
                  size="small"
                  (onClick)="exportKB(kb)"
                ></p-button>
                <p-button 
                  icon="pi pi-pencil" 
                  severity="secondary"
                  size="small"
                  (onClick)="editKB(kb)"
                ></p-button>
                <p-button 
                  icon="pi pi-trash" 
                  severity="danger"
                  size="small"
                  (onClick)="deleteKB(kb)"
                ></p-button>
              </div>
            </div>
          </ng-template>
          
          <ng-template pTemplate="content">
            <div class="space-y-4">
              <p *ngIf="kb.description" class="text-gray-600">{{ kb.description }}</p>
              
              <div class="grid grid-cols-4 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-600">{{ kb.chunks | number }}</div>
                  <div class="text-sm text-gray-500">Chunks</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">{{ kb.embeddings | number }}</div>
                  <div class="text-sm text-gray-500">Embeddings</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-purple-600">{{ kb.size }}</div>
                  <div class="text-sm text-gray-500">Size</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-orange-600">{{ getDaysAgo(kb.lastIndexed) }}d</div>
                  <div class="text-sm text-gray-500">Last Indexed</div>
                </div>
              </div>

              <div *ngIf="kb.status === 'INDEXING'" class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span>Indexing progress</span>
                  <span>65%</span>
                </div>
                <p-progressBar [value]="65"></p-progressBar>
              </div>

              <div class="text-xs text-gray-500">
                Created: {{ formatDate(kb.createdAt) }}
                <span *ngIf="kb.lastIndexed"> • Last indexed: {{ formatDate(kb.lastIndexed) }}</span>
              </div>
            </div>
          </ng-template>
        </p-card>
      </div>
    </div>

    <!-- Create KB Dialog -->
    <p-dialog 
      header="Create Knowledge Base" 
      [(visible)]="showCreateDialog"
      [modal]="true"
      [style]="{width: '50rem'}"
    >
      <ng-template pTemplate="content">
        <form (ngSubmit)="createKB()" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label for="name">KB Name</label>
              <input 
                pInputText 
                id="name"
                placeholder="e.g., Company Documentation"
                [(ngModel)]="createForm.name"
                name="name"
                required
              />
            </div>
            <div class="space-y-2">
              <label for="version">Version</label>
              <input 
                pInputText 
                id="version"
                placeholder="e.g., 1.0.0"
                [(ngModel)]="createForm.version"
                name="version"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label for="description">Description</label>
            <textarea 
              pTextarea 
              id="description"
              placeholder="Describe the content and purpose of this knowledge base..."
              [(ngModel)]="createForm.description"
              name="description"
              rows="3"
            ></textarea>
          </div>

          <div class="space-y-2">
            <label for="template">Template</label>
            <p-select 
              [(ngModel)]="createForm.template"
              [options]="templateOptions"
              optionLabel="label"
              optionValue="value"
              name="template"
              placeholder="Choose a template"
            ></p-select>
          </div>
        </form>
      </ng-template>
      
      <ng-template pTemplate="footer">
        <p-button 
          label="Cancel" 
          severity="secondary"
          (onClick)="showCreateDialog = false"
        ></p-button>
        <p-button 
          label="Create KB" 
          (onClick)="createKB()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .space-x-3 > * + * { margin-left: 0.75rem; }
    .space-x-2 > * + * { margin-left: 0.5rem; }
  `]
})
export class KnowledgeBaseManagerComponent {
  // Dummy data for knowledge bases
  knowledgeBases = signal<KnowledgeBase[]>([
    {
      id: '1',
      name: 'Angular Documentation',
      version: '1.0.0',
      description: 'Official Angular framework documentation and guides',
      status: 'INDEXED',
      chunks: 2547,
      embeddings: 2547,
      size: '12.3MB',
      lastIndexed: '2024-01-20T10:00:00Z',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      name: 'Company Handbook',
      version: '2.1.0',
      description: 'Internal company policies, procedures, and documentation',
      status: 'INDEXING',
      chunks: 1823,
      embeddings: 1200,
      size: '8.7MB',
      lastIndexed: '2024-01-21T14:30:00Z',
      createdAt: '2024-01-10T09:00:00Z'
    },
    {
      id: '3',
      name: 'Technical Specifications',
      version: '1.5.0',
      description: 'Product technical specifications and API documentation',
      status: 'ERROR',
      chunks: 0,
      embeddings: 0,
      size: '0MB',
      lastIndexed: '2024-01-18T16:45:00Z',
      createdAt: '2024-01-18T16:45:00Z'
    },
    {
      id: '4',
      name: 'Research Papers',
      version: '1.0.0',
      description: 'Collection of AI/ML research papers and publications',
      status: 'DRAFT',
      chunks: 456,
      embeddings: 0,
      size: '25.1MB',
      lastIndexed: '',
      createdAt: '2024-01-22T11:00:00Z'
    }
  ]);

  showCreateDialog = false;
  
  createForm = {
    name: '',
    version: '1.0.0',
    description: '',
    template: ''
  };

  templateOptions = [
    { label: '📄 Document Collection - For PDFs, Word docs, etc.', value: 'documents' },
    { label: '🌐 Website Crawler - Scrape and index web content', value: 'website' },
    { label: '💻 Code Repository - Index source code and comments', value: 'code' },
    { label: '📚 Wiki/Confluence - Import from wiki systems', value: 'wiki' },
    { label: '🗂️ Custom - Build from scratch', value: 'custom' }
  ];

  indexedCount = () => this.knowledgeBases().filter(kb => kb.status === 'INDEXED').length;

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (status) {
      case 'INDEXED': return 'success';
      case 'INDEXING': return 'info';
      case 'ERROR': return 'danger';
      case 'DRAFT': return 'secondary';
      default: return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'INDEXED': return 'pi pi-check-circle';
      case 'INDEXING': return 'pi pi-spin pi-spinner';
      case 'ERROR': return 'pi pi-times-circle';
      case 'DRAFT': return 'pi pi-file-edit';
      default: return 'pi pi-question-circle';
    }
  }

  getDaysAgo(dateString: string): number {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  }

  reindexKB(kb: KnowledgeBase): void {
    const updatedKBs = this.knowledgeBases().map(k => 
      k.id === kb.id ? { ...k, status: 'INDEXING' as const } : k
    );
    this.knowledgeBases.set(updatedKBs);
    
    // Simulate indexing completion after 5 seconds
    setTimeout(() => {
      const finalKBs = this.knowledgeBases().map(k => 
        k.id === kb.id ? { ...k, status: 'INDEXED' as const, lastIndexed: new Date().toISOString() } : k
      );
      this.knowledgeBases.set(finalKBs);
    }, 5000);
  }

  exportKB(kb: KnowledgeBase): void {
    console.log('Export KB:', kb);
    // TODO: Implement export functionality
  }

  editKB(kb: KnowledgeBase): void {
    console.log('Edit KB:', kb);
    // TODO: Implement edit functionality
  }

  deleteKB(kb: KnowledgeBase): void {
    if (confirm(`Are you sure you want to delete "${kb.name}"?`)) {
      const updatedKBs = this.knowledgeBases().filter(k => k.id !== kb.id);
      this.knowledgeBases.set(updatedKBs);
    }
  }

  createKB(): void {
    const newKB: KnowledgeBase = {
      id: Math.random().toString(36).substr(2, 9),
      name: this.createForm.name,
      version: this.createForm.version,
      description: this.createForm.description,
      status: 'DRAFT',
      chunks: 0,
      embeddings: 0,
      size: '0MB',
      lastIndexed: '',
      createdAt: new Date().toISOString()
    };

    this.knowledgeBases.set([...this.knowledgeBases(), newKB]);
    this.showCreateDialog = false;
    this.resetForm();
  }

  private resetForm(): void {
    this.createForm = {
      name: '',
      version: '1.0.0',
      description: '',
      template: ''
    };
  }
}