import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowCard } from './flow-card';

describe('FlowCard', () => {
  let component: FlowCard;
  let fixture: ComponentFixture<FlowCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlowCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
