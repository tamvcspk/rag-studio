import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { RagModelSelector } from './rag-model-selector';
import { ModelsStore } from '../../../../store/models.store';
import { EmbeddingModel } from '../../../../store/models.store';

describe('RagModelSelector', () => {
  let component: RagModelSelector;
  let fixture: ComponentFixture<RagModelSelector>;
  let mockModelsStore: jasmine.SpyObj<ModelsStore>;

  const mockModels: EmbeddingModel[] = [
    {
      id: 'model-1',
      name: 'Test Model 1',
      description: 'Test embedding model 1',
      model_type: 'embedding',
      size_mb: 100,
      dimensions: 384,
      max_sequence_length: 512,
      source: 'huggingface',
      status: 'available',
      performance_metrics: {},
      compatibility: ['python'],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'model-2',
      name: 'Test Model 2',
      description: 'Test reranking model',
      model_type: 'reranking',
      size_mb: 200,
      dimensions: 768,
      max_sequence_length: 1024,
      source: 'local',
      status: 'available',
      performance_metrics: {},
      compatibility: ['python'],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    // Create spy objects
    mockModelsStore = jasmine.createSpyObj('ModelsStore', ['refresh'], {
      models: signal(mockModels),
      loading: signal(false),
      error: signal(null),
      availableModels: signal(mockModels)
    });

    await TestBed.configureTestingModule({
      imports: [RagModelSelector, ReactiveFormsModule],
      providers: [
        { provide: ModelsStore, useValue: mockModelsStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RagModelSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display available models', () => {
    const options = component.modelOptions();
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('model-1');
    expect(options[1].value).toBe('model-2');
  });

  it('should filter models by type', () => {
    fixture.componentRef.setInput('filterType', 'embedding');
    fixture.detectChanges();

    const options = component.modelOptions();
    expect(options).toHaveLength(1);
    expect(options[0].model.model_type).toBe('embedding');
  });

  it('should filter models by search query', () => {
    component.onSearchChange('reranking');
    fixture.detectChanges();

    const filtered = component.filteredModels();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].model_type).toBe('reranking');
  });

  it('should handle single model selection', () => {
    spyOn(component.modelChange, 'emit');

    component.onModelSelect('model-1');

    expect(component.selectedModel()?.id).toBe('model-1');
    expect(component.modelChange.emit).toHaveBeenCalledWith(mockModels[0]);
  });

  it('should handle multiple model selection', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    spyOn(component.modelsChange, 'emit');

    component.onModelSelect('model-1');
    component.onModelSelect('model-2');

    const selectedModels = component.selectedModels();
    expect(selectedModels).toHaveLength(2);
    expect(component.modelsChange.emit).toHaveBeenCalled();
  });

  it('should work as a form control', () => {
    const formControl = new FormControl('model-1');

    component.writeValue('model-1');
    fixture.detectChanges();

    expect(component.selectedModel()?.id).toBe('model-1');
  });

  it('should toggle selection in multiple mode', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    // Select model
    component.onModelSelect('model-1');
    expect(component.isSelected('model-1')).toBe(true);

    // Deselect model
    component.onModelSelect('model-1');
    expect(component.isSelected('model-1')).toBe(false);
  });

  it('should return correct status colors', () => {
    expect(component.getStatusColor('available')).toBe('green');
    expect(component.getStatusColor('downloading')).toBe('blue');
    expect(component.getStatusColor('error')).toBe('red');
    expect(component.getStatusColor('unknown')).toBe('gray');
  });

  it('should format model sizes correctly', () => {
    expect(component.formatModelSize(512)).toBe('512 B');
    expect(component.formatModelSize(1536)).toBe('1.5 KB');
    expect(component.formatModelSize(1572864)).toBe('1.5 MB');
    expect(component.formatModelSize(1610612736)).toBe('1.5 GB');
  });
});