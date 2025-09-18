import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagKeyValue } from './rag-key-value';

describe('RagKeyValue', () => {
  let component: RagKeyValue;
  let fixture: ComponentFixture<RagKeyValue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagKeyValue]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagKeyValue);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
