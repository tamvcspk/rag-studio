import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { 
  GitBranchIcon,
  CheckIcon,
  XIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  InfoIcon,
  WrenchIcon,
  BookOpenIcon,
  WorkflowIcon,
  CircleIcon
} from 'lucide-angular';
import { Flow, FlowPart } from '../../../models/flow.model';
import { RagDialog } from '../../semantic/overlay/rag-dialog/rag-dialog';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagInput } from '../../atomic/primitives/rag-input/rag-input';
import { RagTextarea } from '../../atomic/primitives/rag-textarea/rag-textarea';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagProgress } from '../../atomic/primitives/rag-progress/rag-progress';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface FlowFormData {
  name: string;
  description: string;
  tags: string[];
  parts: FlowPart[];
}

interface AvailableComponent {
  id: string;
  name: string;
  type: 'tool' | 'kb' | 'pipeline';
  description?: string;
}

@Component({
  selector: 'app-create-flow-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RagDialog,
    RagIcon,
    RagButton,
    RagInput,
    RagTextarea,
    RagChip,
    RagCard,
    RagProgress
  ],
  templateUrl: './create-flow-wizard.html',
  styleUrl: './create-flow-wizard.scss'
})
export class CreateFlowWizard {
  readonly onFlowCreated = output<Flow>();
  readonly onCancel = output<void>();

  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly data = inject(DIALOG_DATA, { optional: true });

  // Icon components
  readonly gitBranchIcon = GitBranchIcon;
  readonly checkIcon = CheckIcon;
  readonly xIcon = XIcon;
  readonly checkCircleIcon = CheckCircleIcon;
  readonly plusCircleIcon = PlusCircleIcon;
  readonly arrowRightIcon = ArrowRightIcon;
  readonly arrowLeftIcon = ArrowLeftIcon;
  readonly infoIcon = InfoIcon;
  readonly wrenchIcon = WrenchIcon;
  readonly bookOpenIcon = BookOpenIcon;
  readonly workflowIcon = WorkflowIcon;
  readonly circleIcon = CircleIcon;

  readonly currentStep = signal(0);
  readonly isCreating = signal(false);
  readonly newTag = signal('');

  readonly steps: WizardStep[] = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Name, description, and tags for your flow',
      completed: false
    },
    {
      id: 'components',
      title: 'Add Components',
      description: 'Select tools, knowledge bases, and pipelines',
      completed: false
    },
    {
      id: 'connections',
      title: 'Connect Components',
      description: 'Define how components work together',
      completed: false
    },
    {
      id: 'review',
      title: 'Review & Create',
      description: 'Review your flow configuration',
      completed: false
    }
  ];

  readonly formData = signal<FlowFormData>({
    name: '',
    description: '',
    tags: [],
    parts: []
  });

  // Mock data for available components
  readonly availableComponents: AvailableComponent[] = [
    { id: 'tool-1', name: 'Angular Search', type: 'tool', description: 'Search Angular documentation' },
    { id: 'tool-2', name: 'React Assistant', type: 'tool', description: 'Answer React questions' },
    { id: 'kb-1', name: 'Angular Docs', type: 'kb', description: 'Angular framework documentation' },
    { id: 'kb-2', name: 'React Docs', type: 'kb', description: 'React library documentation' },
    { id: 'pipeline-1', name: 'Doc Sync', type: 'pipeline', description: 'Documentation sync pipeline' },
    { id: 'pipeline-2', name: 'Content Ingestion', type: 'pipeline', description: 'General content ingestion' }
  ];

  readonly selectedComponents = signal<AvailableComponent[]>([]);

  get currentStepData(): WizardStep {
    return this.steps[this.currentStep()];
  }

  get progress(): number {
    return ((this.currentStep() + 1) / this.steps.length) * 100;
  }

  get canGoNext(): boolean {
    switch (this.currentStep()) {
      case 0: // Basic info
        return this.formData().name.trim().length > 0 && this.formData().description.trim().length > 0;
      case 1: // Components
        return this.selectedComponents().length > 0;
      case 2: // Connections
        return true; // Allow skip for now
      case 3: // Review
        return false;
      default:
        return false;
    }
  }

  get canGoPrevious(): boolean {
    return this.currentStep() > 0;
  }

  get canCreate(): boolean {
    return this.currentStep() === 3 && this.canGoNext;
  }

  nextStep(): void {
    if (this.canGoNext && this.currentStep() < this.steps.length - 1) {
      this.currentStep.set(this.currentStep() + 1);
      this.updateStepCompletion();
    }
  }

  previousStep(): void {
    if (this.canGoPrevious) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  goToStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.currentStep.set(stepIndex);
    }
  }

  updateFormData<K extends keyof FlowFormData>(field: K, value: FlowFormData[K]): void {
    this.formData.update(data => ({
      ...data,
      [field]: value
    }));
  }

  // Template getters for ngModel binding
  get flowName(): string {
    return this.formData().name;
  }

  set flowName(value: string) {
    this.updateFormData('name', value);
  }

  get flowDescription(): string {
    return this.formData().description;
  }

  set flowDescription(value: string) {
    this.updateFormData('description', value);
  }

  get tagInput(): string {
    return this.newTag();
  }

  set tagInput(value: string) {
    this.newTag.set(value);
  }

  addTag(): void {
    const tag = this.newTag().trim();
    if (tag && !this.formData().tags.includes(tag)) {
      this.updateFormData('tags', [...this.formData().tags, tag]);
      this.newTag.set('');
    }
  }

  removeTag(tag: string): void {
    this.updateFormData('tags', this.formData().tags.filter(t => t !== tag));
  }

  toggleComponent(component: AvailableComponent): void {
    const selected = this.selectedComponents();
    const isSelected = selected.find(c => c.id === component.id);
    
    if (isSelected) {
      this.selectedComponents.set(selected.filter(c => c.id !== component.id));
    } else {
      this.selectedComponents.set([...selected, component]);
    }
  }

  isComponentSelected(component: AvailableComponent): boolean {
    return this.selectedComponents().some(c => c.id === component.id);
  }

  getComponentIcon(type: 'tool' | 'kb' | 'pipeline'): any {
    switch (type) {
      case 'tool': return this.wrenchIcon;
      case 'kb': return this.bookOpenIcon;
      case 'pipeline': return this.workflowIcon;
      default: return this.circleIcon;
    }
  }

  private updateStepCompletion(): void {
    // Mark previous steps as completed
    for (let i = 0; i < this.currentStep(); i++) {
      this.steps[i].completed = true;
    }
  }

  async createFlow(): Promise<void> {
    if (!this.canCreate) return;

    this.isCreating.set(true);

    try {
      // Convert selected components to flow parts
      const parts: FlowPart[] = this.selectedComponents().map((component, index) => ({
        id: `part-${component.id}`,
        kind: component.type,
        refId: component.id,
        name: component.name,
        order: index,
        connections: [] // Simplified for now
      }));

      // Create the flow object
      const newFlow: Flow = {
        id: `flow-${Date.now()}`,
        name: this.formData().name,
        description: this.formData().description,
        parts,
        checksum: 'mock-checksum',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        executionCount: 0,
        successRate: 1.0,
        tags: this.formData().tags
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.onFlowCreated.emit(newFlow);
      if (this.dialogRef) {
        this.dialogRef.close(newFlow);
      }
      this.resetWizard();
    } catch (error) {
      console.error('Error creating flow:', error);
    } finally {
      this.isCreating.set(false);
    }
  }

  cancel(): void {
    this.onCancel.emit();
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    this.resetWizard();
  }

  private resetWizard(): void {
    this.currentStep.set(0);
    this.formData.set({
      name: '',
      description: '',
      tags: [],
      parts: []
    });
    this.selectedComponents.set([]);
    this.newTag.set('');
    this.steps.forEach(step => step.completed = false);
  }
}
