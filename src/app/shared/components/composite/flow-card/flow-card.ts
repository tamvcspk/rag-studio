import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  GitBranchIcon, 
  ArrowRightIcon, 
  PauseIcon, 
  PlayIcon, 
  EditIcon, 
  CopyIcon, 
  DownloadIcon, 
  Trash2Icon,
  PlayCircleIcon,
  PauseCircleIcon,
  XCircleIcon,
  FileEditIcon,
  ArchiveIcon,
  CircleIcon
} from 'lucide-angular';
import { Flow } from '../../../models/flow.model';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RagBadge } from '../../atomic/primitives/rag-badge/rag-badge';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';

@Component({
  selector: 'app-flow-card',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    RagBadge,
    RagButton,
    RagCard
  ],
  templateUrl: './flow-card.html',
  styleUrl: './flow-card.scss'
})
export class FlowCard {
  readonly flow = input.required<Flow>();

  // Icon components
  readonly gitBranchIcon = GitBranchIcon;
  readonly arrowRightIcon = ArrowRightIcon;
  readonly pauseIcon = PauseIcon;
  readonly playIcon = PlayIcon;
  readonly editIcon = EditIcon;
  readonly copyIcon = CopyIcon;
  readonly downloadIcon = DownloadIcon;
  readonly trash2Icon = Trash2Icon;
  readonly playCircleIcon = PlayCircleIcon;
  readonly pauseCircleIcon = PauseCircleIcon;
  readonly xCircleIcon = XCircleIcon;
  readonly fileEditIcon = FileEditIcon;
  readonly archiveIcon = ArchiveIcon;
  readonly circleIcon = CircleIcon;

  readonly onEdit = output<Flow>();
  readonly onDelete = output<Flow>();
  readonly onExecute = output<Flow>();
  readonly onPause = output<Flow>();
  readonly onResume = output<Flow>();
  readonly onDuplicate = output<Flow>();
  readonly onExport = output<Flow>();  onEditClick() {
    this.onEdit.emit(this.flow());
  }

  onDeleteClick() {
    this.onDelete.emit(this.flow());
  }

  onExecuteClick() {
    this.onExecute.emit(this.flow());
  }

  onPauseClick() {
    this.onPause.emit(this.flow());
  }

  onResumeClick() {
    this.onResume.emit(this.flow());
  }

  onDuplicateClick() {
    this.onDuplicate.emit(this.flow());
  }

  onExportClick() {
    this.onExport.emit(this.flow());
  }

  getStatusIcon(): any {
    switch (this.flow().status) {
      case 'active': return this.playCircleIcon;
      case 'paused': return this.pauseCircleIcon;
      case 'error': return this.xCircleIcon;
      case 'draft': return this.fileEditIcon;
      case 'archived': return this.archiveIcon;
      default: return this.circleIcon;
    }
  }

  getStatusColor(): 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple' {
    switch (this.flow().status) {
      case 'active': return 'green';
      case 'paused': return 'amber';
      case 'error': return 'red';
      case 'draft': return 'gray';
      case 'archived': return 'gray';
      default: return 'gray';
    }
  }

  formatDuration(ms?: number): string {
    if (!ms) return 'N/A';
    
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }
}
