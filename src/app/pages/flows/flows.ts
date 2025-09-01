import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  GitBranchIcon,
  LayoutIcon,
  PlusIcon,
  SearchIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  FileEditIcon,
  XCircleIcon,
  FilterXIcon
} from 'lucide-angular';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { Flow } from '../../shared/models/flow.model';
import { FlowsService } from '../../shared/services/flows';
import { FlowCard } from '../../shared/components/composite/flow-card/flow-card';
import { CreateFlowWizard } from '../../shared/components/composite/create-flow-wizard/create-flow-wizard';
import { FlowDesigner } from '../../shared/components/composite/flow-designer/flow-designer';
import { EmptyStatePanel } from '../../shared/components/composite/empty-state-panel/empty-state-panel';
import { RagAlert, RagChip, RagButton, RagInput, RagSelect } from '../../shared/components';
import { RagDialogService } from '../../shared/components/semantic/overlay/rag-dialog/rag-dialog.service';
import { RagPageHeader, type PageHeaderAction } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';

@Component({
  selector: 'app-flows',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    FlowCard,
    EmptyStatePanel,
    RagButton,
    RagInput,
    RagSelect,
    RagChip,
    RagAlert,
    RagPageHeader
  ],
  templateUrl: './flows.html',
  styleUrl: './flows.scss'
})
export class Flows implements OnInit {
  // Icon components
  readonly GitBranchIcon = GitBranchIcon;
  readonly LayoutIcon = LayoutIcon;
  readonly PlusIcon = PlusIcon;
  readonly SearchIcon = SearchIcon;
  readonly PlayCircleIcon = PlayCircleIcon;
  readonly PauseCircleIcon = PauseCircleIcon;
  readonly FileEditIcon = FileEditIcon;
  readonly XCircleIcon = XCircleIcon;
  readonly FilterXIcon = FilterXIcon;

  readonly flows = signal<Flow[]>([]);
  readonly filteredFlows = signal<Flow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly statusFilter = signal<'all' | Flow['status']>('all');
  readonly showCreateWizard = signal(false);
  readonly showDesigner = signal(false);
  readonly selectedFlow = signal<Flow | null>(null);

  // Computed stats
  readonly activeFlowsCount = computed(() => 
    this.flows().filter(f => f.status === 'active').length
  );
  readonly pausedFlowsCount = computed(() => 
    this.flows().filter(f => f.status === 'paused').length
  );
  readonly draftFlowsCount = computed(() => 
    this.flows().filter(f => f.status === 'draft').length
  );
  readonly errorFlowsCount = computed(() => 
    this.flows().filter(f => f.status === 'error').length
  );

  readonly statusOptions = [
    { value: 'all', label: 'All Flows' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'draft', label: 'Draft' },
    { value: 'error', label: 'Error' },
    { value: 'archived', label: 'Archived' }
  ];

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'Flow Designer',
      icon: LayoutIcon,
      variant: 'outline',
      size: 'md',
      action: () => this.openDesigner()
    },
    {
      label: 'Create Flow',
      icon: PlusIcon,
      variant: 'solid',
      size: 'md',
      action: () => this.openCreateWizard()
    }
  ];

  constructor(
    private flowsService: FlowsService,
    private dialogService: RagDialogService
  ) {}

  ngOnInit(): void {
    this.loadFlows();
    
    // Set up reactive filtering
    this.setupFiltering();
  }

  private setupFiltering(): void {
    // Update filtered flows when search query or status filter changes
    // In a real app, this would be handled with computed signals or RxJS
    const updateFilters = () => {
      const flows = this.flows();
      const query = this.searchQuery().toLowerCase().trim();
      const status = this.statusFilter();

      let filtered = flows;

      // Status filter
      if (status !== 'all') {
        filtered = filtered.filter(flow => flow.status === status);
      }

      // Search filter
      if (query) {
        filtered = filtered.filter(flow =>
          flow.name.toLowerCase().includes(query) ||
          flow.description.toLowerCase().includes(query) ||
          flow.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      this.filteredFlows.set(filtered);
    };

    // Call initially and whenever signals change
    updateFilters();
    
    // Set up watchers (in a real app, you'd use effect() or RxJS)
    this.searchQuery.set = (value: string) => {
      this.searchQuery.set(value);
      updateFilters();
    };
    
    this.statusFilter.set = (value: 'all' | Flow['status']) => {
      this.statusFilter.set(value);
      updateFilters();
    };
  }

  private loadFlows(): void {
    this.loading.set(true);
    this.error.set(null);

    this.flowsService.getAllFlows().subscribe({
      next: (flows) => {
        this.flows.set(flows);
        this.filteredFlows.set(flows);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load flows');
        this.loading.set(false);
        console.error('Error loading flows:', error);
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.updateFilters();
  }

  onStatusFilterChange(status: 'all' | Flow['status'] | null): void {
    this.statusFilter.set(status || 'all');
    this.updateFilters();
  }

  updateFilters(): void {
    const flows = this.flows();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    let filtered = flows;

    if (status !== 'all') {
      filtered = filtered.filter(flow => flow.status === status);
    }

    if (query) {
      filtered = filtered.filter(flow =>
        flow.name.toLowerCase().includes(query) ||
        flow.description.toLowerCase().includes(query) ||
        flow.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    this.filteredFlows.set(filtered);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.updateFilters();
  }

  openCreateWizard(): void {
    const dialogRef = this.dialogService.open(CreateFlowWizard, {
      size: 'lg'
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        this.onFlowCreated(result);
      }
    });
  }

  closeCreateWizard(): void {
    // No longer needed - handled by dialog service
  }

  openDesigner(flow?: Flow): void {
    const config: any = {
      size: 'xl'
    };
    
    if (flow) {
      config.data = { flow };
    }
    
    const dialogRef = this.dialogService.open(FlowDesigner, config);

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        this.onFlowSaved(result);
      }
    });
  }

  closeDesigner(): void {
    // No longer needed - handled by dialog service
  }

  // Flow card event handlers
  onFlowEdit(flow: Flow): void {
    this.openDesigner(flow);
  }

  onFlowDelete(flow: Flow): void {
    if (confirm(`Are you sure you want to delete "${flow.name}"?`)) {
      this.flowsService.deleteFlow(flow.id).subscribe({
        next: (success) => {
          if (success) {
            this.loadFlows();
          }
        },
        error: (error) => {
          this.error.set('Failed to delete flow');
          console.error('Error deleting flow:', error);
        }
      });
    }
  }

  onFlowExecute(flow: Flow): void {
    this.flowsService.executeFlow(flow.id).subscribe({
      next: (execution) => {
        console.log('Flow execution started:', execution);
        // In a real app, you might show a toast or navigate to execution details
        this.loadFlows(); // Refresh to show updated execution stats
      },
      error: (error) => {
        this.error.set('Failed to execute flow');
        console.error('Error executing flow:', error);
      }
    });
  }

  onFlowPause(flow: Flow): void {
    this.flowsService.pauseFlow(flow.id).subscribe({
      next: (updatedFlow) => {
        if (updatedFlow) {
          this.loadFlows();
        }
      },
      error: (error) => {
        this.error.set('Failed to pause flow');
        console.error('Error pausing flow:', error);
      }
    });
  }

  onFlowResume(flow: Flow): void {
    this.flowsService.resumeFlow(flow.id).subscribe({
      next: (updatedFlow) => {
        if (updatedFlow) {
          this.loadFlows();
        }
      },
      error: (error) => {
        this.error.set('Failed to resume flow');
        console.error('Error resuming flow:', error);
      }
    });
  }

  onFlowDuplicate(flow: Flow): void {
    this.flowsService.duplicateFlow(flow.id).subscribe({
      next: (duplicatedFlow) => {
        if (duplicatedFlow) {
          this.loadFlows();
        }
      },
      error: (error) => {
        this.error.set('Failed to duplicate flow');
        console.error('Error duplicating flow:', error);
      }
    });
  }

  onFlowExport(flow: Flow): void {
    this.flowsService.exportFlow(flow.id).subscribe({
      next: (exportData) => {
        // Create and download file
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${flow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flow.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.error.set('Failed to export flow');
        console.error('Error exporting flow:', error);
      }
    });
  }

  // Wizard event handlers
  onFlowCreated(flow: Flow): void {
    this.loadFlows();
    console.log('Flow created:', flow);
  }

  onWizardCancel(): void {
    // No longer needed - handled by dialog service
  }

  // Designer event handlers
  onFlowSaved(flow: Flow): void {
    this.flowsService.updateFlow(flow.id, flow).subscribe({
      next: (updatedFlow) => {
        if (updatedFlow) {
          this.loadFlows();
        }
      },
      error: (error) => {
        this.error.set('Failed to save flow');
        console.error('Error saving flow:', error);
      }
    });
  }

  onDesignerCancel(): void {
    // No longer needed - handled by dialog service
  }

  dismissError(): void {
    this.error.set(null);
  }

  getStatusBadgeColor(status: Flow['status'] | 'all'): 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple' {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'amber';
      case 'error': return 'red';
      case 'draft': return 'gray';
      case 'archived': return 'gray';
      case 'all': return 'blue';
      default: return 'gray';
    }
  }
}
