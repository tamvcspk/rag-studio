import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';

interface DashboardStats {
  tools: { total: number; active: number };
  knowledgeBases: { total: number; indexed: number };
  pipelines: { total: number; successRate: number };
  queryPerformance: { avgLatency: string; hitRate: number };
}

interface SystemStatus {
  mcpServer: { status: string; color: string };
  knowledgeBase: { status: string; color: string };
  queryEngine: { status: string; color: string };
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, CardModule, ChipModule],
  template: `
    <div class="space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <p-card styleClass="h-full">
          <ng-template pTemplate="header">
            <div class="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <h3 class="text-sm font-medium text-gray-600">Dynamic Tools</h3>
              <i class="pi pi-wrench text-gray-400"></i>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="px-4 pb-4">
              <div class="text-2xl font-bold">{{ stats.tools.total }}</div>
              <p class="text-xs text-gray-500">
                {{ stats.tools.active }} active tools
              </p>
            </div>
          </ng-template>
        </p-card>

        <p-card styleClass="h-full">
          <ng-template pTemplate="header">
            <div class="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <h3 class="text-sm font-medium text-gray-600">Knowledge Bases</h3>
              <i class="pi pi-book text-gray-400"></i>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="px-4 pb-4">
              <div class="text-2xl font-bold">{{ stats.knowledgeBases.total }}</div>
              <p class="text-xs text-gray-500">
                {{ stats.knowledgeBases.indexed }} indexed
              </p>
            </div>
          </ng-template>
        </p-card>

        <p-card styleClass="h-full">
          <ng-template pTemplate="header">
            <div class="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <h3 class="text-sm font-medium text-gray-600">Pipelines</h3>
              <i class="pi pi-sitemap text-gray-400"></i>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="px-4 pb-4">
              <div class="text-2xl font-bold">{{ stats.pipelines.total }}</div>
              <p class="text-xs text-gray-500">
                {{ stats.pipelines.successRate }}% success rate
              </p>
            </div>
          </ng-template>
        </p-card>

        <p-card styleClass="h-full">
          <ng-template pTemplate="header">
            <div class="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <h3 class="text-sm font-medium text-gray-600">Query Performance</h3>
              <i class="pi pi-chart-line text-gray-400"></i>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="px-4 pb-4">
              <div class="text-2xl font-bold">{{ stats.queryPerformance.avgLatency }}</div>
              <p class="text-xs text-gray-500">
                {{ stats.queryPerformance.hitRate }}% hit rate
              </p>
            </div>
          </ng-template>
        </p-card>
      </div>

      <!-- System Status -->
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4">
            <h3 class="text-lg font-semibold">System Status</h3>
            <p class="text-sm text-gray-600">Current system health and activity</p>
          </div>
        </ng-template>
        <ng-template pTemplate="content">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <i class="pi pi-check-circle text-green-600"></i>
                <span>MCP Server</span>
              </div>
              <p-chip 
                [label]="systemStatus.mcpServer.status" 
                [styleClass]="'border-' + systemStatus.mcpServer.color + '-600 text-' + systemStatus.mcpServer.color + '-600'"
              ></p-chip>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <i class="pi pi-database text-blue-600"></i>
                <span>Knowledge Base Index</span>
              </div>
              <p-chip 
                [label]="systemStatus.knowledgeBase.status" 
                [styleClass]="'border-' + systemStatus.knowledgeBase.color + '-600 text-' + systemStatus.knowledgeBase.color + '-600'"
              ></p-chip>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <i class="pi pi-bolt text-purple-600"></i>
                <span>Query Engine</span>
              </div>
              <p-chip 
                [label]="systemStatus.queryEngine.status" 
                [styleClass]="'border-' + systemStatus.queryEngine.color + '-600 text-' + systemStatus.queryEngine.color + '-600'"
              ></p-chip>
            </div>
          </div>
        </ng-template>
      </p-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .space-y-6 > * + * {
      margin-top: 1.5rem;
    }
    
    .space-y-4 > * + * {
      margin-top: 1rem;
    }
    
    .space-x-2 > * + * {
      margin-left: 0.5rem;
    }
    
    .space-x-4 > * + * {
      margin-left: 1rem;
    }
  `]
})
export class DashboardComponent {
  stats: DashboardStats = {
    tools: { total: 5, active: 3 },
    knowledgeBases: { total: 8, indexed: 6 },
    pipelines: { total: 4, successRate: 85 },
    queryPerformance: { avgLatency: '150ms', hitRate: 92 }
  };

  systemStatus: SystemStatus = {
    mcpServer: { status: 'Running', color: 'green' },
    knowledgeBase: { status: 'Healthy', color: 'blue' },
    queryEngine: { status: 'Active', color: 'purple' }
  };
}