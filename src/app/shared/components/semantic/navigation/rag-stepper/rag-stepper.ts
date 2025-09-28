import {
  Component,
  input,
  output,
  signal,
  computed,
  ContentChildren,
  QueryList,
  AfterContentInit,
  Directive,
  ViewChild,
  ElementRef,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';
import { CheckIcon } from 'lucide-angular';

export interface StepperStep {
  id: string;
  label: string;
  number: number;
  completed?: boolean;
  current?: boolean;
  disabled?: boolean;
}

@Directive({
  selector: '[ragStepPanel]',
  standalone: true
})
export class RagStepPanelDirective {
  readonly id = input.required<string>({ alias: 'ragStepPanel' });
  readonly label = input.required<string>();
  readonly stepNumber = input.required<number>();
  readonly completed = input(false, { transform: Boolean });
  readonly disabled = input(false, { transform: Boolean });

  constructor(public elementRef: ElementRef) {}

  setVisible(visible: boolean): void {
    const element = this.elementRef.nativeElement;
    if (visible) {
      element.style.display = '';
      element.setAttribute('aria-hidden', 'false');
      element.setAttribute('tabindex', '0');
    } else {
      element.style.display = 'none';
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('tabindex', '-1');
    }
  }
}

@Component({
  selector: 'rag-stepper',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-stepper.html',
  styleUrl: './rag-stepper.scss'
})
export class RagStepper implements AfterContentInit {
  // Modern Angular 20: Use input() with proper typing
  readonly currentStep = input<number>(1);
  readonly totalSteps = input<number>(1);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly variant = input<'default' | 'compact'>('default');

  // Signal-based outputs
  readonly stepClick = output<{ step: number; id: string }>();
  readonly currentStepChange = output<number>();

  @ContentChildren(RagStepPanelDirective) stepPanels!: QueryList<RagStepPanelDirective>;
  @ViewChild('stepPanelsContainer', { static: false }) stepPanelsContainer!: ElementRef<HTMLDivElement>;

  private readonly internalCurrentStep = signal<number>(1);
  readonly stepPanelsSignal = signal<RagStepPanelDirective[]>([]);

  // Icons
  readonly CheckIcon = CheckIcon;

  constructor() {
    // Watch for current step changes and update visibility
    effect(() => {
      const currentStep = this.currentStepNumber();
      this.updateStepPanelVisibility();
    });
  }

  // Modern Angular 20: Use computed for derived state
  readonly stepperClasses = computed(() => [
    'rt-Stepper',
    `rt-size-${this.size()}`,
    `rt-orientation-${this.orientation()}`,
    `rt-variant-${this.variant()}`,
    'rt-with-content'
  ].filter(Boolean).join(' '));

  readonly currentStepNumber = computed(() => {
    return this.currentStep() ?? this.internalCurrentStep();
  });

  readonly processedSteps = computed(() => {
    const currentStepNumber = this.currentStepNumber();
    const panelSteps = this.stepPanelsSignal();

    // Generate steps from step panels
    return panelSteps.map((panel, index) => ({
      id: panel.id(),
      label: panel.label(),
      number: panel.stepNumber(),
      completed: panel.completed() || panel.stepNumber() < currentStepNumber,
      current: panel.stepNumber() === currentStepNumber,
      disabled: panel.disabled() || panel.stepNumber() > currentStepNumber
    }));
  });

  ngAfterContentInit(): void {
    // Update step panels signal when content changes
    this.updateStepPanelsSignal();

    // Listen for changes to step panels
    this.stepPanels.changes.subscribe(() => {
      this.updateStepPanelsSignal();
      this.updateStepPanelVisibility();
    });

    // Initialize with first step if no selection and step panels exist
    if (this.currentStep() === undefined && this.stepPanels.length > 0) {
      this.internalCurrentStep.set(1);
    }

    // Initial visibility update
    this.updateStepPanelVisibility();
  }

  private updateStepPanelsSignal(): void {
    this.stepPanelsSignal.set(this.stepPanels.toArray());
  }

  private updateStepPanelVisibility(): void {
    if (!this.stepPanels) return;

    const currentStepNumber = this.currentStepNumber();
    this.stepPanels.forEach(panel => {
      const isVisible = panel.stepNumber() === currentStepNumber;
      panel.setVisible(isVisible);
    });
  }

  getStepClasses(step: StepperStep): string {
    return [
      'rt-StepperStep',
      step.completed ? 'rt-completed' : '',
      step.current ? 'rt-current' : '',
      step.disabled ? 'rt-disabled' : ''
    ].filter(Boolean).join(' ');
  }

  getStepCircleClasses(step: StepperStep): string {
    return [
      'rt-StepperCircle',
      step.completed ? 'rt-completed' : '',
      step.current ? 'rt-current' : '',
      step.disabled ? 'rt-disabled' : ''
    ].filter(Boolean).join(' ');
  }

  getConnectorClasses(step: StepperStep): string {
    return [
      'rt-StepperConnector',
      step.completed ? 'rt-completed' : ''
    ].filter(Boolean).join(' ');
  }

  onStepClick(step: StepperStep): void {
    if (step.disabled) return;

    this.internalCurrentStep.set(step.number);
    this.currentStepChange.emit(step.number);
    this.stepClick.emit({ step: step.number, id: step.id });
  }

  getStepPanelById(stepId: string): RagStepPanelDirective | undefined {
    return this.stepPanelsSignal().find(panel => panel.id() === stepId);
  }
}