import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagVersionInput } from './rag-version-input';

describe('RagVersionInput', () => {
  let component: RagVersionInput;
  let fixture: ComponentFixture<RagVersionInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagVersionInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagVersionInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
