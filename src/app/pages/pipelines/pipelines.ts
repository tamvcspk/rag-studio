import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Plus, Workflow, Search, CheckCircle, AlertTriangle, Clock, Pause } from 'lucide-angular';
import { RagButton } from '../../shared/components/atomic/primitives/rag-button/rag-button';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { EmptyStatePanel } from '../../shared/components/composite/empty-state-panel/empty-state-panel';
import { PipelineCard, type Pipeline } from '../../shared/components/composite/pipeline-card/pipeline-card';
import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { RagStatsOverview, StatItem } from '../../shared/components/semantic/data-display/rag-stats-overview';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';

@Component({
  selector: 'app-pipelines',
  standalone: true,
  imports: [
    CommonModule,
    RagButton,
    RagIcon,
    PipelineCard,
    RagPageHeader,
    RagStatsOverview
  ],
  templateUrl: './pipelines.html',
  styleUrl: './pipelines.scss'
})
export class Pipelines {
  private readonly toastService = inject(RagToastService);
  
  // Icon components
  readonly PlusIcon = Plus;
  readonly WorkflowIcon = Workflow;
  readonly SearchIcon = Search;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly ClockIcon = Clock;
  readonly PauseIcon = Pause;

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
      action: () => this.onCreatePipeline()
    }
  ]);

  // Mock data signals
  readonly pipelines = signal<Pipeline[]>([
    {
      id: '1',
      name: 'Documentation Sync',
      description: 'Syncs docs from GitHub repositories',
      status: 'running',
      schedule: 'Every 6 hours',
      lastRun: '2 hours ago',
      duration: '12m 34s',
      documentsProcessed: 1234,
      steps: [
        { name: 'fetch', type: 'GitHub' },
        { name: 'parse', type: 'Markdown' },
        { name: 'chunk', type: 'Smart Split' },
        { name: 'embed', type: 'MiniLM' },
        { name: 'index', type: 'FAISS' }
      ]
    },
    {
      id: '2',
      name: 'Research Paper Ingestion',
      description: 'Processes papers from arXiv',
      status: 'scheduled',
      schedule: 'Daily at 2 AM',
      nextRun: 'In 8h 15m',
      avgDuration: '45m',
      successRate: '98.5%',
      steps: [
        { name: 'fetch', type: 'arXiv API' },
        { name: 'parse', type: 'PDF' },
        { name: 'normalize', type: 'Clean' },
        { name: 'chunk', type: 'Sections' },
        { name: 'embed', type: 'E5-Large' },
        { name: 'index', type: 'Store' }
      ]
    },
    {
      id: '3',
      name: 'Web Documentation Crawler',
      description: 'Crawls and indexes web documentation',
      status: 'paused',
      schedule: 'Weekly',
      lastRun: '3 days ago',
      duration: '2h 15m',
      documentsProcessed: 5678,
      steps: [
        { name: 'crawl', type: 'Web Scraper' },
        { name: 'filter', type: 'Content Filter' },
        { name: 'parse', type: 'HTML' },
        { name: 'chunk', type: 'Semantic' },
        { name: 'embed', type: 'MiniLM' },
        { name: 'index', type: 'FAISS' }
      ]
    }
  ]);

  // Computed filtered pipelines
  readonly filteredPipelines = computed(() => {
    const pipelines = this.pipelines();
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
  
  // Computed statistics
  readonly pipelineStats = computed(() => {
    const pipelines = this.pipelines();
    return {
      total: pipelines.length,
      running: pipelines.filter(p => p.status === 'running').length,
      scheduled: pipelines.filter(p => p.status === 'scheduled').length,
      paused: pipelines.filter(p => p.status === 'paused').length,
      failed: pipelines.filter(p => p.status === 'error').length
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
        id: 'scheduled',
        label: 'Scheduled',
        value: stats.scheduled,
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

  onCreatePipeline(): void {
    console.log('Create pipeline clicked');
    this.toastService.info('Pipeline designer coming soon!', 'Info');
    // TODO: Navigate to pipeline designer or open wizard
  }

  onPipelinePause(pipeline: Pipeline): void {
    console.log('Pause pipeline:', pipeline.name);
    this.toastService.success(`Pipeline "${pipeline.name}" paused successfully!`, 'Success');
    // TODO: Implement pause functionality
  }

  onPipelinePlay(pipeline: Pipeline): void {
    console.log('Play/Run pipeline:', pipeline.name);
    this.toastService.success(`Pipeline "${pipeline.name}" started successfully!`, 'Success');
    // TODO: Implement run functionality
  }

  onPipelineEdit(pipeline: Pipeline): void {
    console.log('Edit pipeline:', pipeline.name);
    this.toastService.info('Pipeline editor coming soon!', 'Info');
    // TODO: Navigate to pipeline editor
  }

  onPipelineSchedule(pipeline: Pipeline): void {
    console.log('Schedule pipeline:', pipeline.name);
    this.toastService.info('Schedule configuration coming soon!', 'Info');
    // TODO: Open schedule configuration
  }

  onPipelineRunNow(pipeline: Pipeline): void {
    console.log('Run now pipeline:', pipeline.name);
    this.toastService.success(`Pipeline "${pipeline.name}" triggered to run now!`, 'Success');
    // TODO: Trigger immediate run
  }
}