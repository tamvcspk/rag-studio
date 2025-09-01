import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Search, MessageSquare, Pause, Edit, Trash2, Play, AlertCircle, RefreshCw, FileText } from 'lucide-angular';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagAlert } from '../../atomic/feedback/rag-alert/rag-alert';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { Tool } from '../../../types/tool.types';

@Component({
  selector: 'app-tool-card',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    RagCard,
    RagChip,
    RagButton,
    RagAlert
  ],
  templateUrl: './tool-card.html',
  styleUrl: './tool-card.scss'
})
export class ToolCard {
  readonly tool = input.required<Tool>();
  readonly loading = input(false);
  
  readonly onActivate = output<string>();
  readonly onDeactivate = output<string>();
  readonly onEdit = output<string>();
  readonly onDelete = output<string>();
  readonly onRetry = output<string>();
  readonly onViewLogs = output<string>();

  // Lucide icons
  readonly Search = Search;
  readonly MessageSquare = MessageSquare;
  readonly Pause = Pause;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly Play = Play;
  readonly AlertCircle = AlertCircle;
  readonly RefreshCw = RefreshCw;
  readonly FileText = FileText;

  getStatusIcon() {
    const tool = this.tool();
    switch (tool.status) {
      case 'ACTIVE':
        return tool.baseOperation === 'rag.search' ? this.Search : this.MessageSquare;
      case 'ERROR':
        return this.AlertCircle;
      default:
        return tool.baseOperation === 'rag.search' ? this.Search : this.MessageSquare;
    }
  }

  getStatusBadgeVariant(): 'solid' | 'soft' | 'outline' {
    const status = this.tool().status;
    switch (status) {
      case 'ACTIVE':
      case 'ERROR':
      case 'PENDING':
        return 'solid';
      case 'INACTIVE':
      default:
        return 'soft';
    }
  }

  getStatusBadgeColor(): 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple' {
    const status = this.tool().status;
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'ERROR':
        return 'red';
      case 'PENDING':
        return 'amber';
      case 'INACTIVE':
      default:
        return 'gray';
    }
  }

  getStatusBadgeText() {
    return this.tool().status;
  }

  handleAction(action: string) {
    const toolId = this.tool().id;
    switch (action) {
      case 'activate':
        this.onActivate.emit(toolId);
        break;
      case 'deactivate':
        this.onDeactivate.emit(toolId);
        break;
      case 'edit':
        this.onEdit.emit(toolId);
        break;
      case 'delete':
        this.onDelete.emit(toolId);
        break;
      case 'retry':
        this.onRetry.emit(toolId);
        break;
      case 'logs':
        this.onViewLogs.emit(toolId);
        break;
    }
  }
}
