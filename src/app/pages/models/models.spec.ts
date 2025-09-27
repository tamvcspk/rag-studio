import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Models } from './models';
import { ModelsStore } from '../../shared/store/models.store';
import { RagDialogService } from '../../shared/components/semantic/overlay/rag-dialog/rag-dialog.service';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';
import { signal } from '@angular/core';

describe('Models', () => {
  let component: Models;
  let fixture: ComponentFixture<Models>;
  let mockModelsStore: jasmine.SpyObj<ModelsStore>;
  let mockDialogService: jasmine.SpyObj<RagDialogService>;
  let mockToastService: jasmine.SpyObj<RagToastService>;

  beforeEach(async () => {
    // Create spy objects
    mockModelsStore = jasmine.createSpyObj('ModelsStore', [
      'refresh',
      'scanLocalModels',
      'loadModelIntoCache',
      'removeModel'
    ], {
      // Readonly signals
      models: signal([]),
      loading: signal(false),
      error: signal(null),
      storageStats: signal(null),
      cacheStats: signal(null),
      availableModels: signal([]),
      storageUsagePercent: signal(0),
      cacheUsagePercent: signal(0)
    });

    mockDialogService = jasmine.createSpyObj('RagDialogService', ['open']);
    mockToastService = jasmine.createSpyObj('RagToastService', [
      'success',
      'error',
      'info',
      'warning'
    ]);

    await TestBed.configureTestingModule({
      imports: [Models],
      providers: [
        { provide: ModelsStore, useValue: mockModelsStore },
        { provide: RagDialogService, useValue: mockDialogService },
        { provide: RagToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Models);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize models store on ngOnInit', async () => {
    mockModelsStore.refresh.and.returnValue(Promise.resolve());

    await component.ngOnInit();

    expect(mockModelsStore.refresh).toHaveBeenCalled();
  });

  it('should handle search query changes', () => {
    const query = 'test model';

    component.onSearchChange(query);

    expect(component.searchQuery()).toBe(query);
  });

  it('should clear search and filters', () => {
    component.searchQuery.set('test');
    component.selectedFilters.set(['available']);

    component.onSearchClear();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedFilters()).toEqual([]);
  });

  it('should handle filter changes', () => {
    const filters = ['available', 'embedding'];

    component.onFilterChange(filters);

    expect(component.selectedFilters()).toEqual(filters);
  });

  it('should scan for local models', async () => {
    const mockDiscoveredModels = [{ id: 'model1', name: 'Test Model' }];
    mockModelsStore.scanLocalModels.and.returnValue(Promise.resolve(mockDiscoveredModels as any));

    await component.onScanLocal();

    expect(mockModelsStore.scanLocalModels).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith(
      'Discovered 1 local models',
      'Scan Complete'
    );
  });

  it('should handle model cache loading', async () => {
    const modelId = 'test-model';
    mockModelsStore.loadModelIntoCache.and.returnValue(Promise.resolve(true));

    await component.onModelLoadCache(modelId);

    expect(mockModelsStore.loadModelIntoCache).toHaveBeenCalledWith(modelId);
    expect(mockToastService.success).toHaveBeenCalledWith(
      'Model loaded into cache',
      'Success'
    );
  });

  it('should handle model removal with confirmation', async () => {
    const modelId = 'test-model';
    const mockModel = { id: modelId, name: 'Test Model' };
    component.models = signal([mockModel as any]);

    spyOn(window, 'confirm').and.returnValue(true);
    mockModelsStore.removeModel.and.returnValue(Promise.resolve(true));

    await component.onModelRemove(modelId);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockModelsStore.removeModel).toHaveBeenCalledWith(modelId);
    expect(mockToastService.success).toHaveBeenCalledWith(
      'Model removed successfully',
      'Success'
    );
  });

  it('should not remove model if user cancels confirmation', async () => {
    const modelId = 'test-model';
    const mockModel = { id: modelId, name: 'Test Model' };
    component.models = signal([mockModel as any]);

    spyOn(window, 'confirm').and.returnValue(false);

    await component.onModelRemove(modelId);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockModelsStore.removeModel).not.toHaveBeenCalled();
  });
});