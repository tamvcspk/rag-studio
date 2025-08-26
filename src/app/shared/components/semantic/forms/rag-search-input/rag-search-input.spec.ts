import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagSearchInput } from './rag-search-input';

describe('RagSearchInput', () => {
  let component: RagSearchInput;
  let fixture: ComponentFixture<RagSearchInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagSearchInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagSearchInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
