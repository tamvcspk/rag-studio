import { Component, input, output, signal, computed, inject, effect, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Search, Check, Cpu, Activity } from 'lucide-angular';
import { RagSelect } from '../../../atomic/primitives/rag-select/rag-select';
import { RagInput } from '../../../atomic/primitives/rag-input/rag-input';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';
import { RagChip } from '../../../atomic/primitives/rag-chip/rag-chip';
import { ModelsStore, EmbeddingModel } from '../../../../store/models.store';

export type ModelFilterType = 'all' | 'embedding' | 'reranking' | 'combined';
export type ModelSelectorVariant = 'dropdown' | 'card-grid' | 'compact';

export interface ModelOption {
  value: string;  // Model ID
  label: string;  // Display name
  model: EmbeddingModel;  // Full model object
  disabled?: boolean;
}

@Component({
  selector: 'rag-model-selector',
  standalone: true,
  imports: [
    CommonModule,
    RagSelect,
    RagInput,
    RagIcon,
    RagChip
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagModelSelector),
      multi: true
    }
  ],
  templateUrl: './rag-model-selector.html',
  styleUrl: './rag-model-selector.scss'
})
export class RagModelSelector implements ControlValueAccessor {
  private readonly modelsStore = inject(ModelsStore);

  // Component inputs
  readonly variant = input<ModelSelectorVariant>('dropdown');
  readonly filterType = input<ModelFilterType>('all');
  readonly placeholder = input('Select a model...');
  readonly searchPlaceholder = input('Search models...');
  readonly disabled = input(false);
  readonly required = input(false);
  readonly multiple = input(false);
  readonly showSearch = input(true);
  readonly showStatus = input(true);
  readonly showMetrics = input(false);
  readonly allowEmpty = input(false);

  // Component outputs
  readonly modelChange = output<EmbeddingModel | null>();
  readonly modelsChange = output<EmbeddingModel[]>();

  // Icons
  readonly SearchIcon = Search;
  readonly CheckIcon = Check;
  readonly CpuIcon = Cpu;
  readonly ActivityIcon = Activity;

  // Internal state
  readonly searchQuery = signal('');
  readonly selectedModelId = signal<string | null>(null);
  readonly selectedModelIds = signal<string[]>([]);

  // ControlValueAccessor implementation
  private onChange = (value: string | string[] | null) => {};
  private onTouched = () => {};

  // Store signals
  readonly models = this.modelsStore.models;
  readonly loading = this.modelsStore.loading;
  readonly availableModels = this.modelsStore.availableModels;

  // Computed filtered models
  readonly filteredModels = computed(() => {
    let models = this.models();
    const query = this.searchQuery().toLowerCase().trim();
    const filterType = this.filterType();

    // Filter by availability (only available models)
    models = models.filter(m => m.status === 'available');

    // Filter by type
    if (filterType !== 'all') {
      models = models.filter(m => m.model_type === filterType);
    }

    // Filter by search query
    if (query) {
      models = models.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      );
    }

    return models;
  });

  // Convert to options for select component
  readonly modelOptions = computed(() => {
    const models = this.filteredModels();
    const options: ModelOption[] = models.map(model => ({
      value: model.id,
      label: model.name,
      model: model,
      disabled: model.status !== 'available'
    }));

    // Add empty option if allowed
    if (this.allowEmpty()) {
      options.unshift({
        value: '',
        label: 'None selected',
        model: null as any,
        disabled: false
      });
    }

    return options;
  });

  // Get selected model(s)
  readonly selectedModel = computed(() => {
    const modelId = this.selectedModelId();
    if (!modelId) return null;
    return this.models().find(m => m.id === modelId) || null;
  });

  readonly selectedModels = computed(() => {
    const modelIds = this.selectedModelIds();
    return this.models().filter(m => modelIds.includes(m.id));
  });

  // Effect to emit changes
  constructor() {
    effect(() => {
      if (this.multiple()) {
        const models = this.selectedModels();
        this.modelsChange.emit(models);
        this.onChange(models.map(m => m.id));
      } else {
        const model = this.selectedModel();
        this.modelChange.emit(model);
        this.onChange(model?.id || null);
      }
    });
  }

  // ControlValueAccessor methods
  writeValue(value: string | string[] | null): void {
    if (this.multiple()) {
      this.selectedModelIds.set(Array.isArray(value) ? value : []);
    } else {
      this.selectedModelId.set(typeof value === 'string' ? value : null);
    }
  }

  registerOnChange(fn: (value: string | string[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Component handles disabled state via input
  }

  // Event handlers
  onModelSelect(modelId: string | null): void {
    this.onTouched();

    if (this.multiple()) {
      if (modelId) {
        this.selectedModelIds.update(ids => {
          if (ids.includes(modelId)) {
            return ids.filter(id => id !== modelId);
          } else {
            return [...ids, modelId];
          }
        });
      }
    } else {
      this.selectedModelId.set(modelId);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onSearchClear(): void {
    this.searchQuery.set('');
  }

  // Helper methods
  isSelected(modelId: string): boolean {
    if (this.multiple()) {
      return this.selectedModelIds().includes(modelId);
    } else {
      return this.selectedModelId() === modelId;
    }
  }

  getStatusColor(status: string): 'green' | 'blue' | 'red' | 'gray' {
    switch (status) {
      case 'available': return 'green';
      case 'downloading': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  }

  formatModelSize(sizeBytes: number): string {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}