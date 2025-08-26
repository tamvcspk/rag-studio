import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagDialog } from './rag-dialog';

describe('RagDialog', () => {
  let component: RagDialog;
  let fixture: ComponentFixture<RagDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
