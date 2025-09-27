import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cpu, Activity, HardDrive, Clock, Download, ExternalLink, CheckCircle, AlertCircle, XCircle } from 'lucide-angular';
import { EmbeddingModel, PerformanceMetrics } from '../../../../store/models.store';
import { RagCard } from '../../data-display/rag-card/rag-card';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';
import { RagChip } from '../../../atomic/primitives/rag-chip/rag-chip';
import { RagButton } from '../../../atomic/primitives/rag-button/rag-button';

@Component({
  selector: 'rag-model-details',
  standalone: true,
  imports: [
    CommonModule,
    RagCard,
    RagIcon,
    RagChip,
    RagButton
  ],
  templateUrl: './rag-model-details.html',
  styleUrl: './rag-model-details.scss'
})
export class RagModelDetails {
  // Input properties
  readonly model = input.required<EmbeddingModel>();
  readonly showActions = input(true);
  readonly compact = input(false);

  // Icon constants
  readonly CpuIcon = Cpu;
  readonly ActivityIcon = Activity;
  readonly HardDriveIcon = HardDrive;
  readonly ClockIcon = Clock;
  readonly DownloadIcon = Download;
  readonly ExternalLinkIcon = ExternalLink;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertCircleIcon = AlertCircle;
  readonly XCircleIcon = XCircle;

  // Computed properties
  readonly statusIcon = computed(() => {
    const status = this.model().status;
    switch (status) {
      case 'available': return this.CheckCircleIcon;
      case 'downloading': return this.DownloadIcon;
      case 'error': return this.XCircleIcon;
      case 'not_downloaded': return this.AlertCircleIcon;
      default: return this.AlertCircleIcon;
    }
  });

  readonly statusColor = computed(() => {
    const status = this.model().status;
    switch (status) {
      case 'available': return 'green';
      case 'downloading': return 'blue';
      case 'error': return 'red';
      case 'not_downloaded': return 'amber';
      default: return 'gray';
    }
  });

  readonly modelTypeIcon = computed(() => {
    const type = this.model().model_type;
    switch (type) {
      case 'embedding': return this.CpuIcon;
      case 'reranking': return this.ActivityIcon;
      case 'combined': return this.CpuIcon;
      default: return this.CpuIcon;
    }
  });

  readonly modelTypeColor = computed(() => {
    const type = this.model().model_type;
    switch (type) {
      case 'embedding': return 'blue';
      case 'reranking': return 'purple';
      case 'combined': return 'green';
      default: return 'gray';
    }
  });

  readonly sourceIcon = computed(() => {
    const source = this.model().source;
    switch (source) {
      case 'huggingface': return this.ExternalLinkIcon;
      case 'local': return this.HardDriveIcon;
      case 'bundled': return this.CheckCircleIcon;
      case 'manual': return this.HardDriveIcon;
      default: return this.HardDriveIcon;
    }
  });

  readonly sourceColor = computed(() => {
    const source = this.model().source;
    switch (source) {
      case 'huggingface': return 'orange';
      case 'local': return 'gray';
      case 'bundled': return 'green';
      case 'manual': return 'blue';
      default: return 'gray';
    }
  });

  readonly performanceScore = computed(() => {
    const metrics = this.model().performance_metrics;
    if (!metrics.accuracy_score) return null;
    return (metrics.accuracy_score * 100).toFixed(1);
  });

  readonly lastUsedFormatted = computed(() => {
    const lastUsed = this.model().last_used;
    if (!lastUsed) return 'Never';
    return this.formatRelativeTime(new Date(lastUsed));
  });

  readonly benchmarkDate = computed(() => {
    const metrics = this.model().performance_metrics;
    if (!metrics.benchmarked_at) return null;
    return this.formatRelativeTime(new Date(metrics.benchmarked_at));
  });

  readonly createdAtFormatted = computed(() => {
    return this.formatRelativeTime(new Date(this.model().created_at));
  });

  readonly updatedAtFormatted = computed(() => {
    return this.formatRelativeTime(new Date(this.model().updated_at));
  });

  readonly memoryUsage = computed(() => {
    const metrics = this.model().performance_metrics;
    return metrics.memory_usage_mb || this.model().size_mb;
  });

  // Utility methods
  formatFileSize(sizeInMB: number): string {
    if (sizeInMB < 1024) {
      return `${sizeInMB.toFixed(1)} MB`;
    } else {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else {
      return `${(ms / 1000).toFixed(1)}s`;
    }
  }

  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hr ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  formatCompatibility(compatibility: string[]): string {
    if (compatibility.length === 0) return 'Unknown';
    if (compatibility.length <= 2) return compatibility.join(', ');
    return `${compatibility.slice(0, 2).join(', ')} +${compatibility.length - 2}`;
  }

  // Action handlers
  onDownloadModel(): void {
    // TODO: Implement model download action
    console.log('Download model:', this.model().id);
  }

  onDeleteModel(): void {
    // TODO: Implement model deletion action
    console.log('Delete model:', this.model().id);
  }

  onRunBenchmark(): void {
    // TODO: Implement benchmark action
    console.log('Run benchmark for model:', this.model().id);
  }

  onViewSource(): void {
    // TODO: Implement view source action (e.g., open HuggingFace page)
    console.log('View source for model:', this.model().id);
  }
}