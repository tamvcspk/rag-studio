import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagTabNavigation } from './rag-tab-navigation';

describe('RagTabNavigation', () => {
  let component: RagTabNavigation;
  let fixture: ComponentFixture<RagTabNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagTabNavigation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagTabNavigation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
