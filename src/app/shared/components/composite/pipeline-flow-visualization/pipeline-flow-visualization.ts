import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';
import { RagBadge } from '../../atomic/primitives/rag-badge/rag-badge';
import type { PipelineStep } from '../pipeline-card/pipeline-card';

@Component({
  selector: 'rag-pipeline-flow-visualization',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    RagBadge
  ],
  templateUrl: './pipeline-flow-visualization.html',
  styleUrl: './pipeline-flow-visualization.scss'
})
export class PipelineFlowVisualization {
  readonly steps = input.required<PipelineStep[]>();

  // Icons
  readonly ArrowRightIcon = ArrowRight;
}