import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Flows } from './flows';

describe('Flows', () => {
  let component: Flows;
  let fixture: ComponentFixture<Flows>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Flows]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Flows);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
