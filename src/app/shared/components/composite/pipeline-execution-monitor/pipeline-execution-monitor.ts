import { Component, input, output, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import {
  PlayIcon,
  PauseIcon,
  StopCircleIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  XIcon,
  RefreshCwIcon,
  BarChart3Icon,
  FileTextIcon
} from 'lucide-angular';
import { PipelineRun, PipelineRunStatus, PipelineStepRun } from '../../../models/pipeline.model';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagProgress } from '../../atomic/primitives/rag-progress/rag-progress';

@Component({
  selector: 'app-pipeline-execution-monitor',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    RagChip,
    RagButton,
    RagCard,
    RagProgress
  ],
  templateUrl: './pipeline-execution-monitor.html',
  styleUrl: './pipeline-execution-monitor.scss'
})
export class PipelineExecutionMonitor implements OnInit, OnDestroy {
  readonly pipelineRun = input.required<PipelineRun>();
  readonly showDetails = input(true);
  readonly autoRefresh = input(true);
  readonly refreshInterval = input(5000); // 5 seconds

  readonly onCancel = output<string>();
  readonly onRetry = output<string>();
  readonly onViewLogs = output<string>();

  // Icon components
  readonly playIcon = PlayIcon;
  readonly pauseIcon = PauseIcon;
  readonly stopIcon = StopCircleIcon;
  readonly checkCircleIcon = CheckCircleIcon;
  readonly alertCircleIcon = AlertCircleIcon;
  readonly clockIcon = ClockIcon;
  readonly xIcon = XIcon;
  readonly refreshCwIcon = RefreshCwIcon;
  readonly barChart3Icon = BarChart3Icon;
  readonly fileTextIcon = FileTextIcon;

  // Internal state
  readonly isExpanded = signal(false);
  readonly lastUpdated = signal(new Date());

  private refreshSubscription?: Subscription;

  // Computed values
  readonly runProgress = computed(() => {
    const run = this.pipelineRun();
    const completed = run.metrics.stepsCompleted;
    const total = run.metrics.stepsTotal;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  readonly estimatedTimeRemaining = computed(() => {
    const run = this.pipelineRun();
    if (run.status !== 'running' || !run.metrics.duration) {
      return null;
    }

    const elapsed = run.metrics.duration;
    const progress = this.runProgress();
    if (progress <= 0) return null;

    const totalEstimated = (elapsed / progress) * 100;
    const remaining = totalEstimated - elapsed;
    return Math.max(0, remaining);
  });

  readonly statusColor = computed(() => {
    const status = this.pipelineRun().status;
    switch (status) {
      case 'running': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'cancelled': return 'gray';
      case 'pending': return 'amber';
      default: return 'gray';
    }
  });

  readonly statusIcon = computed(() => {
    const status = this.pipelineRun().status;
    switch (status) {
      case 'running': return this.playIcon;
      case 'completed': return this.checkCircleIcon;
      case 'failed': return this.alertCircleIcon;
      case 'cancelled': return this.stopIcon;
      case 'pending': return this.clockIcon;
      default: return this.clockIcon;
    }
  });

  readonly statusVariant = computed(() => {
    const status = this.pipelineRun().status;
    switch (status) {
      case 'running': return 'primary' as const;
      case 'completed': return 'success' as const;
      case 'failed': return 'danger' as const;
      case 'cancelled': return 'warning' as const;
      case 'pending': return 'warning' as const;
      default: return 'primary' as const;
    }
  });

  readonly canCancel = computed(() => {
    const status = this.pipelineRun().status;
    return status === 'running' || status === 'pending';
  });

  readonly canRetry = computed(() => {
    const status = this.pipelineRun().status;
    return status === 'failed' || status === 'cancelled';
  });

  readonly formattedDuration = computed(() => {
    const duration = this.pipelineRun().metrics.duration;
    if (!duration) return 'N/A';
    return this.formatDuration(duration);
  });

  readonly formattedStartTime = computed(() => {
    const startTime = this.pipelineRun().startedAt;
    return new Date(startTime).toLocaleString();
  });

  readonly formattedEndTime = computed(() => {
    const endTime = this.pipelineRun().endedAt;
    return endTime ? new Date(endTime).toLocaleString() : 'Running...';
  });

  ngOnInit(): void {
    if (this.autoRefresh() && this.canCancel()) {
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  toggleExpanded(): void {
    this.isExpanded.update(current => !current);
  }

  cancelExecution(): void {
    this.onCancel.emit(this.pipelineRun().id);
  }

  retryExecution(): void {
    this.onRetry.emit(this.pipelineRun().id);
  }

  viewLogs(): void {
    this.onViewLogs.emit(this.pipelineRun().id);
  }

  refreshStatus(): void {
    this.lastUpdated.set(new Date());
    // TODO: Trigger refresh from parent component or store
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(this.refreshInterval()).subscribe(() => {
      if (this.canCancel()) {
        this.refreshStatus();
      } else {
        this.stopAutoRefresh();
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      const remainingSeconds = seconds % 60;
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  protected formatTimeRemaining(milliseconds: number): string {
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.ceil(seconds / 60);
    const hours = Math.ceil(minutes / 60);

    if (hours > 1) {
      return `~${hours}h remaining`;
    } else if (minutes > 1) {
      return `~${minutes}m remaining`;
    } else {
      return `~${seconds}s remaining`;
    }
  }

  protected getStepStatusColor(status: PipelineRunStatus): 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple' {
    switch (status) {
      case 'running': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'cancelled': return 'gray';
      case 'pending': return 'amber';
      default: return 'gray';
    }
  }

  protected getStepStatusIcon(status: PipelineRunStatus): any {
    switch (status) {
      case 'running': return this.playIcon;
      case 'completed': return this.checkCircleIcon;
      case 'failed': return this.alertCircleIcon;
      case 'cancelled': return this.stopIcon;
      case 'pending': return this.clockIcon;
      default: return this.clockIcon;
    }
  }
}