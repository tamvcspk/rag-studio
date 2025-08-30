import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Flow, FlowPart } from '../../../models/flow.model';
import { EmptyStatePanelComponent } from '../empty-state-panel/empty-state-panel';
import { RagBadge } from '../../atomic/primitives/rag-badge/rag-badge';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';

interface DesignerNode {
  id: string;
  type: 'tool' | 'kb' | 'pipeline';
  name: string;
  position: { x: number; y: number };
  connections: string[];
}

@Component({
  selector: 'app-flow-designer',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    RagButton,
    RagBadge,
    EmptyStatePanelComponent
  ],
  templateUrl: './flow-designer.html',
  styleUrl: './flow-designer.scss'
})
export class FlowDesignerComponent {
  readonly flow = input<Flow>();
  readonly readonly = input(false);

  readonly onSave = output<Flow>();
  readonly onCancel = output<void>();

  readonly nodes = signal<DesignerNode[]>([]);
  readonly selectedNode = signal<DesignerNode | null>(null);
  readonly isDesignMode = signal(false);

  ngOnInit() {
    if (this.flow()) {
      this.loadFlowNodes();
    }
  }

  private loadFlowNodes(): void {
    const flowData = this.flow();
    if (!flowData) return;

    const nodes: DesignerNode[] = flowData.parts.map((part, index) => ({
      id: part.id,
      type: part.kind,
      name: part.name,
      position: { x: index * 150, y: 100 },
      connections: part.connections
    }));

    this.nodes.set(nodes);
  }

  getNodeIcon(type: 'tool' | 'kb' | 'pipeline'): string {
    switch (type) {
      case 'tool': return 'wrench';
      case 'kb': return 'book-open';
      case 'pipeline': return 'workflow';
      default: return 'circle';
    }
  }

  getNodeColor(type: 'tool' | 'kb' | 'pipeline'): 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple' {
    switch (type) {
      case 'tool': return 'blue';
      case 'kb': return 'green';
      case 'pipeline': return 'purple';
      default: return 'gray';
    }
  }

  selectNode(node: DesignerNode): void {
    this.selectedNode.set(node);
  }

  toggleDesignMode(): void {
    this.isDesignMode.update(current => !current);
  }

  saveFlow(): void {
    const flowData = this.flow();
    if (!flowData) return;

    // Convert nodes back to flow parts
    const parts: FlowPart[] = this.nodes().map((node, index) => ({
      id: node.id,
      kind: node.type,
      refId: node.id.replace('part-', ''),
      name: node.name,
      order: index,
      connections: node.connections
    }));

    const updatedFlow: Flow = {
      ...flowData,
      parts,
      updatedAt: new Date().toISOString()
    };

    this.onSave.emit(updatedFlow);
  }

  cancel(): void {
    this.onCancel.emit();
  }
}
