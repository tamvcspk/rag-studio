/*!
 * KB Pipeline Creator Component
 *
 * Replaces the KB creation wizard with Pipeline template instantiation
 * as specified in CORE_DESIGN.md Section 3.1. This component provides
 * unified KB creation through Pipeline templates, eliminating the
 * architectural overlap identified in the current system.
 */

import { Component, output, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Play, Settings, FileText, Globe, Github, FileCode } from 'lucide-angular';

import { PipelinesStore } from '../../../store/pipelines.store';
import { ModelsStore } from '../../../store/models.store';
import { PipelineTemplate } from '../../../models/pipeline.model';
import { EmbeddingModel } from '../../../store/models.store';

import { RagDialog } from '../../semantic/overlay/rag-dialog/rag-dialog';
import { RagFormField } from '../../semantic/forms/rag-form-field/rag-form-field';
import { RagModelSelector } from '../../semantic/forms/rag-model-selector/rag-model-selector';
import { RagInput } from '../../atomic/primitives/rag-input/rag-input';
import { RagTextarea } from '../../atomic/primitives/rag-textarea/rag-textarea';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';

interface TemplateOption {
  template: PipelineTemplate;
  icon: any;
  label: string;
  description: string;
  sourceLabel: string;
  sourceDescription: string;
}

interface KBCreationParameters {
  templateId: string;
  name: string;
  product: string;
  version: string;
  description: string;
  sourceUrl: string;
  embeddingModel: string;
}

@Component({
  selector: 'app-kb-pipeline-creator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagIcon,
    RagDialog,
    RagFormField,
    RagModelSelector,
    RagInput,
    RagTextarea,
    RagButton,
    RagCard
  ],
  templateUrl: './kb-pipeline-creator.html',
  styleUrl: './kb-pipeline-creator.scss'
})
export class KBPipelineCreator implements OnInit {
  readonly isSubmitting = signal(false);
  readonly isLoadingTemplates = signal(false);
  readonly selectedTemplateId = signal<string | null>(null);

  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly data = inject(DIALOG_DATA, { optional: true });
  private readonly pipelinesStore = inject(PipelinesStore);
  private readonly modelsStore = inject(ModelsStore);
  private fb = new FormBuilder();

  readonly kbForm: FormGroup = this.fb.group({
    templateId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    product: ['', [Validators.required, Validators.minLength(2)]],
    version: ['1.0.0', [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+.*$/)]],
    description: [''],
    sourceUrl: [''],
    embeddingModel: ['', [Validators.required]]
  });

  readonly templateOptions = computed<TemplateOption[]>(() => {
    const templates = this.pipelinesStore.templatesByCategory().data_ingestion || [];

    return templates.map(template => {
      let icon, sourceLabel, sourceDescription;

      switch (template.id) {
        case 'kb-creation-local-folder':
          icon = FileText;
          sourceLabel = 'Local Directory Path';
          sourceDescription = 'Path to directory containing documents';
          break;
        case 'kb-creation-web-documentation':
          icon = Globe;
          sourceLabel = 'Documentation URL';
          sourceDescription = 'Base URL for web documentation crawling';
          break;
        case 'kb-creation-github-repository':
          icon = Github;
          sourceLabel = 'Repository URL';
          sourceDescription = 'GitHub repository URL to index';
          break;
        case 'kb-creation-pdf-collection':
          icon = FileCode;
          sourceLabel = 'PDF Directory Path';
          sourceDescription = 'Directory containing PDF files';
          break;
        default:
          icon = Settings;
          sourceLabel = 'Source URL';
          sourceDescription = 'Data source location';
      }

      return {
        template,
        icon,
        label: template.name,
        description: template.description,
        sourceLabel,
        sourceDescription
      };
    });
  });

  readonly selectedTemplate = computed(() => {
    const templateId = this.selectedTemplateId();
    if (!templateId) return null;

    return this.templateOptions().find(option => option.template.id === templateId) || null;
  });

  readonly showSourceUrl = computed(() => {
    const template = this.selectedTemplate();
    if (!template) return false;

    // All KB creation templates require a source URL
    return ['kb-creation-local-folder', 'kb-creation-web-documentation',
            'kb-creation-github-repository', 'kb-creation-pdf-collection']
           .includes(template.template.id);
  });

  readonly sourceUrlValidators = computed(() => {
    const template = this.selectedTemplate();
    if (!template) return [];

    const validators = [Validators.required];

    switch (template.template.id) {
      case 'kb-creation-web-documentation':
      case 'kb-creation-github-repository':
        validators.push(Validators.pattern(/^https?:\/\/.+/));
        break;
      case 'kb-creation-local-folder':
      case 'kb-creation-pdf-collection':
        // Local path validation could be added here
        break;
    }

    return validators;
  });

  readonly iconComponents = {
    Play,
    Settings,
    FileText,
    Globe,
    Github,
    FileCode
  };

  async ngOnInit() {
    // Initialize stores
    await this.pipelinesStore.initialize();
    // Note: ModelsStore initializes automatically in constructor

    // Load templates
    this.isLoadingTemplates.set(true);
    try {
      await this.pipelinesStore.loadTemplates();
    } catch (error) {
      console.error('Failed to load pipeline templates:', error);
    } finally {
      this.isLoadingTemplates.set(false);
    }

    // Watch for template selection changes
    this.kbForm.get('templateId')?.valueChanges.subscribe((templateId: string) => {
      this.selectedTemplateId.set(templateId);
      this.updateSourceUrlValidation();
    });
  }

  private updateSourceUrlValidation(): void {
    const sourceUrlControl = this.kbForm.get('sourceUrl');
    if (!sourceUrlControl) return;

    sourceUrlControl.clearValidators();
    sourceUrlControl.setValidators(this.sourceUrlValidators());
    sourceUrlControl.updateValueAndValidity();
  }

  selectTemplate(templateId: string): void {
    this.kbForm.patchValue({ templateId });
  }

  cancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.kbForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      try {
        const formData: KBCreationParameters = {
          templateId: this.kbForm.get('templateId')?.value,
          name: this.kbForm.get('name')?.value,
          product: this.kbForm.get('product')?.value,
          version: this.kbForm.get('version')?.value,
          description: this.kbForm.get('description')?.value,
          sourceUrl: this.kbForm.get('sourceUrl')?.value,
          embeddingModel: this.kbForm.get('embeddingModel')?.value
        };

        // Create and execute pipeline from template
        const pipeline = await this.pipelinesStore.createFromTemplate(
          formData.templateId,
          `KB: ${formData.name}`,
          {
            name: formData.name,
            product: formData.product,
            version: formData.version,
            description: formData.description,
            sourceUrl: formData.sourceUrl,
            embeddingModel: formData.embeddingModel
          }
        );

        if (pipeline) {
          // Execute the pipeline to create the KB
          const run = await this.pipelinesStore.executePipeline({
            pipelineId: pipeline.id,
            parameters: {
              name: formData.name,
              product: formData.product,
              version: formData.version,
              description: formData.description,
              sourceUrl: formData.sourceUrl,
              embeddingModel: formData.embeddingModel
            },
            triggeredBy: {
              type: 'manual',
              userId: 'user',
              source: 'kb-creation'
            }
          });

          // Close dialog with pipeline run result
          if (this.dialogRef) {
            this.dialogRef.close({
              type: 'pipeline-execution',
              pipeline,
              run,
              kbParameters: formData
            });
          }
        }
      } catch (error) {
        console.error('Error creating knowledge base via pipeline:', error);
        // TODO: Show error toast/notification
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  getFieldError(fieldName: string): string | undefined {
    const control = this.kbForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['pattern']) {
        if (fieldName === 'version') return 'Version must follow semantic versioning (e.g., 1.0.0)';
        if (fieldName === 'sourceUrl') return 'Must be a valid URL or path';
      }
    }
    return undefined;
  }

  getSourceUrlPlaceholder(): string {
    const template = this.selectedTemplate();
    if (!template) return 'Enter source path or URL';

    switch (template.template.id) {
      case 'kb-creation-local-folder':
      case 'kb-creation-pdf-collection':
        return 'e.g., C:\\Documents\\MyFolder';
      case 'kb-creation-web-documentation':
        return 'e.g., https://docs.example.com';
      case 'kb-creation-github-repository':
        return 'e.g., https://github.com/user/repo';
      default:
        return 'Enter source path or URL';
    }
  }
}