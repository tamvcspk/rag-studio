import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-pipeline-designer',
  imports: [CommonModule, CardModule, ButtonModule],
  template: `
    <div class="space-y-6">
      <p-card>
        <ng-template pTemplate="content">
          <div class="text-center py-12">
            <i class="pi pi-sitemap text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Pipeline Designer</h3>
            <p class="text-gray-600 mb-4">
              Visual pipeline designer for creating data processing workflows is coming soon.
            </p>
            <p-button 
              label="Create Pipeline" 
              icon="pi pi-plus"
              disabled
            ></p-button>
          </div>
        </ng-template>
      </p-card>
    </div>
  `,
  styles: [`
    .space-y-6 > * + * { margin-top: 1.5rem; }
  `]
})
export class PipelineDesignerComponent {
}