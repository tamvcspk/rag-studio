import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowDesigner } from './flow-designer';

describe('FlowDesigner', () => {
  let component: FlowDesigner;
  let fixture: ComponentFixture<FlowDesigner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowDesigner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlowDesigner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
