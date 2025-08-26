import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagFormField } from './rag-form-field';

describe('RagFormField', () => {
  let component: RagFormField;
  let fixture: ComponentFixture<RagFormField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagFormField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagFormField);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
