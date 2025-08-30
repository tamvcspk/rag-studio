import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Flow } from '../../../models/flow.model';
import { RagBadge } from '../../atomic/primitives/rag-badge/rag-badge';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';

@Component({
  selector: 'app-flow-card',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    RagBadge,
    RagButton,
    RagCard
  ],
  templateUrl: './flow-card.html',
  styleUrl: './flow-card.scss'
})
export class FlowCardComponent {
  readonly flow = input.required<Flow>();
  
  readonly onEdit = output<Flow>();
  readonly onDelete = output<Flow>();
  readonly onExecute = output<Flow>();
  readonly onPause = output<Flow>();
  readonly onResume = output<Flow>();
  readonly onDuplicate = output<Flow>();
  readonly onExport = output<Flow>();

  onEditClick() {
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

  getStatusIcon(): string {
    switch (this.flow().status) {
      case 'active': return 'play-circle';
      case 'paused': return 'pause-circle';
      case 'error': return 'x-circle';
      case 'draft': return 'file-edit';
      case 'archived': return 'archive';
      default: return 'circle';
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
