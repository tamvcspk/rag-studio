import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagDropdown } from './rag-dropdown';

describe('RagDropdown', () => {
  let component: RagDropdown;
  let fixture: ComponentFixture<RagDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagDropdown]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RagDropdown);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
