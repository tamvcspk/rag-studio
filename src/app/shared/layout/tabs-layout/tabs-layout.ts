import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { RagTabNavigation, type TabNavItem } from '../../components/semantic/navigation/rag-tab-navigation/rag-tab-navigation';
import { filter } from 'rxjs';
import {
  LayoutDashboardIcon,
  WrenchIcon,
  CpuIcon,
  BookOpenIcon,
  WorkflowIcon,
  GitBranchIcon,
} from 'lucide-angular';

interface NavItem {
  path: string;
  title: string;
  icon: any; // Lucide icon component
}

@Component({
  selector: 'app-tabs-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RagTabNavigation
  ],
  templateUrl: './tabs-layout.html',
  styleUrl: './tabs-layout.scss'
})
export class TabsLayout {
  readonly navItems: NavItem[] = [
    { path: '/dashboard', title: 'Dashboard', icon: LayoutDashboardIcon },
    { path: '/tools', title: 'Tools', icon: WrenchIcon },
    { path: '/models', title: 'Models', icon: CpuIcon },
    { path: '/knowledge-bases', title: 'Knowledge Bases', icon: BookOpenIcon },
    { path: '/pipelines', title: 'Pipelines', icon: WorkflowIcon },
    { path: '/flows', title: 'Flows', icon: GitBranchIcon }
  ];

  private readonly currentRoute = signal<string>('');

  // Convert nav items to tab nav items for RagTabNavigation component
  readonly tabItems = computed<TabNavItem[]>(() => 
    this.navItems.map(item => ({
      id: item.path,
      label: item.title,
      icon: item.icon,
      routerLink: item.path,
      exact: item.path === '/dashboard' // Exact matching for dashboard
    }))
  );

  // Get current active tab based on router
  readonly currentActiveTab = computed(() => this.currentRoute());

  constructor(private router: Router) {
    // Listen to route changes to update active tab
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.url);
    });

    // Initialize current route
    this.currentRoute.set(this.router.url);
  }

  onTabChange(item: TabNavItem): void {
    this.router.navigate([item.id]);
  }

  onTabIndexChange(index: number): void {
    const item = this.tabItems()[index];
    if (item) {
      this.router.navigate([item.id]);
    }
  }
}