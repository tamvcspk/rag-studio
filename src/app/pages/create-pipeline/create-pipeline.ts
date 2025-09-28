import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Check, Workflow, Settings, FileText, Zap, Database, Globe } from 'lucide-angular';

import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { RagButton } from '../../shared/components/atomic/primitives/rag-button/rag-button';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { RagInput } from '../../shared/components/atomic/primitives/rag-input/rag-input';
import { RagTextarea } from '../../shared/components/atomic/primitives/rag-textarea/rag-textarea';
import { RagFormField } from '../../shared/components/semantic/forms/rag-form-field/rag-form-field';
import { RagCard } from '../../shared/components/semantic/data-display/rag-card/rag-card';
import { RagSelect } from '../../shared/components/atomic/primitives/rag-select/rag-select';
import { RagStepper, RagStepPanelDirective } from '../../shared/components/semantic/navigation/rag-stepper/rag-stepper';
import { PipelinesStore } from '../../shared/store/pipelines.store';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';

interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  steps: string[];
  recommended?: boolean;
}

interface ScheduleOption {
  id: string;
  label: string;
  description: string;
  cronExpression?: string;
}

@Component({
  selector: 'app-create-pipeline',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagPageHeader,
    RagButton,
    RagIcon,
    RagInput,
    RagTextarea,
    RagFormField,
    RagCard,
    RagSelect,
    RagStepper,
    RagStepPanelDirective,
  ],
  templateUrl: './create-pipeline.html',
  styleUrl: './create-pipeline.scss'
})
export class CreatePipeline implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly pipelinesStore = inject(PipelinesStore);
  private readonly toastService = inject(RagToastService);

  // Wizard state
  readonly currentStep = signal(1);
  readonly totalSteps = 5;
  readonly isSubmitting = signal(false);
  readonly isDraft = signal(false);

  // Return context from KB creation
  readonly returnTo = signal<string | null>(null);
  readonly context = signal<string | null>(null);

  // Forms for each step
  readonly step1Form = this.fb.group({
    selectedTemplate: ['', [Validators.required]]
  });

  readonly step2Form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    category: ['custom', [Validators.required]],
    tags: [[]]
  });

  readonly step3Form = this.fb.group({
    triggerType: ['manual', [Validators.required]],
    schedule: [''],
    retryAttempts: [3, [Validators.min(0), Validators.max(10)]],
    timeout: [30, [Validators.min(1), Validators.max(1440)]]
  });

  readonly step4Form = this.fb.group({
    pipelineSteps: this.fb.control([] as any[], [Validators.required])
  });

  readonly step5Form = this.fb.group({
    notifications: [[]],
    errorHandling: ['continue', [Validators.required]],
    logging: ['standard', [Validators.required]]
  });

  // Selected template from step 1
  readonly selectedTemplate = signal<PipelineTemplate | null>(null);

  // Pipeline templates for step 1
  readonly templates: PipelineTemplate[] = [
    {
      id: 'data-ingestion',
      name: 'Data Ingestion',
      description: 'Fetch, parse, and index content from various sources',
      category: 'ingestion',
      icon: Database,
      steps: ['fetch', 'parse', 'normalize', 'chunk', 'embed', 'index'],
      recommended: true
    },
    {
      id: 'content-processing',
      name: 'Content Processing',
      description: 'Transform and enrich existing content',
      category: 'processing',
      icon: Settings,
      steps: ['validate', 'transform', 'enrich', 'quality-check']
    },
    {
      id: 'web-scraping',
      name: 'Web Scraping',
      description: 'Scrape and process web content systematically',
      category: 'ingestion',
      icon: Globe,
      steps: ['crawl', 'extract', 'clean', 'validate', 'store']
    },
    {
      id: 'document-analysis',
      name: 'Document Analysis',
      description: 'Analyze and extract insights from documents',
      category: 'analysis',
      icon: FileText,
      steps: ['parse', 'analyze', 'extract-entities', 'generate-summary']
    },
    {
      id: 'custom',
      name: 'Custom Pipeline',
      description: 'Build a pipeline from scratch with custom steps',
      category: 'custom',
      icon: Zap,
      steps: []
    }
  ];

  // Schedule options for step 3
  readonly scheduleOptions: ScheduleOption[] = [
    { id: 'manual', label: 'Manual Only', description: 'Run manually when needed' },
    { id: 'hourly', label: 'Every Hour', description: 'Run automatically every hour', cronExpression: '0 * * * *' },
    { id: 'daily', label: 'Daily', description: 'Run once per day at midnight', cronExpression: '0 0 * * *' },
    { id: 'weekly', label: 'Weekly', description: 'Run once per week on Sunday', cronExpression: '0 0 * * 0' },
    { id: 'custom', label: 'Custom Schedule', description: 'Define custom cron expression' }
  ];

  // Icon components
  readonly iconComponents = {
    ArrowLeft,
    Save,
    ChevronLeft,
    ChevronRight,
    Check,
    Workflow,
    Settings,
    FileText,
    Zap,
    Database,
    Globe
  };

  // Computed properties
  readonly canGoNext = computed(() => {
    const step = this.currentStep();
    switch (step) {
      case 1: return this.step1Form.valid && this.selectedTemplate() !== null;
      case 2: return this.step2Form.valid;
      case 3: return this.step3Form.valid;
      case 4: return this.step4Form.valid;
      case 5: return this.step5Form.valid;
      default: return false;
    }
  });

  readonly canGoBack = computed(() => this.currentStep() > 1);

  readonly headerActions = computed(() => [
    {
      label: 'Save Draft',
      icon: this.iconComponents.Save,
      variant: 'ghost' as const,
      action: () => this.saveDraft()
    }
  ]);

  readonly backButtonText = computed(() => {
    const returnTo = this.returnTo();
    if (returnTo === 'create-kb') {
      return 'Back to KB Creation';
    }
    return 'Back to Pipelines';
  });

  readonly selectedTriggerType = computed(() => this.step3Form.get('triggerType')?.value);

  readonly finalConfiguration = computed(() => ({
    template: this.selectedTemplate(),
    basic: this.step2Form.value,
    configuration: this.step3Form.value,
    steps: this.step4Form.value,
    settings: this.step5Form.value
  }));

  ngOnInit(): void {
    // Initialize stores
    this.pipelinesStore.initialize();

    // Check query params for return context
    this.route.queryParams.subscribe(params => {
      if (params['returnTo']) {
        this.returnTo.set(params['returnTo']);
      }
      if (params['context']) {
        this.context.set(params['context']);
      }
    });

    // Watch for trigger type changes
    this.step3Form.get('triggerType')?.valueChanges.subscribe(type => {
      const scheduleControl = this.step3Form.get('schedule');
      if (type === 'scheduled') {
        scheduleControl?.setValidators([Validators.required]);
      } else {
        scheduleControl?.clearValidators();
      }
      scheduleControl?.updateValueAndValidity();
    });
  }

  goBack(): void {
    const returnTo = this.returnTo();
    if (returnTo === 'create-kb') {
      this.router.navigate(['/create-kb']);
    } else {
      this.router.navigate(['/pipelines']);
    }
  }

  selectTemplate(template: PipelineTemplate): void {
    this.selectedTemplate.set(template);
    this.step1Form.patchValue({ selectedTemplate: template.id });

    // Auto-populate step 2 form based on template
    if (template.id !== 'custom') {
      this.step2Form.patchValue({
        name: `${template.name} Pipeline`,
        description: template.description,
        category: template.category
      });
    }
  }

  nextStep(): void {
    if (this.canGoNext()) {
      this.currentStep.set(Math.min(this.currentStep() + 1, this.totalSteps));
    }
  }

  previousStep(): void {
    if (this.canGoBack()) {
      this.currentStep.set(Math.max(this.currentStep() - 1, 1));
    }
  }

  onPipelineDesigned(steps: any[]): void {
    this.step4Form.patchValue({ pipelineSteps: steps });
  }

  onStepClick(event: { step: number; id: string }): void {
    this.currentStep.set(event.step);
  }

  onStepChange(stepNumber: number): void {
    this.currentStep.set(stepNumber);
  }

  getSelectedScheduleLabel(): string {
    const selectedId = this.step3Form.get('schedule')?.value;
    const schedule = this.scheduleOptions.find(opt => opt.id === selectedId);
    return schedule?.label || '';
  }

  getFieldError(form: FormGroup, fieldName: string): string | undefined {
    const control = form.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['min']) return `${fieldName} must be at least ${control.errors['min'].min}`;
      if (control.errors['max']) return `${fieldName} must be at most ${control.errors['max'].max}`;
    }
    return undefined;
  }

  get scheduleSelectOptions() {
    return this.scheduleOptions.map(opt => ({ value: opt.id, label: opt.label }));
  }

  async saveDraft(): Promise<void> {
    this.isDraft.set(true);
    try {
      // Simulate saving draft
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.toastService.success('Draft saved successfully', 'Success');
    } catch (error) {
      this.toastService.error('Failed to save draft', 'Error');
    } finally {
      this.isDraft.set(false);
    }
  }

  async createPipeline(): Promise<void> {
    if (!this.canGoNext()) return;

    this.isSubmitting.set(true);

    try {
      const config = this.finalConfiguration();

      // Create pipeline using store
      const result = await this.pipelinesStore.createPipeline({
        name: config.basic.name || '',
        description: config.basic.description || '',
        tags: config.basic.tags || []
      });

      if (result) {
        this.toastService.success('Pipeline created successfully!', 'Success');

        // Handle return flow based on context
        const returnTo = this.returnTo();
        if (returnTo === 'create-kb') {
          // Return to KB creation with pipeline info
          this.router.navigate(['/create-kb'], {
            queryParams: {
              pipelineCreated: true,
              pipelineId: result.id,
              pipelineName: result.name
            }
          });
        } else {
          // Normal flow - go to pipelines page
          this.router.navigate(['/pipelines']);
        }
      } else {
        throw new Error('Failed to create pipeline');
      }
    } catch (error) {
      this.toastService.error('Failed to create Pipeline', 'Error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1: return 'Choose Template';
      case 2: return 'Basic Information';
      case 3: return 'Configuration';
      case 4: return 'Design Pipeline';
      case 5: return 'Review & Create';
      default: return 'Create Pipeline';
    }
  }

  getCategoryOptions() {
    return [
      { value: 'ingestion', label: 'Data Ingestion' },
      { value: 'processing', label: 'Content Processing' },
      { value: 'analysis', label: 'Document Analysis' },
      { value: 'custom', label: 'Custom' }
    ];
  }

  getErrorHandlingOptions() {
    return [
      { value: 'stop', label: 'Stop on Error' },
      { value: 'continue', label: 'Continue on Error' },
      { value: 'retry', label: 'Retry on Error' }
    ];
  }

  getLoggingOptions() {
    return [
      { value: 'minimal', label: 'Minimal Logging' },
      { value: 'standard', label: 'Standard Logging' },
      { value: 'verbose', label: 'Verbose Logging' },
      { value: 'debug', label: 'Debug Logging' }
    ];
  }
}