import { Component, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Plus, X } from 'lucide-angular';
import { ContentSourceType, EmbeddingModel, CreateKBFormData } from '../../../types';
import { RagDialogComponent } from '../../semantic/overlay/rag-dialog/rag-dialog';
import { RagFormField } from '../../semantic/forms/rag-form-field/rag-form-field';
import { RagInput } from '../../atomic/primitives/rag-input/rag-input';
import { RagTextarea } from '../../atomic/primitives/rag-textarea/rag-textarea';
import { RagSelect } from '../../atomic/primitives/rag-select/rag-select';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';

interface ContentSourceOption {
  value: ContentSourceType;
  label: string;
  description: string;
}

interface EmbeddingModelOption {
  value: EmbeddingModel;
  label: string;
  description: string;
}

@Component({
  selector: 'app-create-kb-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagIcon,
    RagDialogComponent,
    RagFormField,
    RagInput,
    RagTextarea,
    RagSelect,
    RagButton
  ],
  templateUrl: './create-kb-wizard.html',
  styleUrl: './create-kb-wizard.scss'
})
export class CreateKBWizardComponent {
  readonly isOpen = signal(false);
  readonly isSubmitting = signal(false);

  readonly create = output<CreateKBFormData>();
  readonly cancel = output<void>();

  private fb = new FormBuilder();
  
  readonly kbForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    product: ['', [Validators.required, Validators.minLength(2)]],
    version: ['', [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+.*$/)]],
    description: [''],
    contentSource: ['local-folder' as ContentSourceType, [Validators.required]],
    sourceUrl: [''],
    embeddingModel: ['all-MiniLM-L6-v2' as EmbeddingModel, [Validators.required]]
  });

  readonly contentSourceOptions: ContentSourceOption[] = [
    {
      value: 'local-folder',
      label: 'Local Folder',
      description: 'Documents from a local directory'
    },
    {
      value: 'web-documentation',
      label: 'Web Documentation',
      description: 'Crawl and index web documentation'
    },
    {
      value: 'github-repository',
      label: 'GitHub Repository',
      description: 'Clone and index a GitHub repository'
    },
    {
      value: 'pdf-collection',
      label: 'PDF Collection',
      description: 'Process a collection of PDF files'
    }
  ];

  readonly embeddingModelOptions: EmbeddingModelOption[] = [
    {
      value: 'all-MiniLM-L6-v2',
      label: 'all-MiniLM-L6-v2',
      description: 'Fast, 384 dimensions - Good for general purpose'
    },
    {
      value: 'all-mpnet-base-v2',
      label: 'all-mpnet-base-v2', 
      description: 'Balanced, 768 dimensions - Better accuracy'
    },
    {
      value: 'e5-large-v2',
      label: 'e5-large-v2',
      description: 'Accurate, 1024 dimensions - Highest quality'
    }
  ];

  readonly selectedContentSource = computed(() => {
    const value = this.kbForm.get('contentSource')?.value as ContentSourceType;
    return this.contentSourceOptions.find(option => option.value === value);
  });

  readonly showSourceUrl = computed(() => {
    const contentSource = this.kbForm.get('contentSource')?.value as ContentSourceType;
    return contentSource === 'web-documentation' || contentSource === 'github-repository';
  });

  readonly sourceUrlLabel = computed(() => {
    const contentSource = this.kbForm.get('contentSource')?.value as ContentSourceType;
    if (contentSource === 'web-documentation') return 'Documentation URL';
    if (contentSource === 'github-repository') return 'Repository URL';
    return 'Source URL';
  });

  readonly sourceUrlPlaceholder = computed(() => {
    const contentSource = this.kbForm.get('contentSource')?.value as ContentSourceType;
    if (contentSource === 'web-documentation') return 'https://docs.example.com';
    if (contentSource === 'github-repository') return 'https://github.com/owner/repo';
    return '';
  });

  readonly iconComponents = {
    Plus,
    X
  };

  constructor() {
    // Update validators when content source changes
    this.kbForm.get('contentSource')?.valueChanges.subscribe((value: ContentSourceType) => {
      const sourceUrlControl = this.kbForm.get('sourceUrl');
      if (value === 'web-documentation' || value === 'github-repository') {
        sourceUrlControl?.setValidators([Validators.required, Validators.pattern(/^https?:\/\/.+/)]);
      } else {
        sourceUrlControl?.clearValidators();
      }
      sourceUrlControl?.updateValueAndValidity();
    });
  }

  open(): void {
    this.isOpen.set(true);
    this.kbForm.reset({
      name: '',
      product: '',
      version: '',
      description: '',
      contentSource: 'local-folder' as ContentSourceType,
      sourceUrl: '',
      embeddingModel: 'all-MiniLM-L6-v2' as EmbeddingModel
    });
  }

  close(): void {
    this.isOpen.set(false);
    this.isSubmitting.set(false);
    this.cancel.emit();
  }

  onSubmit(): void {
    if (this.kbForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      
      const formData: CreateKBFormData = {
        name: this.kbForm.get('name')?.value,
        product: this.kbForm.get('product')?.value,
        version: this.kbForm.get('version')?.value,
        description: this.kbForm.get('description')?.value,
        contentSource: this.kbForm.get('contentSource')?.value,
        sourceUrl: this.kbForm.get('sourceUrl')?.value,
        embeddingModel: this.kbForm.get('embeddingModel')?.value
      };

      this.create.emit(formData);
      
      // Reset submitting state after a delay (simulating API call)
      setTimeout(() => {
        this.isSubmitting.set(false);
        this.close();
      }, 1500);
    }
  }

  onCancel(): void {
    this.close();
  }

  getFieldError(fieldName: string): string | undefined {
    const control = this.kbForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['pattern']) {
        if (fieldName === 'version') return 'Version must follow semantic versioning (e.g., 1.0.0)';
        if (fieldName === 'sourceUrl') return 'Must be a valid HTTP/HTTPS URL';
      }
    }
    return undefined;
  }
}
