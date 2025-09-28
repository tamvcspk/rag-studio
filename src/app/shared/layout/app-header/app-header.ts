import { Component, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RagIcon, RagButton, RagChip } from '../../components/atomic';
import {
  ServerIcon,
  ServerOffIcon,
  AlertCircleIcon,
  Database,
  Settings,
  ArrowLeft
} from 'lucide-angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    RagChip,
    RagButton
  ],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss'
})
export class AppHeader {
  // Input for back button configuration
  showBackButton = input<boolean>(false);

  // Icon constants
  readonly DatabaseIcon = Database;
  readonly SettingsIcon = Settings;
  readonly ArrowLeftIcon = ArrowLeft;

  private readonly mcpStatus = signal<'active' | 'inactive' | 'error'>('active');

  readonly mcpStatusText = computed(() => {
    const status = this.mcpStatus();
    return status === 'active' ? 'MCP Active' : status === 'inactive' ? 'MCP Inactive' : 'MCP Error';
  });

  readonly mcpStatusColor = computed(() => {
    const status = this.mcpStatus();
    return status === 'active' ? 'green' : status === 'inactive' ? 'gray' : 'red';
  });

  readonly mcpStatusIcon = computed(() => {
    const status = this.mcpStatus();
    return status === 'active' ? ServerIcon : status === 'inactive' ? ServerOffIcon : AlertCircleIcon;
  });

  constructor(private router: Router) {}

  onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }

  onBackClick(): void {
    this.router.navigate(['/']);
  }
}