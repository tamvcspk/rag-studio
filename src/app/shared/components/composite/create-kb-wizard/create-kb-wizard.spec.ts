import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateKbWizard } from './create-kb-wizard';

describe('CreateKbWizard', () => {
  let component: CreateKbWizard;
  let fixture: ComponentFixture<CreateKbWizard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateKbWizard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateKbWizard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
