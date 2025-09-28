import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { RagStepper, RagStepPanelDirective, StepperStep } from './rag-stepper';

@Component({
  template: `
    <rag-stepper [currentStep]="currentStep">
      <div ragStepPanel="step1" label="Step 1" [stepNumber]="1">
        <p>Content for Step 1</p>
      </div>
      <div ragStepPanel="step2" label="Step 2" [stepNumber]="2">
        <p>Content for Step 2</p>
      </div>
      <div ragStepPanel="step3" label="Step 3" [stepNumber]="3">
        <p>Content for Step 3</p>
      </div>
    </rag-stepper>
  `,
  imports: [RagStepper, RagStepPanelDirective],
  standalone: true
})
class TestHostComponent {
  currentStep = 1;
}

describe('RagStepper', () => {
  let component: RagStepper;
  let fixture: ComponentFixture<RagStepper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagStepper]
    }).compileComponents();

    fixture = TestBed.createComponent(RagStepper);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('currentStep', 1);
    fixture.componentRef.setInput('totalSteps', 3);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply size variant classes', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    const stepperElement = fixture.nativeElement.querySelector('.rt-Stepper');
    expect(stepperElement).toHaveClass('rt-size-lg');
  });

  it('should apply variant classes', () => {
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    const stepperElement = fixture.nativeElement.querySelector('.rt-Stepper');
    expect(stepperElement).toHaveClass('rt-variant-compact');
  });

  it('should provide accessibility information', () => {
    fixture.detectChanges();

    const navElement = fixture.nativeElement.querySelector('[role="navigation"]');
    expect(navElement).toBeTruthy();
    expect(navElement.getAttribute('aria-label')).toBe('Progress Steps');

    const srElement = fixture.nativeElement.querySelector('.sr-only');
    expect(srElement).toBeTruthy();
  });

  it('should always apply content handling class', () => {
    fixture.detectChanges();

    const stepperElement = fixture.nativeElement.querySelector('.rt-Stepper');
    expect(stepperElement).toHaveClass('rt-with-content');
  });
});

describe('RagStepper with Content Panels', () => {
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
  });

  it('should create stepper with content panels', () => {
    expect(hostComponent).toBeTruthy();
    hostFixture.detectChanges();

    const stepPanels = hostFixture.nativeElement.querySelectorAll('.rt-StepPanel');
    expect(stepPanels.length).toBe(3);
  });

  it('should show only the current step content', () => {
    hostComponent.currentStep = 2;
    hostFixture.detectChanges();

    const visiblePanel = hostFixture.nativeElement.querySelector('.rt-StepPanel--visible');
    const hiddenPanels = hostFixture.nativeElement.querySelectorAll('.rt-StepPanel--hidden');

    expect(visiblePanel).toBeTruthy();
    expect(hiddenPanels.length).toBe(2);

    const visibleContent = visiblePanel.textContent?.trim();
    expect(visibleContent).toBe('Content for Step 2');
  });

  it('should update content visibility when current step changes', () => {
    hostComponent.currentStep = 1;
    hostFixture.detectChanges();

    let visibleContent = hostFixture.nativeElement.querySelector('.rt-StepPanel--visible').textContent?.trim();
    expect(visibleContent).toBe('Content for Step 1');

    hostComponent.currentStep = 3;
    hostFixture.detectChanges();

    visibleContent = hostFixture.nativeElement.querySelector('.rt-StepPanel--visible').textContent?.trim();
    expect(visibleContent).toBe('Content for Step 3');
  });

  it('should make step circles clickable', () => {
    hostFixture.detectChanges();

    const clickableCircles = hostFixture.nativeElement.querySelectorAll('.rt-StepperCircle[role="button"]');
    expect(clickableCircles.length).toBeGreaterThan(0);

    const firstCircle = clickableCircles[0];
    expect(firstCircle.getAttribute('tabindex')).toBe('0');
    expect(firstCircle.getAttribute('aria-label')).toContain('Go to step');
  });
});