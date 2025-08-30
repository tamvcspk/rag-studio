import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateFlowWizard } from './create-flow-wizard';

describe('CreateFlowWizard', () => {
  let component: CreateFlowWizard;
  let fixture: ComponentFixture<CreateFlowWizard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateFlowWizard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateFlowWizard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
