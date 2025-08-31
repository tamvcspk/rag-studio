import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Plus, Workflow } from 'lucide-angular';
import { RagButton } from '../../shared/components/atomic/primitives/rag-button/rag-button';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { EmptyStatePanel } from '../../shared/components/composite/empty-state-panel/empty-state-panel';
import { PipelineCard, type Pipeline } from '../../shared/components/composite/pipeline-card/pipeline-card';

@Component({
  selector: 'app-pipelines',
  standalone: true,
  imports: [
    CommonModule,
    RagButton,
    RagIcon,
    EmptyStatePanel,
    PipelineCard
  ],
  templateUrl: './pipelines.html',
  styleUrl: './pipelines.scss'
})
export class Pipelines {
  readonly PlusIcon = Plus;
  readonly WorkflowIcon = Workflow;

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

  readonly isLoading = signal(false);
  readonly isEmpty = signal(false);

  onCreatePipeline(): void {
    console.log('Create pipeline clicked');
    // TODO: Navigate to pipeline designer or open wizard
  }

  onPipelinePause(pipeline: Pipeline): void {
    console.log('Pause pipeline:', pipeline.name);
    // TODO: Implement pause functionality
  }

  onPipelinePlay(pipeline: Pipeline): void {
    console.log('Play/Run pipeline:', pipeline.name);
    // TODO: Implement run functionality
  }

  onPipelineEdit(pipeline: Pipeline): void {
    console.log('Edit pipeline:', pipeline.name);
    // TODO: Navigate to pipeline editor
  }

  onPipelineSchedule(pipeline: Pipeline): void {
    console.log('Schedule pipeline:', pipeline.name);
    // TODO: Open schedule configuration
  }

  onPipelineRunNow(pipeline: Pipeline): void {
    console.log('Run now pipeline:', pipeline.name);
    // TODO: Trigger immediate run
  }
}