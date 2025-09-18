import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagBreadcrumb } from './rag-breadcrumb';

describe('RagBreadcrumb', () => {
  let component: RagBreadcrumb;
  let fixture: ComponentFixture<RagBreadcrumb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagBreadcrumb]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagBreadcrumb);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
