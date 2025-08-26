import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { LucideAngularModule, Database, LayoutDashboard, Wrench, BookOpen, Workflow, GitBranch, Settings, Server, AlertCircle } from 'lucide-angular';
import { filter } from 'rxjs';

interface NavItem {
  path: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayoutComponent {
  readonly Database = Database;
  readonly LayoutDashboard = LayoutDashboard;
  readonly Wrench = Wrench;
  readonly BookOpen = BookOpen;
  readonly Workflow = Workflow;
  readonly GitBranch = GitBranch;
  readonly Settings = Settings;
  readonly Server = Server;
  readonly AlertCircle = AlertCircle;

  readonly navItems: NavItem[] = [
    { path: '/dashboard', title: 'Dashboard', icon: 'layout-dashboard' },
    { path: '/tools', title: 'Tools', icon: 'wrench' },
    { path: '/knowledge-bases', title: 'Knowledge Bases', icon: 'book-open' },
    { path: '/pipelines', title: 'Pipelines', icon: 'workflow' },
    { path: '/flows', title: 'Flows', icon: 'git-branch' },
    { path: '/settings', title: 'Settings', icon: 'settings' }
  ];

  private readonly mcpStatus = signal<'active' | 'inactive' | 'error'>('active');

  readonly mcpStatusText = computed(() => {
    const status = this.mcpStatus();
    return status === 'active' ? 'MCP Active' : status === 'inactive' ? 'MCP Inactive' : 'MCP Error';
  });

  readonly mcpStatusClass = computed(() => {
    const status = this.mcpStatus();
    return status === 'active' ? 'status-active' : status === 'inactive' ? 'status-inactive' : 'status-error';
  });

  constructor(private router: Router) {
    // Listen to route changes for any future navigation logic
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Future: Update page title or other navigation-related logic
    });
  }
}
