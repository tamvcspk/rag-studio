import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnowledgeBaseCard } from './knowledge-base-card';

describe('KnowledgeBaseCard', () => {
  let component: KnowledgeBaseCard;
  let fixture: ComponentFixture<KnowledgeBaseCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KnowledgeBaseCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KnowledgeBaseCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
