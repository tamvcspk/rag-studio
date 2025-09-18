import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagMetricDisplay } from './rag-metric-display';

describe('RagMetricDisplay', () => {
  let component: RagMetricDisplay;
  let fixture: ComponentFixture<RagMetricDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagMetricDisplay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagMetricDisplay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
