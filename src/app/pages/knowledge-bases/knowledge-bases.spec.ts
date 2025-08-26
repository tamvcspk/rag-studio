import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnowledgeBases } from './knowledge-bases';

describe('KnowledgeBases', () => {
  let component: KnowledgeBases;
  let fixture: ComponentFixture<KnowledgeBases>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KnowledgeBases]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KnowledgeBases);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
