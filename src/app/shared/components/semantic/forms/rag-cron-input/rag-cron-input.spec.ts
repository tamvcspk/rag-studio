import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagCronInput } from './rag-cron-input';

describe('RagCronInput', () => {
  let component: RagCronInput;
  let fixture: ComponentFixture<RagCronInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagCronInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagCronInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
