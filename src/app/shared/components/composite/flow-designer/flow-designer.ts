import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { 
  LayoutIcon,
  Edit3Icon,
  SaveIcon,
  XIcon,
  Maximize2Icon,
  RefreshCwIcon,
  WrenchIcon,
  BookOpenIcon,
  WorkflowIcon,
  CircleIcon,
  GitBranchIcon
} from 'lucide-angular';
import { Flow, FlowPart } from '../../../models/flow.model';
import { EmptyStatePanel } from '../empty-state-panel/empty-state-panel';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagDialog } from '../../semantic/overlay/rag-dialog/rag-dialog';

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
    RagIcon,
    RagButton,
    RagChip,
    EmptyStatePanel,
    RagDialog
  ],
  templateUrl: './flow-designer.html',
  styleUrl: './flow-designer.scss'
})
export class FlowDesigner {
  // Inject dialog dependencies
  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly dialogData = inject(DIALOG_DATA, { optional: true });

  readonly flowInput = input<Flow>();
  readonly flow = signal<Flow | null>(null);
  readonly readonly = input(false);
  
  // Dialog-specific properties
  readonly title = 'Flow Designer';
  readonly description = '';

  // Icon components
  readonly layoutIcon = LayoutIcon;
  readonly edit3Icon = Edit3Icon;
  readonly saveIcon = SaveIcon;
  readonly xIcon = XIcon;
  readonly maximize2Icon = Maximize2Icon;
  readonly refreshCwIcon = RefreshCwIcon;
  readonly wrenchIcon = WrenchIcon;
  readonly bookOpenIcon = BookOpenIcon;
  readonly workflowIcon = WorkflowIcon;
  readonly circleIcon = CircleIcon;
  readonly gitBranchIcon = GitBranchIcon;

  readonly onSave = output<Flow>();
  readonly onCancel = output<void>();

  readonly nodes = signal<DesignerNode[]>([]);
  readonly selectedNode = signal<DesignerNode | null>(null);
  readonly isDesignMode = signal(false);

  ngOnInit() {
    // Load flow from dialog data or input
    const flowFromDialog = this.dialogData?.flow;
    const flowFromInput = this.flowInput();
    
    if (flowFromDialog) {
      this.flow.set(flowFromDialog);
    } else if (flowFromInput) {
      this.flow.set(flowFromInput);
    }
    
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

  getNodeIcon(type: 'tool' | 'kb' | 'pipeline'): any {
    switch (type) {
      case 'tool': return this.wrenchIcon;
      case 'kb': return this.bookOpenIcon;
      case 'pipeline': return this.workflowIcon;
      default: return this.circleIcon;
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

    if (this.dialogRef) {
      this.dialogRef.close(updatedFlow);
    } else {
      this.onSave.emit(updatedFlow);
    }
  }

  cancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.onCancel.emit();
    }
  }
}
