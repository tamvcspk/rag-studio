import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Play, Pause, Edit, Calendar, Clock, CheckCircle } from 'lucide-angular';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagIcon } from '../../atomic';
import { PipelineFlowVisualization } from '../pipeline-flow-visualization/pipeline-flow-visualization';

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'scheduled' | 'paused' | 'error';
  schedule: string;
  lastRun?: string;
  nextRun?: string;
  duration?: string;
  documentsProcessed?: number;
  successRate?: string;
  avgDuration?: string;
  steps: PipelineStep[];
}

export interface PipelineStep {
  name: string;
  type: string;
  description?: string;
}

@Component({
  selector: 'rag-pipeline-card',
  standalone: true,
  imports: [
    CommonModule,
    RagChip,
    RagButton,
    RagCard,
    RagIcon,
    PipelineFlowVisualization
  ],
  templateUrl: './pipeline-card.html',
  styleUrl: './pipeline-card.scss'
})
export class PipelineCard {
  readonly pipeline = input.required<Pipeline>();
  readonly loading = input(false);
  
  readonly onPause = output<Pipeline>();
  readonly onPlay = output<Pipeline>();
  readonly onEdit = output<Pipeline>();
  readonly onSchedule = output<Pipeline>();
  readonly onRunNow = output<Pipeline>();

  // Icons
  readonly PlayIcon = Play;
  readonly PauseIcon = Pause;
  readonly EditIcon = Edit;
  readonly CalendarIcon = Calendar;
  readonly ClockIcon = Clock;
  readonly CheckCircleIcon = CheckCircle;

  getBadgeVariant(status: string): 'solid' | 'soft' | 'outline' {
    switch (status) {
      case 'running':
        return 'solid';
      case 'scheduled':
        return 'soft';
      case 'error':
        return 'solid';
      default:
        return 'outline';
    }
  }

  getBadgeColor(status: string): 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple' {
    switch (status) {
      case 'running':
        return 'green';
      case 'scheduled':
        return 'gray';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  }

  getStatusIcon(status: string): any {
    switch (status) {
      case 'running':
        return CheckCircle;
      case 'scheduled':
        return Clock;
      default:
        return Clock;
    }
  }

  onPauseClick(): void {
    this.onPause.emit(this.pipeline());
  }

  onPlayClick(): void {
    this.onPlay.emit(this.pipeline());
  }

  onEditClick(): void {
    this.onEdit.emit(this.pipeline());
  }

  onScheduleClick(): void {
    this.onSchedule.emit(this.pipeline());
  }

  onRunNowClick(): void {
    this.onRunNow.emit(this.pipeline());
  }
}