import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { signal } from '@angular/core';

import { PipelineDesigner } from './pipeline-designer';
import { Pipeline, ETLStepType } from '../../../models/pipeline.model';

describe('PipelineDesigner', () => {
  let component: PipelineDesigner;
  let fixture: ComponentFixture<PipelineDesigner>;
  let mockDialogRef: jasmine.SpyObj<DialogRef>;

  const mockPipeline: Pipeline = {
    id: 'test-pipeline',
    name: 'Test Pipeline',
    description: 'A test pipeline for unit testing',
    spec: {
      version: '1.0.0',
      steps: [
        {
          id: 'step-1',
          name: 'Fetch Data',
          type: 'fetch' as ETLStepType,
          config: { source: 'test', format: 'json' },
          inputs: [],
          outputs: [{ name: 'data', type: 'data', description: 'Fetched data' }],
          dependencies: [],
          parallelizable: false
        },
        {
          id: 'step-2',
          name: 'Parse Documents',
          type: 'parse' as ETLStepType,
          config: { parser: 'json' },
          inputs: [{ name: 'data', type: 'data', required: true }],
          outputs: [{ name: 'parsed', type: 'data', description: 'Parsed documents' }],
          dependencies: ['step-1'],
          parallelizable: false
        }
      ],
      parameters: {},
      resources: {},
      triggers: []
    },
    lastRunAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    tags: ['test'],
    metadata: {}
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('DialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        PipelineDesigner,
        NoopAnimationsModule
      ],
      providers: [
        { provide: DialogRef, useValue: mockDialogRef },
        { provide: DIALOG_DATA, useValue: { pipeline: mockPipeline } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PipelineDesigner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with pipeline from dialog data', () => {
    expect(component.pipeline()).toEqual(mockPipeline);
  });

  it('should load pipeline nodes from spec', () => {
    component.ngOnInit();
    const nodes = component.nodes();

    expect(nodes.length).toBe(2);
    expect(nodes[0].name).toBe('Fetch Data');
    expect(nodes[0].type).toBe('fetch');
    expect(nodes[1].name).toBe('Parse Documents');
    expect(nodes[1].type).toBe('parse');
  });

  it('should create connections based on dependencies', () => {
    component.ngOnInit();
    const connections = component.connections();

    expect(connections.length).toBe(1);
    expect(connections[0].sourceNodeId).toBe('step-1');
    expect(connections[0].targetNodeId).toBe('step-2');
  });

  it('should toggle design mode', () => {
    expect(component.isDesignMode()).toBe(false);

    component.toggleDesignMode();

    expect(component.isDesignMode()).toBe(true);
    expect(component.showStepPalette()).toBe(true);
  });

  it('should add a new step', () => {
    const initialNodeCount = component.nodes().length;

    component.addStep('chunk');

    const nodes = component.nodes();
    expect(nodes.length).toBe(initialNodeCount + 1);

    const newNode = nodes[nodes.length - 1];
    expect(newNode.type).toBe('chunk');
    expect(newNode.name).toBe('Chunk Text');
  });

  it('should remove a step', () => {
    component.ngOnInit();
    const initialNodes = component.nodes();
    const nodeToRemove = initialNodes[0];

    component.removeStep(nodeToRemove);

    const remainingNodes = component.nodes();
    expect(remainingNodes.length).toBe(initialNodes.length - 1);
    expect(remainingNodes.find(n => n.id === nodeToRemove.id)).toBeUndefined();
  });

  it('should clone a step', () => {
    component.ngOnInit();
    const initialNodes = component.nodes();
    const nodeToClone = initialNodes[0];

    component.cloneStep(nodeToClone);

    const nodes = component.nodes();
    expect(nodes.length).toBe(initialNodes.length + 1);

    const clonedNode = nodes[nodes.length - 1];
    expect(clonedNode.type).toBe(nodeToClone.type);
    expect(clonedNode.name).toContain('(Copy)');
    expect(clonedNode.id).not.toBe(nodeToClone.id);
  });

  it('should select a node', () => {
    component.ngOnInit();
    const nodes = component.nodes();
    const nodeToSelect = nodes[0];

    component.selectNode(nodeToSelect);

    expect(component.selectedNode()).toBe(nodeToSelect);
    expect(component.selectedConnection()).toBeNull();
  });

  it('should select a connection', () => {
    component.ngOnInit();
    const connections = component.connections();
    const connectionToSelect = connections[0];

    component.selectConnection(connectionToSelect);

    expect(component.selectedConnection()).toBe(connectionToSelect);
    expect(component.selectedNode()).toBeNull();
  });

  it('should update node name', () => {
    component.ngOnInit();
    const nodes = component.nodes();
    const nodeId = nodes[0].id;
    const newName = 'Updated Step Name';

    component.updateNodeName(nodeId, newName);

    const updatedNodes = component.nodes();
    const updatedNode = updatedNodes.find(n => n.id === nodeId);
    expect(updatedNode?.name).toBe(newName);
  });

  it('should update node configuration', () => {
    component.ngOnInit();
    const nodes = component.nodes();
    const nodeId = nodes[0].id;
    const newConfig = { source: 'updated', format: 'xml' };

    component.updateNodeConfig(nodeId, newConfig);

    const updatedNodes = component.nodes();
    const updatedNode = updatedNodes.find(n => n.id === nodeId);
    expect(updatedNode?.config).toEqual(newConfig);
  });

  it('should get correct step definition', () => {
    const fetchDef = component.getStepDefinition('fetch');
    expect(fetchDef?.name).toBe('Fetch Data');
    expect(fetchDef?.category).toBe('input');

    const parseDef = component.getStepDefinition('parse');
    expect(parseDef?.name).toBe('Parse Documents');
    expect(parseDef?.category).toBe('processing');
  });

  it('should get correct node icon and color', () => {
    const fetchIcon = component.getNodeIcon('fetch');
    const fetchColor = component.getNodeColor('fetch');

    expect(fetchIcon).toBeDefined();
    expect(fetchColor).toBe('blue');
  });

  it('should group steps by category', () => {
    const stepsByCategory = component.stepsByCategory();

    expect(stepsByCategory.input.length).toBeGreaterThan(0);
    expect(stepsByCategory.processing.length).toBeGreaterThan(0);
    expect(stepsByCategory.output.length).toBeGreaterThan(0);
    expect(stepsByCategory.utility.length).toBeGreaterThan(0);
  });

  it('should emit save event with updated pipeline', () => {
    spyOn(component.onSave, 'emit');
    component.ngOnInit();

    component.savePipeline();

    expect(component.onSave.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      id: mockPipeline.id,
      name: mockPipeline.name,
      spec: jasmine.objectContaining({
        steps: jasmine.any(Array)
      })
    }));
  });

  it('should emit cancel event', () => {
    spyOn(component.onCancel, 'emit');

    component.cancel();

    expect(component.onCancel.emit).toHaveBeenCalled();
  });

  it('should emit validate event', () => {
    spyOn(component.onValidate, 'emit');
    component.pipeline.set(mockPipeline);

    component.validatePipeline();

    expect(component.onValidate.emit).toHaveBeenCalledWith(mockPipeline.id);
  });

  it('should emit execute event', () => {
    spyOn(component.onExecute, 'emit');
    component.pipeline.set(mockPipeline);

    component.executePipeline();

    expect(component.onExecute.emit).toHaveBeenCalledWith(mockPipeline.id);
  });

  it('should close dialog when save is called', () => {
    component.ngOnInit();

    component.savePipeline();

    expect(mockDialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({
      id: mockPipeline.id
    }));
  });

  it('should close dialog when cancel is called', () => {
    component.cancel();

    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});