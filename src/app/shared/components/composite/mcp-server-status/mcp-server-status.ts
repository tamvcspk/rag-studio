import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagBadge } from '../../atomic/primitives/rag-badge/rag-badge';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { Server, CheckCircle, XCircle, Circle } from 'lucide-angular';

export interface McpServerInfo {
  status: 'active' | 'inactive' | 'error';
  port: number;
  uptime: string;
  activeConnections: number;
  version: string;
}

@Component({
  selector: 'rag-mcp-server-status',
  imports: [CommonModule, RagBadge, RagIcon],
  templateUrl: './mcp-server-status.html',
  styleUrl: './mcp-server-status.scss'
})
export class McpServerStatus implements OnInit, OnDestroy {
  // Icon components
  readonly ServerIcon = Server;
  
  readonly serverInfo = signal<McpServerInfo>({
    status: 'active',
    port: 3000,
    uptime: '2h 45m',
    activeConnections: 3,
    version: '1.0.0'
  });

  private uptimeInterval?: number;

  ngOnInit(): void {
    this.startUptimeTimer();
  }

  ngOnDestroy(): void {
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
    }
  }

  private startUptimeTimer(): void {
    // Simulate uptime counter
    let minutes = 165; // Starting at 2h 45m
    
    this.uptimeInterval = window.setInterval(() => {
      minutes++;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      this.serverInfo.update(current => ({
        ...current,
        uptime: `${hours}h ${mins}m`
      }));
    }, 60000); // Update every minute
  }

  getBadgeVariant(status: string): 'solid' | 'soft' | 'outline' {
    return 'solid';
  }

  getBadgeColor(status: string): 'gray' | 'blue' | 'green' | 'amber' | 'red' {
    switch (status) {
      case 'active': return 'green';
      case 'error': return 'red';
      default: return 'gray';
    }
  }

  getStatusIcon(status: string): any {
    switch (status) {
      case 'active': return CheckCircle;
      case 'error': return XCircle;
      default: return Circle;
    }
  }
}
