import { Component, ViewChild, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Plus, Wrench, Search, Filter } from 'lucide-angular';
import { ToolCardComponent } from '../../shared/components/composite/tool-card/tool-card';
import { CreateToolWizardComponent } from '../../shared/components/composite/create-tool-wizard/create-tool-wizard';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { MockToolsService } from '../../shared/services/mock-tools.service';
import { Tool, ToolStatus } from '../../shared/types/tool.types';
import { RagBadge, RagButton, RagSearchInput, RagSelect, RagToast } from '../../shared/components';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RagIcon,
    ToolCardComponent,
    CreateToolWizardComponent,
    RagButton,
    RagSearchInput,
    RagSelect,
    RagBadge,
    RagToast
  ],
  templateUrl: './tools.html',
  styleUrl: './tools.scss'
})
export class Tools {
  @ViewChild(CreateToolWizardComponent) createWizard!: CreateToolWizardComponent;
  
  private readonly toolsService = inject(MockToolsService);
  
  // Icon components
  readonly PlusIcon = Plus;
  readonly WrenchIcon = Wrench;
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  
  // Reactive signals
  readonly tools = this.toolsService.tools;
  readonly searchQuery = signal('');
  readonly statusFilter = signal<ToolStatus | 'ALL'>('ALL');
  readonly isLoading = signal(false);
  readonly toastMessage = signal('');
  readonly toastType = signal<'success' | 'error' | 'info'>('info');
  readonly showToast = signal(false);
  
  // Lucide icons
  readonly Plus = Plus;
  readonly Wrench = Wrench;
  readonly Search = Search;
  readonly Filter = Filter;
  
  // Filter options for dropdown
  readonly statusFilterOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'ERROR', label: 'Error' },
    { value: 'PENDING', label: 'Pending' }
  ];
  
  // Computed filtered tools
  readonly filteredTools = computed(() => {
    const tools = this.tools();
    const query = this.searchQuery().toLowerCase().trim();
    const statusFilter = this.statusFilter();
    
    return tools.filter(tool => {
      const matchesSearch = !query || 
        tool.name.toLowerCase().includes(query) ||
        tool.endpoint.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query);
      
      const matchesStatus = statusFilter === 'ALL' || tool.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  });
  
  // Computed statistics
  readonly toolStats = computed(() => this.toolsService.getToolStats());
  
  // Event handlers
  onCreateTool() {
    this.createWizard.open();
  }
  
  async onToolSubmit(toolData: any) {
    this.isLoading.set(true);
    try {
      await this.toolsService.createTool(toolData);
      this.showSuccessToast('Tool created successfully!');
    } catch (error) {
      this.showErrorToast('Failed to create tool. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  async onToolActivate(toolId: string) {
    try {
      await this.toolsService.updateToolStatus(toolId, 'ACTIVE');
      this.showSuccessToast('Tool activated successfully!');
    } catch (error) {
      this.showErrorToast('Failed to activate tool.');
    }
  }
  
  async onToolDeactivate(toolId: string) {
    try {
      await this.toolsService.updateToolStatus(toolId, 'INACTIVE');
      this.showInfoToast('Tool deactivated.');
    } catch (error) {
      this.showErrorToast('Failed to deactivate tool.');
    }
  }
  
  onToolEdit(toolId: string) {
    // In a real app, this would open an edit form
    console.log('Edit tool:', toolId);
    this.showInfoToast('Edit functionality coming soon!');
  }
  
  async onToolDelete(toolId: string) {
    // In a real app, this would show a confirmation dialog first
    const tool = this.tools().find(t => t.id === toolId);
    if (tool && confirm(`Are you sure you want to delete "${tool.name}"?`)) {
      try {
        await this.toolsService.deleteTool(toolId);
        this.showSuccessToast('Tool deleted successfully.');
      } catch (error) {
        this.showErrorToast('Failed to delete tool.');
      }
    }
  }
  
  async onToolRetry(toolId: string) {
    try {
      await this.toolsService.retryToolRegistration(toolId);
      this.showSuccessToast('Tool registration retry successful!');
    } catch (error) {
      this.showErrorToast('Retry failed. Please check configuration.');
    }
  }
  
  onToolViewLogs(toolId: string) {
    // In a real app, this would open a logs viewer
    console.log('View logs for tool:', toolId);
    this.showInfoToast('Logs viewer coming soon!');
  }
  
  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }
  
  onStatusFilterChange(status: ToolStatus | 'ALL' | null) {
    this.statusFilter.set(status || 'ALL');
  }
  
  // Toast helpers
  private showSuccessToast(message: string) {
    this.toastMessage.set(message);
    this.toastType.set('success');
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 5000);
  }
  
  private showErrorToast(message: string) {
    this.toastMessage.set(message);
    this.toastType.set('error');
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 5000);
  }
  
  private showInfoToast(message: string) {
    this.toastMessage.set(message);
    this.toastType.set('info');
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 3000);
  }
  
  onToastClose() {
    this.showToast.set(false);
  }
}
