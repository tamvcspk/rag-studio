import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyStatePanel } from './empty-state-panel';

describe('EmptyStatePanel', () => {
  let component: EmptyStatePanel;
  let fixture: ComponentFixture<EmptyStatePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStatePanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmptyStatePanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
