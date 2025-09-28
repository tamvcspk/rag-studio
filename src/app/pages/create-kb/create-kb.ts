import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Check, FileText, Globe, Github, Database, Plus } from 'lucide-angular';

import { RagPageHeader } from '../../shared/components/semantic/navigation/rag-page-header/rag-page-header';
import { RagButton } from '../../shared/components/atomic/primitives/rag-button/rag-button';
import { RagIcon } from '../../shared/components/atomic/primitives/rag-icon/rag-icon';
import { RagInput } from '../../shared/components/atomic/primitives/rag-input/rag-input';
import { RagTextarea } from '../../shared/components/atomic/primitives/rag-textarea/rag-textarea';
import { RagFormField } from '../../shared/components/semantic/forms/rag-form-field/rag-form-field';
import { RagCard } from '../../shared/components/semantic/data-display/rag-card/rag-card';
import { RagStepper, RagStepPanelDirective } from '../../shared/components/semantic/navigation/rag-stepper/rag-stepper';
import { PipelinesStore } from '../../shared/store/pipelines.store';
import { ModelsStore } from '../../shared/store/models.store';
import { RagToastService } from '../../shared/components/atomic/feedback/rag-toast/rag-toast.service';

interface TemplateCard {
  id: string;
  name: string;
  description: string;
  icon: any;
  recommended?: boolean;
}

interface PipelinePreview {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'busy' | 'not-supported';
}

interface ModelStatus {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'not-supported';
  performance?: string;
}

@Component({
  selector: 'app-create-kb',
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
    RagStepper,
    RagStepPanelDirective
  ],
  templateUrl: './create-kb.html',
  styleUrl: './create-kb.scss'
})
export class CreateKB implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly pipelinesStore = inject(PipelinesStore);
  private readonly modelsStore = inject(ModelsStore);
  private readonly toastService = inject(RagToastService);

  // Wizard state
  readonly currentStep = signal(1);
  readonly totalSteps = 6;
  readonly isSubmitting = signal(false);
  readonly isDraft = signal(false);

  // Forms for each step
  readonly step2Form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    product: ['', [Validators.required, Validators.minLength(2)]],
    version: ['1.0.0', [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+.*$/)]],
    description: ['']
  });

  readonly step3Form = this.fb.group({
    sourceUrl: ['', [Validators.required]]
  });

  readonly step4Form = this.fb.group({
    pipelineMode: ['existing', [Validators.required]],
    selectedPipelineId: [''],
    newPipelineName: [''],
    newPipelineDescription: ['']
  });

  readonly step5Form = this.fb.group({
    selectedModelId: ['', [Validators.required]]
  });

  // Selected template from step 1
  readonly selectedTemplate = signal<TemplateCard | null>(null);

  // Created pipeline tracking for step 4
  readonly createdPipelineId = signal<string | null>(null);
  readonly createdPipelineName = signal<string | null>(null);

  // Validation state
  readonly sourceValidationState = signal<'idle' | 'validating' | 'success' | 'error'>('idle');
  readonly sourceValidationMessage = signal<string>('');

  // Templates for step 1
  readonly templates: TemplateCard[] = [
    {
      id: 'documentation',
      name: 'Documentation',
      description: 'Technical documentation, API references, user guides',
      icon: FileText,
      recommended: true
    },
    {
      id: 'website',
      name: 'Website',
      description: 'Web pages, blogs, marketing content',
      icon: Globe
    },
    {
      id: 'files',
      name: 'Files',
      description: 'PDFs, documents, local file collections',
      icon: Database
    },
    {
      id: 'github',
      name: 'GitHub Repository',
      description: 'Source code, README files, project documentation',
      icon: Github
    }
  ];

  // Mock pipeline previews for step 4
  readonly availablePipelines = signal<PipelinePreview[]>([
    {
      id: 'default-doc-pipeline',
      name: 'Standard Documentation Pipeline',
      description: 'Optimized for technical documentation with code snippets',
      status: 'available'
    },
    {
      id: 'web-crawler-pipeline',
      name: 'Web Crawler Pipeline',
      description: 'Crawls websites and extracts structured content',
      status: 'available'
    }
  ]);

  // Mock model statuses for step 5
  readonly modelStatuses = signal<ModelStatus[]>([
    {
      id: 'sentence-transformers/all-MiniLM-L6-v2',
      name: 'MiniLM-L6 (Fast)',
      status: 'available',
      performance: 'Fast, good for general content'
    },
    {
      id: 'sentence-transformers/all-mpnet-base-v2',
      name: 'MPNet Base (Balanced)',
      status: 'available',
      performance: 'Balanced speed and quality'
    },
    {
      id: 'sentence-transformers/all-distilroberta-v1',
      name: 'DistilRoBERTa (Quality)',
      status: 'busy',
      performance: 'High quality, slower processing'
    }
  ]);

  // Icon components
  readonly iconComponents = {
    ArrowLeft,
    Save,
    ChevronLeft,
    ChevronRight,
    Check,
    FileText,
    Globe,
    Github,
    Database,
    Plus
  };

  // Computed properties
  readonly canGoNext = computed(() => {
    const step = this.currentStep();
    switch (step) {
      case 1: return this.selectedTemplate() !== null;
      case 2: return this.step2Form.valid;
      case 3: return this.step3Form.valid && this.sourceValidationState() === 'success';
      case 4: return this.step4Form.valid && (this.selectedPipelineMode() === 'existing' || this.createdPipelineId() !== null);
      case 5: return this.step5Form.valid;
      case 6: return true;
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

  readonly selectedPipelineMode = computed(() => this.step4Form.get('pipelineMode')?.value);

  readonly finalConfiguration = computed(() => ({
    template: this.selectedTemplate(),
    basicInfo: this.step2Form.value,
    source: this.step3Form.value,
    pipeline: this.step4Form.value,
    model: this.step5Form.value
  }));

  ngOnInit(): void {
    // Initialize stores
    this.pipelinesStore.initialize();

    // Check if returning from pipeline creation
    this.route.queryParams.subscribe(params => {
      if (params['pipelineCreated']) {
        const pipelineId = params['pipelineId'];
        const pipelineName = params['pipelineName'];

        if (pipelineId && pipelineName) {
          this.createdPipelineId.set(pipelineId);
          this.createdPipelineName.set(pipelineName);
          this.step4Form.patchValue({
            pipelineMode: 'new',
            selectedPipelineId: pipelineId
          });

          // Navigate to step 4 if not already there
          if (this.currentStep() < 4) {
            this.currentStep.set(4);
          }

          this.toastService.success(
            `Pipeline "${pipelineName}" created successfully!`,
            'Pipeline Created'
          );

          // Clean up URL params
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
          });

          // Restore saved KB state if available
          this.restoreKbState();
        }
      }
    });

    // Watch for pipeline mode changes
    this.step4Form.get('pipelineMode')?.valueChanges.subscribe(mode => {
      const selectedPipelineControl = this.step4Form.get('selectedPipelineId');

      if (mode === 'existing') {
        selectedPipelineControl?.setValidators([Validators.required]);
      } else {
        // For new pipeline mode, validation depends on having created a pipeline
        selectedPipelineControl?.clearValidators();
      }

      selectedPipelineControl?.updateValueAndValidity();
    });
  }

  goBack(): void {
    this.router.navigate(['/knowledge-bases']);
  }

  selectTemplate(template: TemplateCard): void {
    this.selectedTemplate.set(template);
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

  async validateSource(): Promise<void> {
    const sourceUrl = this.step3Form.get('sourceUrl')?.value;
    if (!sourceUrl) return;

    this.sourceValidationState.set('validating');
    this.sourceValidationMessage.set('Validating source...');

    try {
      // Simulate validation API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock validation result
      const isValid = Math.random() > 0.3; // 70% success rate for demo

      if (isValid) {
        this.sourceValidationState.set('success');
        this.sourceValidationMessage.set('Source is accessible and valid');
      } else {
        this.sourceValidationState.set('error');
        this.sourceValidationMessage.set('Unable to access source. Please check the URL.');
      }
    } catch (error) {
      this.sourceValidationState.set('error');
      this.sourceValidationMessage.set('Validation failed. Please try again.');
    }
  }

  selectPipeline(pipelineId: string): void {
    this.step4Form.patchValue({
      pipelineMode: 'existing',
      selectedPipelineId: pipelineId
    });
  }

  selectModel(modelId: string): void {
    this.step5Form.patchValue({ selectedModelId: modelId });
  }

  onStepClick(event: { step: number; id: string }): void {
    this.currentStep.set(event.step);
  }

  onStepChange(stepNumber: number): void {
    this.currentStep.set(stepNumber);
  }

  navigateToCreatePipeline(): void {
    // Save current KB creation state in session storage
    const kbState = {
      currentStep: this.currentStep(),
      template: this.selectedTemplate(),
      step2Data: this.step2Form.value,
      step3Data: this.step3Form.value,
      sourceValidationState: this.sourceValidationState(),
      sourceValidationMessage: this.sourceValidationMessage()
    };

    sessionStorage.setItem('createKbState', JSON.stringify(kbState));

    // Navigate to create pipeline with return context
    this.router.navigate(['/create-pipeline'], {
      queryParams: {
        returnTo: 'create-kb',
        context: 'kb-creation'
      }
    });
  }

  clearCreatedPipeline(): void {
    this.createdPipelineId.set(null);
    this.createdPipelineName.set(null);
    this.step4Form.patchValue({
      selectedPipelineId: ''
    });
  }

  private restoreKbState(): void {
    const savedState = sessionStorage.getItem('createKbState');
    if (savedState) {
      try {
        const kbState = JSON.parse(savedState);

        // Restore template
        if (kbState.template) {
          this.selectedTemplate.set(kbState.template);
        }

        // Restore form data
        if (kbState.step2Data) {
          this.step2Form.patchValue(kbState.step2Data);
        }

        if (kbState.step3Data) {
          this.step3Form.patchValue(kbState.step3Data);
        }

        // Restore validation state
        if (kbState.sourceValidationState) {
          this.sourceValidationState.set(kbState.sourceValidationState);
        }

        if (kbState.sourceValidationMessage) {
          this.sourceValidationMessage.set(kbState.sourceValidationMessage);
        }

        // Clean up session storage
        sessionStorage.removeItem('createKbState');
      } catch (error) {
        console.error('Failed to restore KB state:', error);
        sessionStorage.removeItem('createKbState');
      }
    }
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

  async createKB(): Promise<void> {
    if (!this.canGoNext()) return;

    this.isSubmitting.set(true);

    try {
      const config = this.finalConfiguration();

      // Simulate KB creation
      await new Promise(resolve => setTimeout(resolve, 3000));

      this.toastService.success('Knowledge Base created successfully!', 'Success');
      this.router.navigate(['/knowledge-bases']);
    } catch (error) {
      this.toastService.error('Failed to create Knowledge Base', 'Error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1: return 'Choose Template';
      case 2: return 'Basic Information';
      case 3: return 'Source Configuration';
      case 4: return 'Pipeline Configuration';
      case 5: return 'Model & Preview';
      case 6: return 'Review & Create';
      default: return 'Create Knowledge Base';
    }
  }

  getFieldError(form: FormGroup, fieldName: string): string | undefined {
    const control = form.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['pattern']) {
        if (fieldName === 'version') return 'Version must follow semantic versioning (e.g., 1.0.0)';
        return 'Invalid format';
      }
    }
    return undefined;
  }

  getSourceLabel(): string {
    const template = this.selectedTemplate();
    if (!template) return 'Source URL';

    switch (template.id) {
      case 'documentation': return 'Documentation URL';
      case 'website': return 'Website URL';
      case 'files': return 'File Directory Path';
      case 'github': return 'GitHub Repository URL';
      default: return 'Source URL';
    }
  }

  getSourcePlaceholder(): string {
    const template = this.selectedTemplate();
    if (!template) return 'Enter source location';

    switch (template.id) {
      case 'documentation': return 'https://docs.example.com';
      case 'website': return 'https://example.com';
      case 'files': return 'C:\\Documents\\MyFiles';
      case 'github': return 'https://github.com/user/repo';
      default: return 'Enter source location';
    }
  }

  getSelectedPipelineName(): string {
    const selectedId = this.step4Form.get('selectedPipelineId')?.value;
    const pipeline = this.availablePipelines().find(p => p.id === selectedId);
    return pipeline?.name || '';
  }

  getSelectedModelName(): string {
    const selectedId = this.step5Form.get('selectedModelId')?.value;
    const model = this.modelStatuses().find(m => m.id === selectedId);
    return model?.name || '';
  }
}