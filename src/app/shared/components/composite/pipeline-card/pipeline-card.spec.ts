import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PipelineCard } from './pipeline-card';

describe('PipelineCard', () => {
  let component: PipelineCard;
  let fixture: ComponentFixture<PipelineCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipelineCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PipelineCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
