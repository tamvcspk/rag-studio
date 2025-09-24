import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { Plus, Workflow, Search, CheckCircle, AlertTriangle, Clock, Pause, Edit, Play } from 'lucide-angular';
import { EmptyStatePanel } from '../../shared/components/composite/empty-state-panel/empty-state-panel';
import { PipelineCard, type Pipeline as PipelineCardType } from '../../shared/components/composite/pipeline-card/pipeline-card';
import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { RagStatsOverview, StatItem } from '../../shared/components/semantic/data-display/rag-stats-overview';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';
import { PipelinesStore, CreatePipelineRequest, ExecutePipelineRequest } from '../../shared/store/pipelines.store';
import { Pipeline, PipelineStatus } from '../../shared/models/pipeline.model';
import { PipelineDesigner } from '../../shared/components/composite/pipeline-designer/pipeline-designer';

@Component({
  selector: 'app-pipelines',
  standalone: true,
  imports: [
    CommonModule,
    PipelineCard,
    RagPageHeader,
    RagStatsOverview,
    EmptyStatePanel
  ],
  templateUrl: './pipelines.html',
  styleUrl: './pipelines.scss'
})
export class Pipelines implements OnInit, OnDestroy {
  private readonly toastService = inject(RagToastService);
  private readonly dialog = inject(Dialog);
  private readonly pipelinesStore = inject(PipelinesStore);
  
  // Icon components
  readonly PlusIcon = Plus;
  readonly WorkflowIcon = Workflow;
  readonly SearchIcon = Search;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly ClockIcon = Clock;
  readonly PauseIcon = Pause;
  readonly EditIcon = Edit;
  readonly PlayIcon = Play;

  // Reactive signals
  readonly searchQuery = signal('');
  readonly selectedFilters = signal<string[]>([]);
  readonly isLoading = signal(false);

  // Page header actions
  readonly headerActions = computed(() => [
    {
      label: 'Design Pipeline',
      icon: this.PlusIcon,
      variant: 'solid' as const,
      action: () => this.openPipelineDesigner()
    }
  ]);

  // Store computed signals
  readonly pipelines = this.pipelinesStore.pipelines;
  readonly isStoreLoading = this.pipelinesStore.isLoading;
  readonly storeError = this.pipelinesStore.lastError;
  readonly selectedPipeline = this.pipelinesStore.selectedPipeline;
  readonly recentRuns = this.pipelinesStore.recentRuns;
  readonly runningExecutions = this.pipelinesStore.runningExecutions;
  readonly metrics = this.pipelinesStore.computedMetrics;

  // Convert store pipelines to card format
  readonly pipelineCards = computed((): PipelineCardType[] => {
    const storePipelines = this.pipelines();
    return storePipelines.map(pipeline => this.convertPipelineToCard(pipeline));
  });

  // Computed filtered pipelines
  readonly filteredPipelines = computed(() => {
    const pipelines = this.pipelineCards();
    const query = this.searchQuery().toLowerCase().trim();
    const selectedFilters = this.selectedFilters();

    if (!pipelines || pipelines.length === 0) {
      return [];
    }

    // First filter by search query
    let filteredPipelines = !query ? pipelines : pipelines.filter(pipeline => {
      if (!pipeline) return false;

      // Check if query matches any searchable field
      return [
        pipeline.name?.toLowerCase() || '',
        pipeline.description?.toLowerCase() || '',
        pipeline.status?.toLowerCase() || ''
      ].some(field => field.includes(query));
    });

    // Then filter by selected status filters if any
    if (selectedFilters.length > 0) {
      filteredPipelines = filteredPipelines.filter(pipeline => {
        if (!pipeline.status) return false;

        // Check if pipeline status matches any selected filter
        return selectedFilters.some(filterId => {
          return pipeline.status === filterId;
        });
      });
    }

    return filteredPipelines;
  });
  
  // Computed statistics from store metrics
  readonly pipelineStats = computed(() => {
    const metrics = this.metrics();
    return {
      total: metrics.total_pipelines,
      running: metrics.running_executions,
      active: metrics.active_pipelines,
      paused: metrics.total_pipelines - metrics.active_pipelines - metrics.error_pipelines,
      failed: metrics.error_pipelines
    };
  });
  
  // Computed statistics for overview component
  readonly pipelineStatsItems = computed(() => {
    const stats = this.pipelineStats();
    const items: StatItem[] = [
      {
        id: 'total',
        label: 'Total Pipelines',
        value: stats.total,
        icon: this.WorkflowIcon,
        color: 'blue',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'running',
        label: 'Running',
        value: stats.running,
        icon: this.CheckCircleIcon,
        color: 'green',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'active',
        label: 'Active',
        value: stats.active,
        icon: this.ClockIcon,
        color: 'amber',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'paused',
        label: 'Paused',
        value: stats.paused,
        icon: this.PauseIcon,
        color: 'gray',
        variant: 'soft',
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

  ngOnInit(): void {
    this.pipelinesStore.initialize();
  }

  ngOnDestroy(): void {
    this.pipelinesStore.destroy();
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

  async openPipelineDesigner(pipeline?: Pipeline): Promise<void> {
    const dialogRef = this.dialog.open(PipelineDesigner, {
      data: { pipeline },
      disableClose: false,
      width: '95vw',
      height: '90vh',
      maxWidth: '1600px',
      maxHeight: '1000px'
    });

    dialogRef.closed.subscribe(result => {
      if (result && typeof result === 'object') {
        if (pipeline) {
          // Update existing pipeline
          this.updatePipeline(result as Pipeline);
        } else {
          // Create new pipeline
          this.createPipeline(result as Pipeline);
        }
      }
    });
  }

  async createPipeline(pipelineData: Pipeline): Promise<void> {
    const request: CreatePipelineRequest = {
      name: pipelineData.name,
      description: pipelineData.description,
      tags: pipelineData.tags
    };

    const result = await this.pipelinesStore.createPipeline(request);
    if (result) {
      this.toastService.success(`Pipeline "${result.name}" created successfully!`, 'Success');
    } else {
      this.toastService.error('Failed to create pipeline', 'Error');
    }
  }

  async updatePipeline(pipelineData: Pipeline): Promise<void> {
    const result = await this.pipelinesStore.updatePipeline({
      id: pipelineData.id,
      name: pipelineData.name,
      description: pipelineData.description,
      spec: pipelineData.spec,
      tags: pipelineData.tags
    });

    if (result) {
      this.toastService.success(`Pipeline "${result.name}" updated successfully!`, 'Success');
    } else {
      this.toastService.error('Failed to update pipeline', 'Error');
    }
  }

  async onPipelinePause(pipelineCard: PipelineCardType): Promise<void> {
    const pipeline = this.findPipelineById(pipelineCard.id);
    if (pipeline) {
      const result = await this.pipelinesStore.updatePipeline({
        id: pipeline.id,
        status: 'paused'
      });

      if (result) {
        this.toastService.success(`Pipeline "${pipeline.name}" paused successfully!`, 'Success');
      } else {
        this.toastService.error('Failed to pause pipeline', 'Error');
      }
    }
  }

  async onPipelinePlay(pipelineCard: PipelineCardType): Promise<void> {
    const pipeline = this.findPipelineById(pipelineCard.id);
    if (pipeline) {
      if (pipeline.status === 'paused') {
        // Resume pipeline
        const result = await this.pipelinesStore.updatePipeline({
          id: pipeline.id,
          status: 'active'
        });

        if (result) {
          this.toastService.success(`Pipeline "${pipeline.name}" resumed successfully!`, 'Success');
        } else {
          this.toastService.error('Failed to resume pipeline', 'Error');
        }
      } else {
        // Execute pipeline
        const result = await this.pipelinesStore.executePipeline({
          pipelineId: pipeline.id,
          triggeredBy: {
            type: 'manual',
            userId: 'current-user',
            source: 'pipelines-page'
          }
        });

        if (result) {
          this.toastService.success(`Pipeline "${pipeline.name}" started successfully!`, 'Success');
        } else {
          this.toastService.error('Failed to start pipeline', 'Error');
        }
      }
    }
  }

  onPipelineEdit(pipelineCard: PipelineCardType): void {
    const pipeline = this.findPipelineById(pipelineCard.id);
    if (pipeline) {
      this.openPipelineDesigner(pipeline);
    }
  }

  onPipelineSchedule(pipelineCard: PipelineCardType): void {
    console.log('Schedule pipeline:', pipelineCard.name);
    this.toastService.info('Schedule configuration coming soon!', 'Info');
    // TODO: Open schedule configuration
  }

  async onPipelineRunNow(pipelineCard: PipelineCardType): Promise<void> {
    const pipeline = this.findPipelineById(pipelineCard.id);
    if (pipeline) {
      const result = await this.pipelinesStore.executePipeline({
        pipelineId: pipeline.id,
        triggeredBy: {
          type: 'manual',
          userId: 'current-user',
          source: 'pipelines-page'
        }
      });

      if (result) {
        this.toastService.success(`Pipeline "${pipeline.name}" triggered to run now!`, 'Success');
      } else {
        this.toastService.error('Failed to trigger pipeline execution', 'Error');
      }
    }
  }

  // Helper methods
  private findPipelineById(id: string): Pipeline | undefined {
    return this.pipelines().find(p => p.id === id);
  }

  private convertPipelineToCard(pipeline: Pipeline): PipelineCardType {
    const recentRuns = this.recentRuns().filter(run => run.pipelineId === pipeline.id);
    const lastRun = recentRuns[0];
    const nextRun = undefined; // TODO: Calculate from schedule

    return {
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      status: this.mapPipelineStatus(pipeline.status),
      schedule: 'Manual', // TODO: Extract from pipeline spec
      lastRun: lastRun ? this.formatRelativeTime(lastRun.startedAt) : undefined,
      nextRun,
      duration: lastRun?.metrics.duration ? this.formatDuration(lastRun.metrics.duration) : undefined,
      documentsProcessed: lastRun?.metrics.recordsProcessed,
      successRate: this.calculateSuccessRate(recentRuns),
      avgDuration: this.calculateAverageDuration(recentRuns),
      steps: pipeline.spec.steps.map(step => ({
        name: step.type,
        type: step.name,
        description: step.config?.['description']
      }))
    };
  }

  private mapPipelineStatus(status: PipelineStatus): 'running' | 'scheduled' | 'paused' | 'error' {
    switch (status) {
      case 'active': return 'scheduled';
      case 'paused': return 'paused';
      case 'error': return 'error';
      case 'draft': return 'paused';
      default: return 'paused';
    }
  }

  private formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    } else {
      return `${minutes}m ago`;
    }
  }

  private formatDuration(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  private calculateSuccessRate(runs: any[]): string {
    if (runs.length === 0) return '0%';
    const successful = runs.filter(run => run.status === 'completed').length;
    return `${Math.round((successful / runs.length) * 100)}%`;
  }

  private calculateAverageDuration(runs: any[]): string {
    if (runs.length === 0) return '0m';
    const completed = runs.filter(run => run.status === 'completed' && run.metrics.duration);
    if (completed.length === 0) return '0m';

    const totalDuration = completed.reduce((sum, run) => sum + run.metrics.duration, 0);
    const avgDuration = totalDuration / completed.length;
    return this.formatDuration(avgDuration);
  }
}