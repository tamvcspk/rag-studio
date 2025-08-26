import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagTimestamp } from './rag-timestamp';

describe('RagTimestamp', () => {
  let component: RagTimestamp;
  let fixture: ComponentFixture<RagTimestamp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagTimestamp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagTimestamp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
