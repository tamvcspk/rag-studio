import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArrowRight } from 'lucide-angular';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagIcon } from '../../atomic';
import type { PipelineStep } from '../pipeline-card/pipeline-card';

@Component({
  selector: 'rag-pipeline-flow-visualization',
  standalone: true,
  imports: [
    CommonModule,
    RagChip,
    RagIcon
  ],
  templateUrl: './pipeline-flow-visualization.html',
  styleUrl: './pipeline-flow-visualization.scss'
})
export class PipelineFlowVisualization {
  readonly steps = input.required<PipelineStep[]>();
  
  // Icon components
  readonly ArrowRightIcon = ArrowRight;
}