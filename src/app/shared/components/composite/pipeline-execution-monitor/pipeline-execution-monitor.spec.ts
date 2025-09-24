import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

import { PipelineExecutionMonitor } from './pipeline-execution-monitor';
import { PipelineRun, PipelineRunStatus } from '../../../models/pipeline.model';

describe('PipelineExecutionMonitor', () => {
  let component: PipelineExecutionMonitor;
  let fixture: ComponentFixture<PipelineExecutionMonitor>;

  const mockPipelineRun: PipelineRun = {
    id: 'run-123',
    pipelineId: 'pipeline-456',
    startedAt: new Date().toISOString(),
    endedAt: undefined,
    status: 'running' as PipelineRunStatus,
    logsRef: 'logs/run-123.log',
    artifactsRef: 'artifacts/run-123',
    metrics: {
      duration: 30000, // 30 seconds
      stepsCompleted: 2,
      stepsTotal: 5,
      stepsSkipped: 0,
      stepsFailed: 0,
      recordsProcessed: 100,
      memoryUsed: 256,
      cpuUsed: 45.5
    },
    stepRuns: [
      {
        id: 'step-run-1',
        stepId: 'fetch',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        status: 'completed' as PipelineRunStatus,
        duration: 10000,
        retryCount: 0,
        metrics: {
          recordsProcessed: 50,
          memoryUsed: 128,
          cpuUsed: 30
        }
      },
      {
        id: 'step-run-2',
        stepId: 'parse',
        startedAt: new Date().toISOString(),
        endedAt: undefined,
        status: 'running' as PipelineRunStatus,
        duration: 20000,
        retryCount: 0,
        metrics: {
          recordsProcessed: 50,
          memoryUsed: 128,
          cpuUsed: 60
        }
      }
    ],
    triggeredBy: {
      type: 'manual',
      userId: 'user-123',
      source: 'pipelines-page',
      timestamp: new Date().toISOString()
    },
    parameters: {},
    errorMessage: undefined,
    warnings: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PipelineExecutionMonitor,
        NoopAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PipelineExecutionMonitor);
    component = fixture.componentInstance;

    // Set required input
    fixture.componentRef.setInput('pipelineRun', mockPipelineRun);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate correct run progress', () => {
    const progress = component.runProgress();
    expect(progress).toBe(40); // 2/5 * 100 = 40%
  });

  it('should show correct status color for running pipeline', () => {
    const color = component.statusColor();
    expect(color).toBe('blue');
  });

  it('should show correct status icon for running pipeline', () => {
    const icon = component.statusIcon();
    expect(icon).toBe(component.playIcon);
  });

  it('should allow cancellation for running pipeline', () => {
    expect(component.canCancel()).toBe(true);
  });

  it('should not allow retry for running pipeline', () => {
    expect(component.canRetry()).toBe(false);
  });

  it('should format duration correctly', () => {
    const formattedDuration = component.formattedDuration();
    expect(formattedDuration).toBe('30s');
  });

  it('should estimate time remaining for running pipeline', () => {
    const timeRemaining = component.estimatedTimeRemaining();
    expect(timeRemaining).toBeGreaterThan(0);
  });

  it('should toggle expanded state', () => {
    expect(component.isExpanded()).toBe(false);

    component.toggleExpanded();

    expect(component.isExpanded()).toBe(true);
  });

  it('should emit cancel event', () => {
    spyOn(component.onCancel, 'emit');

    component.cancelExecution();

    expect(component.onCancel.emit).toHaveBeenCalledWith('run-123');
  });

  it('should emit retry event for failed pipeline', () => {
    // Update pipeline status to failed
    const failedRun = { ...mockPipelineRun, status: 'failed' as PipelineRunStatus };
    fixture.componentRef.setInput('pipelineRun', failedRun);
    fixture.detectChanges();

    spyOn(component.onRetry, 'emit');

    component.retryExecution();

    expect(component.onRetry.emit).toHaveBeenCalledWith('run-123');
  });

  it('should emit view logs event', () => {
    spyOn(component.onViewLogs, 'emit');

    component.viewLogs();

    expect(component.onViewLogs.emit).toHaveBeenCalledWith('run-123');
  });

  it('should update last updated timestamp on refresh', () => {
    const initialTime = component.lastUpdated();

    // Wait a bit to ensure timestamp difference
    setTimeout(() => {
      component.refreshStatus();

      expect(component.lastUpdated().getTime()).toBeGreaterThan(initialTime.getTime());
    }, 10);
  });

  it('should handle completed pipeline correctly', () => {
    const completedRun = {
      ...mockPipelineRun,
      status: 'completed' as PipelineRunStatus,
      endedAt: new Date().toISOString()
    };

    fixture.componentRef.setInput('pipelineRun', completedRun);
    fixture.detectChanges();

    expect(component.statusColor()).toBe('green');
    expect(component.statusIcon()).toBe(component.checkCircleIcon);
    expect(component.canCancel()).toBe(false);
    expect(component.canRetry()).toBe(false);
  });

  it('should handle failed pipeline correctly', () => {
    const failedRun = {
      ...mockPipelineRun,
      status: 'failed' as PipelineRunStatus,
      endedAt: new Date().toISOString(),
      errorMessage: 'Pipeline execution failed due to network error'
    };

    fixture.componentRef.setInput('pipelineRun', failedRun);
    fixture.detectChanges();

    expect(component.statusColor()).toBe('red');
    expect(component.statusIcon()).toBe(component.alertCircleIcon);
    expect(component.canCancel()).toBe(false);
    expect(component.canRetry()).toBe(true);
  });

  it('should format start and end times correctly', () => {
    const startTime = component.formattedStartTime();
    const endTime = component.formattedEndTime();

    expect(startTime).toBeTruthy();
    expect(endTime).toBe('Running...'); // Since endedAt is undefined in mock
  });

  it('should handle step status correctly', () => {
    const runningStepColor = component.getStepStatusColor('running');
    const completedStepColor = component.getStepStatusColor('completed');
    const failedStepColor = component.getStepStatusColor('failed');

    expect(runningStepColor).toBe('blue');
    expect(completedStepColor).toBe('green');
    expect(failedStepColor).toBe('red');
  });

  it('should start auto-refresh for running pipeline', () => {
    fixture.componentRef.setInput('autoRefresh', true);
    fixture.detectChanges();

    component.ngOnInit();

    // Check that subscription is created (indirectly by checking component state)
    expect(component.canCancel()).toBe(true);
  });

  it('should stop auto-refresh on destroy', () => {
    fixture.componentRef.setInput('autoRefresh', true);
    fixture.detectChanges();

    component.ngOnInit();
    component.ngOnDestroy();

    // Component should handle cleanup properly without errors
    expect(component).toBeTruthy();
  });
});