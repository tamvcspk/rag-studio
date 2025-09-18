import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagSidebarItem } from './rag-sidebar-item';

describe('RagSidebarItem', () => {
  let component: RagSidebarItem;
  let fixture: ComponentFixture<RagSidebarItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagSidebarItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagSidebarItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
