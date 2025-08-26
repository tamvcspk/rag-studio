import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagCodeBlock } from './rag-code-block';

describe('RagCodeBlock', () => {
  let component: RagCodeBlock;
  let fixture: ComponentFixture<RagCodeBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagCodeBlock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagCodeBlock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
