import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';

interface Tool {
  id: string;
  name: string;
  endpoint: string;
  baseOp: 'rag.search' | 'rag.answer';
  defaults: {
    product?: string;
    version?: string;
    k?: number;
    filters?: Record<string, any>;
  };
  permissions: {
    filesystem: boolean;
    network: boolean;
    process: boolean;
  };
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-tools-manager',
  imports: [
    CommonModule, CardModule, ButtonModule, TagModule, DialogModule,
    InputTextModule, TextareaModule, SelectModule, ToggleSwitchModule,
    FormsModule
  ],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg font-medium">Your MCP Tools</h3>
          <p class="text-sm text-gray-600">
            {{ tools().length }} tools created, {{ activeToolsCount() }} active
          </p>
        </div>
        <p-button 
          label="Create Tool" 
          icon="pi pi-plus"
          (onClick)="showCreateDialog = true"
        ></p-button>
      </div>

      <div *ngIf="tools().length === 0" class="text-center py-12">
        <p-card>
          <ng-template pTemplate="content">
            <div class="text-center">
              <i class="pi pi-cog text-4xl text-gray-400 mb-4"></i>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No tools created yet</h3>
              <p class="text-gray-600 mb-4">
                Create your first dynamic MCP tool to expose RAG capabilities to external AI models and IDEs.
              </p>
              <p-button 
                label="Create Your First Tool" 
                icon="pi pi-plus"
                (onClick)="showCreateDialog = true"
              ></p-button>
            </div>
          </ng-template>
        </p-card>
      </div>

      <div *ngIf="tools().length > 0" class="grid gap-4">
        <p-card *ngFor="let tool of tools()" styleClass="w-full">
          <ng-template pTemplate="header">
            <div class="flex items-center justify-between p-4">
              <div class="flex items-center space-x-3">
                <i 
                  [class]="tool.baseOp === 'rag.search' ? 'pi pi-file-o text-blue-600' : 'pi pi-comments text-green-600'"
                  class="text-xl"
                ></i>
                <h3 class="text-lg font-semibold">{{ tool.name }}</h3>
                <p-tag 
                  [value]="tool.status" 
                  [severity]="tool.status === 'ACTIVE' ? 'success' : 'secondary'"
                  [icon]="tool.status === 'ACTIVE' ? 'pi pi-check-circle' : 'pi pi-times-circle'"
                ></p-tag>
              </div>
              <div class="flex items-center space-x-2">
                <p-button 
                  [label]="tool.status === 'ACTIVE' ? 'Deactivate' : 'Activate'"
                  [icon]="tool.status === 'ACTIVE' ? 'pi pi-pause' : 'pi pi-play'"
                  [severity]="tool.status === 'ACTIVE' ? 'secondary' : 'success'"
                  size="small"
                  (onClick)="toggleToolStatus(tool)"
                ></p-button>
                <p-button 
                  icon="pi pi-pencil" 
                  severity="secondary"
                  size="small"
                  (onClick)="editTool(tool)"
                ></p-button>
                <p-button 
                  icon="pi pi-trash" 
                  severity="danger"
                  size="small"
                  (onClick)="deleteTool(tool)"
                ></p-button>
              </div>
            </div>
          </ng-template>
          
          <ng-template pTemplate="content">
            <div class="space-y-4">
              <div class="text-sm">
                <code class="bg-gray-100 px-2 py-1 rounded">{{ tool.endpoint }}</code> • {{ tool.baseOp }}
              </div>
              
              <p *ngIf="tool.description" class="text-gray-600">{{ tool.description }}</p>
              
              <div class="flex flex-wrap gap-2">
                <p-tag *ngIf="tool.defaults.product" [value]="'Product: ' + tool.defaults.product" severity="info"></p-tag>
                <p-tag *ngIf="tool.defaults.version" [value]="'Version: ' + tool.defaults.version" severity="info"></p-tag>
                <p-tag [value]="'Top-K: ' + (tool.defaults.k || 8)" severity="info"></p-tag>
              </div>

              <div class="flex items-center space-x-4 text-sm text-gray-600">
                <div class="flex items-center space-x-1">
                  <i class="pi pi-shield"></i>
                  <span>Permissions:</span>
                </div>
                <p-tag 
                  *ngIf="tool.permissions.filesystem" 
                  value="FS" 
                  severity="warning"
                  icon="pi pi-folder"
                ></p-tag>
                <p-tag 
                  *ngIf="tool.permissions.network" 
                  value="NET" 
                  severity="info"
                  icon="pi pi-globe"
                ></p-tag>
                <p-tag 
                  *ngIf="tool.permissions.process" 
                  value="PROC" 
                  severity="danger"
                  icon="pi pi-cog"
                ></p-tag>
                <span *ngIf="!hasAnyPermissions(tool)" class="text-gray-500">No special permissions</span>
              </div>

              <div class="text-xs text-gray-500">
                Created: {{ formatDate(tool.createdAt) }}
                <span *ngIf="tool.updatedAt !== tool.createdAt"> • Updated: {{ formatDate(tool.updatedAt) }}</span>
              </div>
            </div>
          </ng-template>
        </p-card>
      </div>
    </div>

    <!-- Create Tool Dialog -->
    <p-dialog 
      header="Create Dynamic MCP Tool" 
      [(visible)]="showCreateDialog"
      [modal]="true"
      [style]="{width: '50rem'}"
    >
      <ng-template pTemplate="content">
        <form (ngSubmit)="createTool()" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label for="name">Tool Name</label>
              <input 
                pInputText 
                id="name"
                placeholder="e.g., Angular Documentation"
                [(ngModel)]="createForm.name"
                name="name"
                required
              />
            </div>
            <div class="space-y-2">
              <label for="endpoint">Endpoint</label>
              <input 
                pInputText 
                id="endpoint"
                placeholder="e.g., tool.angular.search"
                [(ngModel)]="createForm.endpoint"
                name="endpoint"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label for="description">Description</label>
            <textarea 
              pTextarea 
              id="description"
              placeholder="Describe what this tool does and how it should be used..."
              [(ngModel)]="createForm.description"
              name="description"
              rows="3"
            ></textarea>
          </div>

          <div class="space-y-2">
            <label for="baseOp">Base Operation</label>
            <p-select 
              [(ngModel)]="createForm.baseOp"
              [options]="baseOpOptions"
              optionLabel="label"
              optionValue="value"
              name="baseOp"
            ></p-select>
          </div>

          <div class="space-y-4">
            <label>Default Parameters</label>
            <div class="grid grid-cols-3 gap-4">
              <div class="space-y-2">
                <label for="product">Product</label>
                <input 
                  pInputText 
                  id="product"
                  placeholder="e.g., angular"
                  [(ngModel)]="createForm.product"
                  name="product"
                />
              </div>
              <div class="space-y-2">
                <label for="version">Version</label>
                <input 
                  pInputText 
                  id="version"
                  placeholder="e.g., 14.x"
                  [(ngModel)]="createForm.version"
                  name="version"
                />
              </div>
              <div class="space-y-2">
                <label for="k">Results (k)</label>
                <input 
                  pInputText 
                  id="k"
                  type="number"
                  min="1"
                  max="50"
                  [(ngModel)]="createForm.k"
                  name="k"
                />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <label>Permissions</label>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <i class="pi pi-folder text-gray-500"></i>
                  <span class="text-sm">Filesystem Access</span>
                </div>
                <p-toggleSwitch [(ngModel)]="createForm.permissions.filesystem" name="filesystem"></p-toggleSwitch>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <i class="pi pi-globe text-gray-500"></i>
                  <span class="text-sm">Network Access</span>
                </div>
                <p-toggleSwitch [(ngModel)]="createForm.permissions.network" name="network"></p-toggleSwitch>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <i class="pi pi-cog text-gray-500"></i>
                  <span class="text-sm">Process Access</span>
                </div>
                <p-toggleSwitch [(ngModel)]="createForm.permissions.process" name="process"></p-toggleSwitch>
              </div>
            </div>
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
          label="Create Tool" 
          (onClick)="createTool()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .space-x-4 > * + * { margin-left: 1rem; }
    .space-x-3 > * + * { margin-left: 0.75rem; }
    .space-x-2 > * + * { margin-left: 0.5rem; }
    .space-x-1 > * + * { margin-left: 0.25rem; }
  `]
})
export class ToolsManagerComponent {
  // Dummy data for tools
  tools = signal<Tool[]>([
    {
      id: '1',
      name: 'Angular Documentation',
      endpoint: 'tool.angular.search',
      baseOp: 'rag.search',
      defaults: { product: 'angular', version: '20.x', k: 8 },
      permissions: { filesystem: false, network: false, process: false },
      description: 'Search Angular official documentation and guides',
      status: 'ACTIVE',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      name: 'TypeScript Reference',
      endpoint: 'tool.typescript.answer',
      baseOp: 'rag.answer',
      defaults: { product: 'typescript', k: 6 },
      permissions: { filesystem: true, network: false, process: false },
      description: 'Generate answers based on TypeScript handbook and reference',
      status: 'ACTIVE',
      updatedAt: '2024-01-16T14:30:00Z',
      createdAt: '2024-01-16T14:30:00Z'
    },
    {
      id: '3',
      name: 'Project Docs',
      endpoint: 'tool.project.search',
      baseOp: 'rag.search',
      defaults: { k: 10 },
      permissions: { filesystem: true, network: false, process: false },
      description: 'Search through project documentation and code comments',
      status: 'INACTIVE',
      createdAt: '2024-01-17T09:15:00Z',
      updatedAt: '2024-01-17T09:15:00Z'
    }
  ]);

  showCreateDialog = false;
  
  createForm = {
    name: '',
    endpoint: '',
    baseOp: 'rag.search' as 'rag.search' | 'rag.answer',
    description: '',
    product: '',
    version: '',
    k: 8,
    permissions: {
      filesystem: false,
      network: false,
      process: false
    }
  };

  baseOpOptions = [
    { label: '📄 rag.search - Return search results with citations', value: 'rag.search' },
    { label: '💬 rag.answer - Generate answers with citations', value: 'rag.answer' }
  ];

  activeToolsCount = () => this.tools().filter(t => t.status === 'ACTIVE').length;

  hasAnyPermissions(tool: Tool): boolean {
    return tool.permissions.filesystem || tool.permissions.network || tool.permissions.process;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  toggleToolStatus(tool: Tool): void {
    const updatedTools = this.tools().map(t => 
      t.id === tool.id 
        ? { ...t, status: t.status === 'ACTIVE' ? 'INACTIVE' as const : 'ACTIVE' as const }
        : t
    );
    this.tools.set(updatedTools);
  }

  editTool(tool: Tool): void {
    // TODO: Implement edit functionality
    console.log('Edit tool:', tool);
  }

  deleteTool(tool: Tool): void {
    if (confirm(`Are you sure you want to delete "${tool.name}"?`)) {
      const updatedTools = this.tools().filter(t => t.id !== tool.id);
      this.tools.set(updatedTools);
    }
  }

  createTool(): void {
    const newTool: Tool = {
      id: Math.random().toString(36).substr(2, 9),
      name: this.createForm.name,
      endpoint: this.createForm.endpoint,
      baseOp: this.createForm.baseOp,
      defaults: {
        product: this.createForm.product || undefined,
        version: this.createForm.version || undefined,
        k: this.createForm.k
      },
      permissions: { ...this.createForm.permissions },
      description: this.createForm.description,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tools.set([...this.tools(), newTool]);
    this.showCreateDialog = false;
    this.resetForm();
  }

  private resetForm(): void {
    this.createForm = {
      name: '',
      endpoint: '',
      baseOp: 'rag.search',
      description: '',
      product: '',
      version: '',
      k: 8,
      permissions: {
        filesystem: false,
        network: false,
        process: false
      }
    };
  }
}