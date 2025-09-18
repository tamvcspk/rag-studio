import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Plus, GitBranch, Search, Filter, PlayCircle, PauseCircle, FileEdit, XCircle, CheckCircle, AlertTriangle, Clock, Pause } from 'lucide-angular';
import { FlowCard } from '../../shared/components/composite/flow-card/flow-card';
import { CreateFlowWizard } from '../../shared/components/composite/create-flow-wizard/create-flow-wizard';
import { RagDialogService } from '../../shared/components/semantic/overlay/rag-dialog/rag-dialog.service';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';
import { FlowsService } from '../../shared/services/flows';
import { Flow, FlowStatus } from '../../shared/models/flow.model';
import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { RagStatsOverview, StatItem } from '../../shared/components/semantic/data-display/rag-stats-overview';
import { EmptyStatePanel } from '../../shared/components/composite/empty-state-panel/empty-state-panel';

@Component({
  selector: 'app-flows',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FlowCard,
    RagPageHeader,
    RagStatsOverview,
    EmptyStatePanel
  ],
  templateUrl: './flows.html',
  styleUrl: './flows.scss'
})
export class Flows implements OnInit {
  private readonly flowsService = inject(FlowsService);
  private readonly dialogService = inject(RagDialogService);
  private readonly toastService = inject(RagToastService);
  
  // Icon components
  readonly PlusIcon = Plus;
  readonly GitBranchIcon = GitBranch;
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly ClockIcon = Clock;
  readonly PauseIcon = Pause;
  readonly PlayCircleIcon = PlayCircle;
  readonly PauseCircleIcon = PauseCircle;
  readonly FileEditIcon = FileEdit;
  readonly XCircleIcon = XCircle;

  // Reactive signals
  readonly flows = signal<Flow[]>([]);
  readonly searchQuery = signal('');
  readonly selectedFilters = signal<string[]>([]);
  readonly isLoading = signal(false);

  // Page header actions
  readonly headerActions = computed(() => [
    {
      label: 'Create Flow',
      icon: this.PlusIcon,
      variant: 'solid' as const,
      action: () => this.onCreateFlow()
    }
  ]);
  
  // Computed filtered flows
  readonly filteredFlows = computed(() => {
    const flows = this.flows();
    const query = this.searchQuery().toLowerCase().trim();
    const selectedFilters = this.selectedFilters();
    
    if (!flows || flows.length === 0) {
      return [];
    }
    
    // First filter by search query
    let filteredFlows = !query ? flows : flows.filter(flow => {
      if (!flow) return false;

      // Check if query matches any searchable field
      return [
        flow.name?.toLowerCase() || '',
        flow.description?.toLowerCase() || '',
        flow.tags?.join(' ').toLowerCase() || ''
      ].some(field => field.includes(query));
    });
    
    // Then filter by selected status filters if any
    if (selectedFilters.length > 0) {
      // Map stat IDs to flow statuses
      const statusMapping: Record<string, FlowStatus> = {
        'active': 'active',
        'error': 'error',
        'paused': 'paused',
        'draft': 'draft',
        'archived': 'archived'
      };
      
      filteredFlows = filteredFlows.filter(flow => {
        if (!flow.status) return false;
        
        // Check if flow status matches any selected filter
        return selectedFilters.some(filterId => {
          const mappedStatus = statusMapping[filterId];
          return mappedStatus && flow.status === mappedStatus;
        });
      });
    }
    
    return filteredFlows;
  });
  
  // Computed statistics
  readonly flowStats = computed(() => this.getFlowStats());
  
  // Computed statistics for overview component
  readonly flowStatsItems = computed(() => {
    const stats = this.flowStats();
    const items: StatItem[] = [
      {
        id: 'total',
        label: 'Total Flows',
        value: stats.total,
        icon: this.GitBranchIcon,
        color: 'blue',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'active',
        label: 'Active',
        value: stats.active,
        icon: this.CheckCircleIcon,
        color: 'green',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'error',
        label: 'Errors',
        value: stats.error,
        icon: this.AlertTriangleIcon,
        color: 'red',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'paused',
        label: 'Paused',
        value: stats.paused,
        icon: this.PauseIcon,
        color: 'amber',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'draft',
        label: 'Draft',
        value: stats.draft,
        icon: this.ClockIcon,
        color: 'gray',
        variant: 'soft',
        clickable: true
      }
    ];
    return items;
  });

  // Event handlers
  onCreateFlow() {
    const dialogRef = this.dialogService.open(CreateFlowWizard, {
      title: 'Create Complete Flow',
      size: 'lg'
    });

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.toastService.success('Flow created successfully!', 'Success');
        this.loadFlows();
      }
    });
  }

  private loadFlows(): void {
    this.isLoading.set(true);

    this.flowsService.getAllFlows().subscribe({
      next: (flows) => {
        this.flows.set(flows);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Failed to load flows', 'Error');
        this.isLoading.set(false);
        console.error('Error loading flows:', error);
      }
    });
  }

  getFlowStats() {
    const flows = this.flows();
    return {
      total: flows.length,
      active: flows.filter(f => f.status === 'active').length,
      paused: flows.filter(f => f.status === 'paused').length,
      draft: flows.filter(f => f.status === 'draft').length,
      error: flows.filter(f => f.status === 'error').length,
      archived: flows.filter(f => f.status === 'archived').length
    };
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }
  
  onSearchClear() {
    this.searchQuery.set('');
    this.selectedFilters.set([]);
  }

  onFilterChange(selectedFilters: string[]) {
    this.selectedFilters.set(selectedFilters);
  }

  // Initialize the component by loading flows
  ngOnInit(): void {
    this.loadFlows();
  }

  // Flow card event handlers
  onFlowEdit(flow: Flow): void {
    // In a real app, this would open an edit form
    console.log('Edit flow:', flow.id);
    this.toastService.info('Edit functionality coming soon!', 'Info');
  }

  async onFlowDelete(flow: Flow) {
    // In a real app, this would show a confirmation dialog first
    if (flow && confirm(`Are you sure you want to delete "${flow.name}"?`)) {
      try {
        await this.flowsService.deleteFlow(flow.id).toPromise();
        this.toastService.success('Flow deleted successfully.', 'Success');
        this.loadFlows();
      } catch (error) {
        this.toastService.error('Failed to delete flow.', 'Error');
      }
    }
  }

  async onFlowExecute(flow: Flow) {
    try {
      await this.flowsService.executeFlow(flow.id).toPromise();
      this.toastService.success('Flow execution started!', 'Success');
      this.loadFlows();
    } catch (error) {
      this.toastService.error('Failed to execute flow.', 'Error');
    }
  }

  async onFlowPause(flow: Flow) {
    try {
      await this.flowsService.pauseFlow(flow.id).toPromise();
      this.toastService.info('Flow paused.', 'Info');
      this.loadFlows();
    } catch (error) {
      this.toastService.error('Failed to pause flow.', 'Error');
    }
  }

  async onFlowResume(flow: Flow) {
    try {
      await this.flowsService.resumeFlow(flow.id).toPromise();
      this.toastService.success('Flow resumed!', 'Success');
      this.loadFlows();
    } catch (error) {
      this.toastService.error('Failed to resume flow.', 'Error');
    }
  }

  async onFlowDuplicate(flow: Flow) {
    try {
      await this.flowsService.duplicateFlow(flow.id).toPromise();
      this.toastService.success('Flow duplicated successfully!', 'Success');
      this.loadFlows();
    } catch (error) {
      this.toastService.error('Failed to duplicate flow.', 'Error');
    }
  }

  onFlowExport(flow: Flow) {
    // In a real app, this would open an export dialog
    console.log('Export flow:', flow.id);
    this.toastService.info('Export functionality coming soon!', 'Info');
  }
}
