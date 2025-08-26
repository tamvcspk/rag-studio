import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagTabs } from './rag-tabs';

describe('RagTabs', () => {
  let component: RagTabs;
  let fixture: ComponentFixture<RagTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagTabs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagTabs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
