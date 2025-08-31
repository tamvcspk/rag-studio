import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Plus, Wrench, Search, Filter } from 'lucide-angular';
import { ToolCard } from '../../shared/components/composite/tool-card/tool-card';
import { CreateToolWizard } from '../../shared/components/composite/create-tool-wizard/create-tool-wizard';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { RagDialogService } from '../../shared/components/semantic/overlay/rag-dialog/rag-dialog.service';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';
import { MockToolsService } from '../../shared/services/mock-tools.service';
import { Tool, ToolStatus } from '../../shared/types/tool.types';
import { RagBadge, RagButton, RagSearchInput, RagSelect } from '../../shared/components';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RagIcon,
    ToolCard,
    RagButton,
    RagSearchInput,
    RagSelect,
    RagBadge
  ],
  templateUrl: './tools.html',
  styleUrl: './tools.scss'
})
export class Tools {
  private readonly toolsService = inject(MockToolsService);
  private readonly dialogService = inject(RagDialogService);
  private readonly toastService = inject(RagToastService);
  
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
    const dialogRef = this.dialogService.open(CreateToolWizard, {
      title: 'Create Dynamic MCP Tool',
      size: 'lg'
    });

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.toastService.success('Tool created successfully!', 'Success');
      }
    });
  }
  
  async onToolSubmit(toolData: any) {
    this.isLoading.set(true);
    try {
      await this.toolsService.createTool(toolData);
      this.toastService.success('Tool created successfully!', 'Success');
    } catch (error) {
      this.toastService.error('Failed to create tool. Please try again.', 'Error');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  async onToolActivate(toolId: string) {
    try {
      await this.toolsService.updateToolStatus(toolId, 'ACTIVE');
      this.toastService.success('Tool activated successfully!', 'Success');
    } catch (error) {
      this.toastService.error('Failed to activate tool.', 'Error');
    }
  }
  
  async onToolDeactivate(toolId: string) {
    try {
      await this.toolsService.updateToolStatus(toolId, 'INACTIVE');
      this.toastService.info('Tool deactivated.', 'Info');
    } catch (error) {
      this.toastService.error('Failed to deactivate tool.', 'Error');
    }
  }
  
  onToolEdit(toolId: string) {
    // In a real app, this would open an edit form
    console.log('Edit tool:', toolId);
    this.toastService.info('Edit functionality coming soon!', 'Info');
  }
  
  async onToolDelete(toolId: string) {
    // In a real app, this would show a confirmation dialog first
    const tool = this.tools().find(t => t.id === toolId);
    if (tool && confirm(`Are you sure you want to delete "${tool.name}"?`)) {
      try {
        await this.toolsService.deleteTool(toolId);
        this.toastService.success('Tool deleted successfully.', 'Success');
      } catch (error) {
        this.toastService.error('Failed to delete tool.', 'Error');
      }
    }
  }
  
  async onToolRetry(toolId: string) {
    try {
      await this.toolsService.retryToolRegistration(toolId);
      this.toastService.success('Tool registration retry successful!', 'Success');
    } catch (error) {
      this.toastService.error('Retry failed. Please check configuration.', 'Error');
    }
  }
  
  onToolViewLogs(toolId: string) {
    // In a real app, this would open a logs viewer
    console.log('View logs for tool:', toolId);
    this.toastService.info('Logs viewer coming soon!', 'Info');
  }
  
  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }
  
  onStatusFilterChange(status: ToolStatus | 'ALL' | null) {
    this.statusFilter.set(status || 'ALL');
  }
  
}
