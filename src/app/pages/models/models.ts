import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Plus, Cpu, Search, Filter, CheckCircle, AlertTriangle, Download, HardDrive, Activity } from 'lucide-angular';
import { EmptyStatePanel } from '../../shared/components/composite/empty-state-panel/empty-state-panel';
import { RagDialogService } from '../../shared/components/semantic/overlay/rag-dialog/rag-dialog.service';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';
import { ModelsStore, EmbeddingModel } from '../../shared/store/models.store';
import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { RagStatsOverview, StatItem } from '../../shared/components/semantic/data-display/rag-stats-overview';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { RagCard } from '../../shared/components/semantic/data-display/rag-card/rag-card';
import { RagButton } from '../../shared/components/atomic/primitives/rag-button/rag-button';
import { RagChip } from '../../shared/components/atomic/primitives/rag-chip/rag-chip';

@Component({
  selector: 'app-models',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RagPageHeader,
    RagStatsOverview,
    EmptyStatePanel,
    RagIcon,
    RagCard,
    RagButton,
    RagChip
  ],
  templateUrl: './models.html',
  styleUrl: './models.scss'
})
export class Models implements OnInit, OnDestroy {
  private readonly modelsStore = inject(ModelsStore);
  private readonly dialogService = inject(RagDialogService);
  private readonly toastService = inject(RagToastService);

  // Icon components
  readonly PlusIcon = Plus;
  readonly CpuIcon = Cpu;
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly DownloadIcon = Download;
  readonly HardDriveIcon = HardDrive;
  readonly ActivityIcon = Activity;

  // Reactive signals from store
  readonly models = this.modelsStore.models;
  readonly loading = this.modelsStore.loading;
  readonly error = this.modelsStore.error;
  readonly storageStats = this.modelsStore.storageStats;
  readonly cacheStats = this.modelsStore.cacheStats;
  readonly availableModels = this.modelsStore.availableModels;
  readonly storageUsagePercent = this.modelsStore.storageUsagePercent;
  readonly cacheUsagePercent = this.modelsStore.cacheUsagePercent;

  // Local filter signals
  readonly searchQuery = signal('');
  readonly selectedFilters = signal<string[]>([]);

  // Page header actions
  readonly headerActions = computed(() => [
    {
      label: 'Import Model',
      icon: this.PlusIcon,
      variant: 'solid' as const,
      action: () => this.onImportModel()
    },
    {
      label: 'Scan Local',
      icon: this.HardDriveIcon,
      variant: 'outline' as const,
      action: () => this.onScanLocal()
    }
  ]);

  // Computed filtered models
  readonly filteredModels = computed(() => {
    const models = this.models();
    const query = this.searchQuery().toLowerCase().trim();
    const selectedFilters = this.selectedFilters();

    if (!models || models.length === 0) {
      return [];
    }

    // First filter by search query
    let filteredModels = !query ? models : models.filter(model => {
      if (!model) return false;

      // Check if query matches any searchable field
      return [
        model.name?.toLowerCase() || '',
        model.id?.toLowerCase() || '',
        model.description?.toLowerCase() || '',
        model.model_type?.toLowerCase() || '',
        model.source?.toLowerCase() || ''
      ].some(field => field.includes(query));
    });

    // Then filter by selected status/type filters if any
    if (selectedFilters.length > 0) {
      filteredModels = filteredModels.filter(model => {
        if (!model.status && !model.model_type && !model.source) return false;

        // Check if model matches any selected filter
        return selectedFilters.some(filterId => {
          return model.status === filterId ||
                 model.model_type === filterId ||
                 model.source === filterId;
        });
      });
    }

    return filteredModels;
  });

  // Computed statistics for overview component
  readonly modelStatsItems = computed(() => {
    const models = this.models();
    const storageStats = this.storageStats();
    const cacheStats = this.cacheStats();

    const totalModels = models.length;
    const availableCount = models.filter(m => m.status === 'available').length;
    const downloadingCount = models.filter(m => m.status === 'downloading').length;
    const errorCount = models.filter(m => m.status === 'error').length;
    const cachedCount = cacheStats?.loaded_models || 0;

    const items: StatItem[] = [
      {
        id: 'total',
        label: 'Total Models',
        value: totalModels,
        icon: this.CpuIcon,
        color: 'blue',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'available',
        label: 'Available',
        value: availableCount,
        icon: this.CheckCircleIcon,
        color: 'green',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'downloading',
        label: 'Downloading',
        value: downloadingCount,
        icon: this.DownloadIcon,
        color: 'blue',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'error',
        label: 'Errors',
        value: errorCount,
        icon: this.AlertTriangleIcon,
        color: 'red',
        variant: 'solid',
        clickable: true
      },
      {
        id: 'cached',
        label: 'Cached',
        value: cachedCount,
        icon: this.ActivityIcon,
        color: 'blue',
        variant: 'solid',
        clickable: true
      }
    ];

    // Add storage usage if available
    if (storageStats) {
      items.push({
        id: 'storage',
        label: 'Storage',
        value: `${Math.round(this.storageUsagePercent())}%`,
        icon: this.HardDriveIcon,
        color: this.storageUsagePercent() > 80 ? 'red' : 'gray',
        variant: 'soft',
        clickable: false
      });
    }

    return items;
  });

  // Lifecycle methods
  async ngOnInit() {
    // Models store already loads initial data in constructor
    // Just refresh to ensure we have latest data
    await this.modelsStore.refresh();
  }

  ngOnDestroy() {
    // ModelsStore is a singleton service - no cleanup needed
  }

  // Event handlers
  onImportModel() {
    // TODO: Open model import dialog when component is created
    this.toastService.info('Model import interface coming soon!', 'Info');
  }

  async onScanLocal() {
    try {
      const discoveredModels = await this.modelsStore.scanLocalModels();
      this.toastService.success(
        `Discovered ${discoveredModels.length} local models`,
        'Scan Complete'
      );
    } catch (error) {
      this.toastService.error('Failed to scan for local models', 'Error');
    }
  }

  async onModelLoadCache(modelId: string) {
    try {
      const success = await this.modelsStore.loadModelIntoCache(modelId);
      if (success) {
        this.toastService.success('Model loaded into cache', 'Success');
      } else {
        this.toastService.error('Failed to load model into cache', 'Error');
      }
    } catch (error) {
      this.toastService.error('Failed to load model into cache', 'Error');
    }
  }

  async onModelRemove(modelId: string) {
    const model = this.models().find(m => m.id === modelId);
    if (model && confirm(`Are you sure you want to remove "${model.name}"?`)) {
      try {
        const success = await this.modelsStore.removeModel(modelId);
        if (success) {
          this.toastService.success('Model removed successfully', 'Success');
        } else {
          this.toastService.error('Failed to remove model', 'Error');
        }
      } catch (error) {
        this.toastService.error('Failed to remove model', 'Error');
      }
    }
  }

  onModelDetails(modelId: string) {
    // TODO: Open model details dialog when component is created
    this.toastService.info('Model details coming soon!', 'Info');
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }

  onSearchClear() {
    this.searchQuery.set('');
    this.selectedFilters.set([]);
  }

  onFilterChange(selectedFilters: string[]) {
    this.selectedFilters.set(selectedFilters);
  }
}