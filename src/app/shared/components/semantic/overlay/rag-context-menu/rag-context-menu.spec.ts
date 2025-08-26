import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagContextMenu } from './rag-context-menu';

describe('RagContextMenu', () => {
  let component: RagContextMenu;
  let fixture: ComponentFixture<RagContextMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagContextMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagContextMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
