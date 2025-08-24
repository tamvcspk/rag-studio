import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, CardModule, ButtonModule, ToggleSwitchModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Security Settings -->
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4">
            <h3 class="text-lg font-semibold">Security Settings</h3>
            <p class="text-sm text-gray-600">Configure security policies and access controls</p>
          </div>
        </ng-template>
        <ng-template pTemplate="content">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium">Air-gapped Mode</label>
                <p class="text-sm text-gray-600">Block all outbound network connections</p>
              </div>
              <p-toggleSwitch [(ngModel)]="settings.airGapped"></p-toggleSwitch>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium">Enable Logging</label>
                <p class="text-sm text-gray-600">Log system activities and queries</p>
              </div>
              <p-toggleSwitch [(ngModel)]="settings.enableLogging"></p-toggleSwitch>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium">Require Citations</label>
                <p class="text-sm text-gray-600">Always include citations in RAG responses</p>
              </div>
              <p-toggleSwitch [(ngModel)]="settings.requireCitations"></p-toggleSwitch>
            </div>
          </div>
        </ng-template>
      </p-card>

      <!-- Performance Settings -->
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4">
            <h3 class="text-lg font-semibold">Performance Settings</h3>
            <p class="text-sm text-gray-600">Configure system performance and resource usage</p>
          </div>
        </ng-template>
        <ng-template pTemplate="content">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium">Enable Caching</label>
                <p class="text-sm text-gray-600">Cache frequently accessed data</p>
              </div>
              <p-toggleSwitch [(ngModel)]="settings.enableCaching"></p-toggleSwitch>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium">Parallel Processing</label>
                <p class="text-sm text-gray-600">Enable parallel pipeline execution</p>
              </div>
              <p-toggleSwitch [(ngModel)]="settings.parallelProcessing"></p-toggleSwitch>
            </div>
          </div>
        </ng-template>
      </p-card>

      <!-- Data Management -->
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4">
            <h3 class="text-lg font-semibold">Data Management</h3>
            <p class="text-sm text-gray-600">Manage data storage and retention policies</p>
          </div>
        </ng-template>
        <ng-template pTemplate="content">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">2.3 GB</div>
                <div class="text-sm text-gray-500">Data Directory</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">30 days</div>
                <div class="text-sm text-gray-500">Log Retention</div>
              </div>
            </div>
            <div class="flex space-x-2">
              <p-button 
                label="Clean Logs" 
                severity="secondary"
                icon="pi pi-trash"
              ></p-button>
              <p-button 
                label="Backup Data" 
                severity="secondary"
                icon="pi pi-download"
              ></p-button>
              <p-button 
                label="Reset Settings" 
                severity="danger"
                icon="pi pi-refresh"
              ></p-button>
            </div>
          </div>
        </ng-template>
      </p-card>
    </div>
  `,
  styles: [`
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-x-2 > * + * { margin-left: 0.5rem; }
  `]
})
export class SettingsComponent {
  settings = {
    airGapped: true,
    enableLogging: true,
    requireCitations: true,
    enableCaching: true,
    parallelProcessing: false
  };
}