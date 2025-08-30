import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PipelineFlowVisualization } from './pipeline-flow-visualization';

describe('PipelineFlowVisualization', () => {
  let component: PipelineFlowVisualization;
  let fixture: ComponentFixture<PipelineFlowVisualization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipelineFlowVisualization]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PipelineFlowVisualization);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
