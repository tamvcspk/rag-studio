import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagCard } from './rag-card';

describe('RagCard', () => {
  let component: RagCard;
  let fixture: ComponentFixture<RagCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
