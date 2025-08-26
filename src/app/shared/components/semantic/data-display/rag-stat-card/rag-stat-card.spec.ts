import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagStatCard } from './rag-stat-card';

describe('RagStatCard', () => {
  let component: RagStatCard;
  let fixture: ComponentFixture<RagStatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagStatCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagStatCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
