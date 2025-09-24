import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Plus, Wrench, Search, Filter, CheckCircle, AlertTriangle, Clock, Pause } from 'lucide-angular';
import { ToolCard } from '../../shared/components/composite/tool-card/tool-card';
import { CreateToolWizard } from '../../shared/components/composite/create-tool-wizard/create-tool-wizard';
import { ToolTestingInterface } from '../../shared/components/composite/tool-testing-interface/tool-testing-interface';
import { EmptyStatePanel } from '../../shared/components/composite/empty-state-panel/empty-state-panel';
import { RagDialogService } from '../../shared/components/semantic/overlay/rag-dialog/rag-dialog.service';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';
import { ToolsStore } from '../../shared/store/tools.store';
import { Tool, ToolStatus } from '../../shared/types/tool.types';
import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { RagStatsOverview, StatItem } from '../../shared/components/semantic/data-display/rag-stats-overview';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToolCard,
    RagPageHeader,
    RagStatsOverview,
    EmptyStatePanel
  ],
  templateUrl: './tools.html',
  styleUrl: './tools.scss'
})
export class Tools implements OnInit, OnDestroy {
  private readonly toolsStore = inject(ToolsStore);
  private readonly dialogService = inject(RagDialogService);
  private readonly toastService = inject(RagToastService);
  
  // Icon components
  readonly PlusIcon = Plus;
  readonly WrenchIcon = Wrench;
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly ClockIcon = Clock;
  readonly PauseIcon = Pause;
  
  // Reactive signals from store
  readonly tools = this.toolsStore.tools;
  readonly isLoading = this.toolsStore.isLoading;
  readonly lastError = this.toolsStore.lastError;
  readonly metrics = this.toolsStore.computedMetrics;
  readonly mcpServerStatus = this.toolsStore.mcpServerStatus;

  // Local filter signals
  readonly searchQuery = signal('');
  readonly selectedFilters = signal<string[]>([]);

  // Page header actions
  readonly headerActions = computed(() => [
    {
      label: 'Create Tool',
      icon: this.PlusIcon,
      variant: 'solid' as const,
      action: () => this.onCreateTool()
    }
  ]);
  
  // Computed filtered tools
  readonly filteredTools = computed(() => {
    const tools = this.tools();
    const query = this.searchQuery().toLowerCase().trim();
    const selectedFilters = this.selectedFilters();
    console.log('Filtering tools with query:', query, 'selectedFilters:', selectedFilters);
    
    if (!tools || tools.length === 0) {
      return [];
    }
    
    // First filter by search query
    let filteredTools = !query ? tools : tools.filter(tool => {
      if (!tool) return false;

      // Check if query matches any searchable field
      return [
        tool.name?.toLowerCase() || '',
        tool.endpoint?.toLowerCase() || '',
        tool.description?.toLowerCase() || ''
      ].some(field => field.includes(query));
    });
    
    // Then filter by selected status filters if any
    if (selectedFilters.length > 0) {
      // Map stat IDs to tool statuses
      const statusMapping: Record<string, ToolStatus> = {
        'active': 'ACTIVE',
        'error': 'ERROR',
        'inactive': 'INACTIVE',
        'pending': 'PENDING'
      };
      
      filteredTools = filteredTools.filter(tool => {
        if (!tool.status) return false;
        
        // Check if tool status matches any selected filter
        return selectedFilters.some(filterId => {
          const mappedStatus = statusMapping[filterId];
          return mappedStatus && tool.status === mappedStatus;
        });
      });
    }
    
    return filteredTools;
  });
  
  // Computed statistics for overview component
  readonly toolStatsItems = computed(() => {
    const metrics = this.metrics();
    const items: StatItem[] = [
      {
        id: 'total',
        label: 'Total Tools',
        value: metrics.total_tools,
        icon: this.WrenchIcon,
        color: 'blue',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'active',
        label: 'Active',
        value: metrics.active_tools,
        icon: this.CheckCircleIcon,
        color: 'green',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'error',
        label: 'Errors',
        value: metrics.error_tools,
        icon: this.AlertTriangleIcon,
        color: 'red',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'inactive',
        label: 'Inactive',
        value: metrics.inactive_tools,
        icon: this.PauseIcon,
        color: 'gray',
        variant: 'soft',
        clickable: true
      },
      {
        id: 'pending',
        label: 'Pending',
        value: metrics.pending_tools,
        icon: this.ClockIcon,
        color: 'amber',
        variant: 'solid',
        clickable: true
      }
    ];
    return items;
  });

  // Lifecycle methods
  async ngOnInit() {
    // Initialize the tools store
    await this.toolsStore.initialize();
  }

  ngOnDestroy() {
    // Cleanup store resources
    this.toolsStore.destroy();
  }

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
    try {
      await this.toolsStore.createTool(toolData);
      this.toastService.success('Tool created successfully!', 'Success');
    } catch (error) {
      this.toastService.error('Failed to create tool. Please try again.', 'Error');
    }
  }

  async onToolActivate(toolId: string) {
    try {
      await this.toolsStore.updateToolStatus(toolId, 'ACTIVE');
      this.toastService.success('Tool activated successfully!', 'Success');
    } catch (error) {
      this.toastService.error('Failed to activate tool.', 'Error');
    }
  }

  async onToolDeactivate(toolId: string) {
    try {
      await this.toolsStore.updateToolStatus(toolId, 'INACTIVE');
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
        await this.toolsStore.deleteTool(toolId);
        this.toastService.success('Tool deleted successfully.', 'Success');
      } catch (error) {
        this.toastService.error('Failed to delete tool.', 'Error');
      }
    }
  }

  async onToolRetry(toolId: string) {
    try {
      await this.toolsStore.updateToolStatus(toolId, 'PENDING');
      this.toastService.success('Tool registration retry initiated!', 'Success');
    } catch (error) {
      this.toastService.error('Retry failed. Please check configuration.', 'Error');
    }
  }
  
  onToolViewLogs(toolId: string) {
    // In a real app, this would open a logs viewer
    console.log('View logs for tool:', toolId);
    this.toastService.info('Logs viewer coming soon!', 'Info');
  }

  onToolTest(toolId: string) {
    const tool = this.tools().find(t => t.id === toolId);
    if (!tool) {
      this.toastService.error('Tool not found', 'Error');
      return;
    }

    if (tool.status !== 'ACTIVE') {
      this.toastService.warning('Tool must be active to test', 'Warning');
      return;
    }

    // Open the testing interface dialog
    const dialogRef = this.dialogService.open<any, any>(ToolTestingInterface, {
      title: `Test ${tool.name}`,
      size: 'xl',
      data: { tool: tool }
    });

    dialogRef.closed.subscribe(() => {
      // Dialog closed - no action needed
    });
  }
  
  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }
  
  onSearchClear() {
    this.searchQuery.set('');
    this.selectedFilters.set([]);
  }

  onFilterChange(selectedFilters: string[]) {
    console.log('Filter change received:', selectedFilters);
    this.selectedFilters.set(selectedFilters);
  }

  
}
