import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  LayoutIcon,
  Edit3Icon,
  SaveIcon,
  XIcon,
  Maximize2Icon,
  RefreshCwIcon,
  PlayIcon,
  PauseIcon,
  SettingsIcon,
  FileTextIcon,
  DatabaseIcon,
  ZapIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PlusIcon,
  Trash2Icon,
  CopyIcon,
  GitBranchIcon,
  WorkflowIcon
} from 'lucide-angular';
import {
  Pipeline,
  PipelineDesignerNode,
  PipelineConnection,
  ETLStepType,
  PipelineValidationResult,
  NodePort
} from '../../../models/pipeline.model';
import { EmptyStatePanel } from '../empty-state-panel/empty-state-panel';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagInput } from '../../atomic/primitives/rag-input/rag-input';
import { RagDialog } from '../../semantic/overlay/rag-dialog/rag-dialog';

interface StepTypeDefinition {
  type: ETLStepType;
  name: string;
  description: string;
  icon: any;
  color: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple';
  category: 'input' | 'processing' | 'output' | 'utility';
  inputPorts: { name: string; type: 'file' | 'data' | 'config' | 'reference'; required: boolean }[];
  outputPorts: { name: string; type: 'file' | 'data' | 'config' | 'reference'; description: string }[];
  defaultConfig: Record<string, any>;
}

@Component({
  selector: 'app-pipeline-designer',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    RagChip,
    RagButton,
    RagInput,
    EmptyStatePanel,
    RagDialog
  ],
  templateUrl: './pipeline-designer.html',
  styleUrl: './pipeline-designer.scss'
})
export class PipelineDesigner {
  // Inject dialog dependencies
  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly dialogData = inject(DIALOG_DATA, { optional: true });

  readonly pipelineInput = input<Pipeline>();
  readonly pipeline = signal<Pipeline | null>(null);
  readonly readonly = input(false);

  // Dialog-specific properties
  readonly title = 'Pipeline Designer';
  readonly description = '';

  // Icon components
  readonly layoutIcon = LayoutIcon;
  readonly edit3Icon = Edit3Icon;
  readonly saveIcon = SaveIcon;
  readonly xIcon = XIcon;
  readonly maximize2Icon = Maximize2Icon;
  readonly refreshCwIcon = RefreshCwIcon;
  readonly playIcon = PlayIcon;
  readonly pauseIcon = PauseIcon;
  readonly settingsIcon = SettingsIcon;
  readonly fileTextIcon = FileTextIcon;
  readonly databaseIcon = DatabaseIcon;
  readonly zapIcon = ZapIcon;
  readonly checkCircleIcon = CheckCircleIcon;
  readonly alertCircleIcon = AlertCircleIcon;
  readonly plusIcon = PlusIcon;
  readonly trash2Icon = Trash2Icon;
  readonly copyIcon = CopyIcon;
  readonly gitBranchIcon = GitBranchIcon;
  readonly workflowIcon = WorkflowIcon;

  readonly onSave = output<Pipeline>();
  readonly onCancel = output<void>();
  readonly onValidate = output<string>();
  readonly onExecute = output<string>();

  readonly nodes = signal<PipelineDesignerNode[]>([]);
  readonly connections = signal<PipelineConnection[]>([]);
  readonly selectedNode = signal<PipelineDesignerNode | null>(null);
  readonly selectedConnection = signal<PipelineConnection | null>(null);
  readonly isDesignMode = signal(false);
  readonly showStepPalette = signal(false);
  readonly validationResult = signal<PipelineValidationResult | null>(null);

  // Step palette for drag-and-drop
  readonly stepDefinitions: StepTypeDefinition[] = [
    {
      type: 'fetch',
      name: 'Fetch Data',
      description: 'Retrieve data from various sources',
      icon: this.databaseIcon,
      color: 'blue',
      category: 'input',
      inputPorts: [],
      outputPorts: [{ name: 'data', type: 'data' as const, description: 'Fetched data' }],
      defaultConfig: { source: '', format: 'auto' }
    },
    {
      type: 'parse',
      name: 'Parse Documents',
      description: 'Parse documents into structured data',
      icon: this.fileTextIcon,
      color: 'green',
      category: 'processing',
      inputPorts: [{ name: 'data', type: 'data' as const, required: true }],
      outputPorts: [{ name: 'parsed', type: 'data' as const, description: 'Parsed documents' }],
      defaultConfig: { parser: 'auto', options: {} }
    },
    {
      type: 'normalize',
      name: 'Normalize Text',
      description: 'Clean and normalize text content',
      icon: this.edit3Icon,
      color: 'amber',
      category: 'processing',
      inputPorts: [{ name: 'parsed', type: 'data' as const, required: true }],
      outputPorts: [{ name: 'normalized', type: 'data' as const, description: 'Normalized text' }],
      defaultConfig: { lowercase: true, removeStopwords: false }
    },
    {
      type: 'chunk',
      name: 'Chunk Text',
      description: 'Split text into smaller chunks',
      icon: this.gitBranchIcon,
      color: 'purple',
      category: 'processing',
      inputPorts: [{ name: 'normalized', type: 'data' as const, required: true }],
      outputPorts: [{ name: 'chunks', type: 'data' as const, description: 'Text chunks' }],
      defaultConfig: { chunkSize: 1000, overlap: 200 }
    },
    {
      type: 'annotate',
      name: 'Annotate Content',
      description: 'Add metadata and annotations',
      icon: this.settingsIcon,
      color: 'orange',
      category: 'processing',
      inputPorts: [{ name: 'chunks', type: 'data' as const, required: true }],
      outputPorts: [{ name: 'annotated', type: 'data' as const, description: 'Annotated chunks' }],
      defaultConfig: { extractMetadata: true, addTimestamps: true }
    },
    {
      type: 'embed',
      name: 'Generate Embeddings',
      description: 'Create vector embeddings',
      icon: this.zapIcon,
      color: 'red',
      category: 'processing',
      inputPorts: [{ name: 'annotated', type: 'data' as const, required: true }],
      outputPorts: [{ name: 'embeddings', type: 'data' as const, description: 'Vector embeddings' }],
      defaultConfig: { model: 'sentence-transformers/all-MiniLM-L6-v2', batchSize: 32 }
    },
    {
      type: 'index',
      name: 'Build Index',
      description: 'Create searchable index',
      icon: this.databaseIcon,
      color: 'blue',
      category: 'output',
      inputPorts: [{ name: 'embeddings', type: 'data' as const, required: true }],
      outputPorts: [{ name: 'index', type: 'reference' as const, description: 'Searchable index' }],
      defaultConfig: { indexType: 'vector', compression: true }
    },
    {
      type: 'eval',
      name: 'Evaluate Quality',
      description: 'Assess processing quality',
      icon: this.checkCircleIcon,
      color: 'green',
      category: 'utility',
      inputPorts: [{ name: 'index', type: 'reference' as const, required: true }],
      outputPorts: [{ name: 'metrics', type: 'data' as const, description: 'Quality metrics' }],
      defaultConfig: { metrics: ['recall', 'precision'], testQueries: [] }
    },
    {
      type: 'pack',
      name: 'Package Output',
      description: 'Create distributable package',
      icon: this.copyIcon,
      color: 'gray',
      category: 'output',
      inputPorts: [{ name: 'index', type: 'reference' as const, required: true }],
      outputPorts: [{ name: 'package', type: 'file' as const, description: 'Packaged output' }],
      defaultConfig: { format: 'zip', includeMetadata: true }
    }
  ];

  readonly stepsByCategory = computed(() => {
    const categories: Record<string, StepTypeDefinition[]> = {
      input: [],
      processing: [],
      output: [],
      utility: []
    };

    this.stepDefinitions.forEach(step => {
      categories[step.category].push(step);
    });

    return categories;
  });

  ngOnInit() {
    // Load pipeline from dialog data or input
    const pipelineFromDialog = this.dialogData?.pipeline;
    const pipelineFromInput = this.pipelineInput();

    if (pipelineFromDialog) {
      this.pipeline.set(pipelineFromDialog);
    } else if (pipelineFromInput) {
      this.pipeline.set(pipelineFromInput);
    }

    if (this.pipeline()) {
      this.loadPipelineNodes();
    }
  }

  private loadPipelineNodes(): void {
    const pipelineData = this.pipeline();
    if (!pipelineData || !pipelineData.spec.steps) return;

    const nodes: PipelineDesignerNode[] = pipelineData.spec.steps.map((step, index) => {
      const stepDef = this.stepDefinitions.find(def => def.type === step.type);

      return {
        id: step.id,
        stepId: step.id,
        type: step.type,
        name: step.name,
        position: { x: index * 200 + 50, y: 100 },
        config: step.config,
        inputs: stepDef?.inputPorts.map(port => ({
          id: `${step.id}-input-${port.name}`,
          name: port.name,
          type: port.type,
          connected: false
        })) || [],
        outputs: stepDef?.outputPorts.map(port => ({
          id: `${step.id}-output-${port.name}`,
          name: port.name,
          type: port.type,
          connected: false
        })) || []
      };
    });

    // Create connections based on step dependencies
    const connections: PipelineConnection[] = [];
    pipelineData.spec.steps.forEach(step => {
      step.dependencies.forEach(depId => {
        const sourceNode = nodes.find(n => n.stepId === depId);
        const targetNode = nodes.find(n => n.stepId === step.id);

        if (sourceNode && targetNode && sourceNode.outputs.length > 0 && targetNode.inputs.length > 0) {
          const connectionId = `${sourceNode.id}-${targetNode.id}`;
          connections.push({
            id: connectionId,
            sourceNodeId: sourceNode.id,
            sourcePortId: sourceNode.outputs[0].id,
            targetNodeId: targetNode.id,
            targetPortId: targetNode.inputs[0].id,
            dataType: sourceNode.outputs[0].type
          });

          // Mark ports as connected
          sourceNode.outputs[0].connected = true;
          sourceNode.outputs[0].connectionId = connectionId;
          targetNode.inputs[0].connected = true;
          targetNode.inputs[0].connectionId = connectionId;
        }
      });
    });

    this.nodes.set(nodes);
    this.connections.set(connections);
  }

  getStepDefinition(type: ETLStepType): StepTypeDefinition | undefined {
    return this.stepDefinitions.find(def => def.type === type);
  }

  getNodeIcon(type: ETLStepType): any {
    const stepDef = this.getStepDefinition(type);
    return stepDef ? stepDef.icon : this.workflowIcon;
  }

  getNodeColor(type: ETLStepType): 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple' {
    const stepDef = this.getStepDefinition(type);
    return stepDef ? stepDef.color : 'gray';
  }

  selectNode(node: PipelineDesignerNode): void {
    this.selectedNode.set(node);
    this.selectedConnection.set(null);
  }

  selectConnection(connection: PipelineConnection): void {
    this.selectedConnection.set(connection);
    this.selectedNode.set(null);
  }

  toggleDesignMode(): void {
    this.isDesignMode.update(current => !current);
    if (this.isDesignMode()) {
      this.showStepPalette.set(true);
    } else {
      this.showStepPalette.set(false);
    }
  }

  toggleStepPalette(): void {
    this.showStepPalette.update(current => !current);
  }

  addStep(stepType: ETLStepType): void {
    const stepDef = this.getStepDefinition(stepType);
    if (!stepDef) return;

    const existingNodes = this.nodes();
    const nodeId = `step-${Date.now()}`;
    const xPosition = existingNodes.length * 200 + 50;

    const newNode: PipelineDesignerNode = {
      id: nodeId,
      stepId: nodeId,
      type: stepType,
      name: stepDef.name,
      position: { x: xPosition, y: 100 },
      config: { ...stepDef.defaultConfig },
      inputs: stepDef.inputPorts.map(port => ({
        id: `${nodeId}-input-${port.name}`,
        name: port.name,
        type: port.type,
        connected: false
      })),
      outputs: stepDef.outputPorts.map(port => ({
        id: `${nodeId}-output-${port.name}`,
        name: port.name,
        type: port.type,
        connected: false
      }))
    };

    this.nodes.update(nodes => [...nodes, newNode]);
    this.selectNode(newNode);
  }

  removeStep(node: PipelineDesignerNode): void {
    // Remove connections involving this node
    this.connections.update(connections =>
      connections.filter(conn =>
        conn.sourceNodeId !== node.id && conn.targetNodeId !== node.id
      )
    );

    // Remove the node
    this.nodes.update(nodes => nodes.filter(n => n.id !== node.id));

    // Clear selection if this node was selected
    if (this.selectedNode()?.id === node.id) {
      this.selectedNode.set(null);
    }
  }

  cloneStep(node: PipelineDesignerNode): void {
    const existingNodes = this.nodes();
    const nodeId = `step-${Date.now()}`;

    const clonedNode: PipelineDesignerNode = {
      ...node,
      id: nodeId,
      stepId: nodeId,
      name: `${node.name} (Copy)`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      inputs: node.inputs.map(port => ({
        ...port,
        id: `${nodeId}-input-${port.name}`,
        connected: false,
        connectionId: undefined
      })),
      outputs: node.outputs.map(port => ({
        ...port,
        id: `${nodeId}-output-${port.name}`,
        connected: false,
        connectionId: undefined
      }))
    };

    this.nodes.update(nodes => [...nodes, clonedNode]);
    this.selectNode(clonedNode);
  }

  updateNodeConfig(nodeId: string, config: Record<string, any>): void {
    this.nodes.update(nodes =>
      nodes.map(node =>
        node.id === nodeId ? { ...node, config } : node
      )
    );
  }

  updateNodeConfigBoolValue(nodeId: string, key: string, value: boolean): void {
    const node = this.nodes().find(n => n.id === nodeId);
    if (node) {
      const updatedConfig = { ...node.config, [key]: value };
      this.updateNodeConfig(nodeId, updatedConfig);
    }
  }

  updateNodeConfigNumberValue(nodeId: string, key: string, value: string): void {
    const node = this.nodes().find(n => n.id === nodeId);
    if (node) {
      const updatedConfig = { ...node.config, [key]: +value };
      this.updateNodeConfig(nodeId, updatedConfig);
    }
  }

  updateNodeConfigStringValue(nodeId: string, key: string, value: string): void {
    const node = this.nodes().find(n => n.id === nodeId);
    if (node) {
      const updatedConfig = { ...node.config, [key]: value };
      this.updateNodeConfig(nodeId, updatedConfig);
    }
  }

  updateNodeName(nodeId: string, name: string): void {
    this.nodes.update(nodes =>
      nodes.map(node =>
        node.id === nodeId ? { ...node, name } : node
      )
    );
  }

  validatePipeline(): void {
    const pipelineId = this.pipeline()?.id;
    if (pipelineId) {
      this.onValidate.emit(pipelineId);
    }
  }

  executePipeline(): void {
    const pipelineId = this.pipeline()?.id;
    if (pipelineId) {
      this.onExecute.emit(pipelineId);
    }
  }

  savePipeline(): void {
    const pipelineData = this.pipeline();
    if (!pipelineData) return;

    // Convert nodes back to pipeline steps
    const steps = this.nodes().map((node, index) => ({
      id: node.stepId,
      name: node.name,
      type: node.type,
      config: node.config,
      inputs: node.inputs.map(port => ({
        name: port.name,
        type: port.type,
        required: this.getStepDefinition(node.type)?.inputPorts.find(p => p.name === port.name)?.required || false,
        source: port.connectionId ? this.findSourceForConnection(port.connectionId) : undefined
      })),
      outputs: node.outputs.map(port => ({
        name: port.name,
        type: port.type,
        description: this.getStepDefinition(node.type)?.outputPorts.find(p => p.name === port.name)?.description || ''
      })),
      dependencies: this.findDependenciesForNode(node.id),
      retryPolicy: undefined,
      timeout: undefined,
      parallelizable: false
    }));

    const updatedPipeline: Pipeline = {
      ...pipelineData,
      spec: {
        ...pipelineData.spec,
        steps
      },
      updatedAt: new Date().toISOString()
    };

    if (this.dialogRef) {
      this.dialogRef.close(updatedPipeline);
    } else {
      this.onSave.emit(updatedPipeline);
    }
  }

  private findDependenciesForNode(nodeId: string): string[] {
    return this.connections()
      .filter(conn => conn.targetNodeId === nodeId)
      .map(conn => {
        const sourceNode = this.nodes().find(n => n.id === conn.sourceNodeId);
        return sourceNode ? sourceNode.stepId : '';
      })
      .filter(id => id !== '');
  }

  private findSourceForConnection(connectionId: string): string | undefined {
    const connection = this.connections().find(c => c.id === connectionId);
    if (!connection) return undefined;

    const sourceNode = this.nodes().find(n => n.id === connection.sourceNodeId);
    const sourcePort = sourceNode?.outputs.find(p => p.id === connection.sourcePortId);

    return sourcePort ? sourcePort.name : undefined;
  }

  cancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.onCancel.emit();
    }
  }

  getSourceNode(connectionId: string): PipelineDesignerNode | undefined {
    const connection = this.connections().find(c => c.id === connectionId);
    if (!connection) return undefined;
    return this.nodes().find(n => n.id === connection.sourceNodeId);
  }

  getTargetNode(connectionId: string): PipelineDesignerNode | undefined {
    const connection = this.connections().find(c => c.id === connectionId);
    if (!connection) return undefined;
    return this.nodes().find(n => n.id === connection.targetNodeId);
  }

  getNodeById(nodeId: string): PipelineDesignerNode | undefined {
    return this.nodes().find(n => n.id === nodeId);
  }
}