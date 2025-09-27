import { Component, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Upload, X, FileText, CheckCircle, AlertCircle, Download } from 'lucide-angular';
import { RagDialog } from '../../semantic/overlay/rag-dialog/rag-dialog';
import { RagFormField } from '../../semantic/forms/rag-form-field/rag-form-field';
import { RagInput } from '../../atomic/primitives/rag-input/rag-input';
import { RagTextarea } from '../../atomic/primitives/rag-textarea/rag-textarea';
import { RagSelect } from '../../atomic/primitives/rag-select/rag-select';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';

export interface ModelImportFormData {
  name: string;
  description: string;
  model_type: 'embedding' | 'reranking' | 'combined';
  source: 'huggingface' | 'local' | 'manual';
  source_url?: string;
  local_file?: File;
  compatibility: string[];
}

export interface ImportFileValidation {
  file: File;
  isValid: boolean;
  errors: string[];
  size: number;
  type: string;
}

@Component({
  selector: 'app-model-import-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DragDropModule,
    RagIcon,
    RagDialog,
    RagFormField,
    RagInput,
    RagTextarea,
    RagSelect,
    RagButton,
    RagChip,
    RagCard
  ],
  templateUrl: './model-import-wizard.html',
  styleUrl: './model-import-wizard.scss'
})
export class ModelImportWizard {
  readonly isSubmitting = signal(false);
  readonly isValidating = signal(false);
  readonly dragOver = signal(false);
  readonly selectedFiles = signal<ImportFileValidation[]>([]);

  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly data = inject(DIALOG_DATA, { optional: true });
  private fb = new FormBuilder();

  readonly importForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    model_type: ['embedding' as const, [Validators.required]],
    source: ['local' as const, [Validators.required]],
    source_url: [''],
    compatibility: [['python'], [Validators.required]]
  });

  readonly modelTypeOptions = [
    { value: 'embedding', label: 'Embedding Model', description: 'Generate vector embeddings for documents' },
    { value: 'reranking', label: 'Reranking Model', description: 'Rerank search results for improved relevance' },
    { value: 'combined', label: 'Combined Model', description: 'Both embedding and reranking capabilities' }
  ];

  readonly sourceOptions = [
    { value: 'huggingface', label: 'Hugging Face', description: 'Download from Hugging Face Hub' },
    { value: 'local', label: 'Local File', description: 'Upload model files from your computer' },
    { value: 'manual', label: 'Manual Configuration', description: 'Configure model manually without files' }
  ];

  readonly compatibilityOptions = [
    { value: 'python', label: 'Python' },
    { value: 'rust', label: 'Rust' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'onnx', label: 'ONNX' }
  ];

  readonly iconComponents = {
    Upload,
    X,
    FileText,
    CheckCircle,
    AlertCircle,
    Download
  };

  readonly showFileUpload = computed(() => {
    return this.importForm.get('source')?.value === 'local';
  });

  readonly showUrlInput = computed(() => {
    return this.importForm.get('source')?.value === 'huggingface';
  });

  readonly totalFileSize = computed(() => {
    return this.selectedFiles().reduce((total, file) => total + file.size, 0);
  });

  readonly validFiles = computed(() => {
    return this.selectedFiles().filter(file => file.isValid);
  });

  readonly invalidFiles = computed(() => {
    return this.selectedFiles().filter(file => !file.isValid);
  });

  readonly canSubmit = computed(() => {
    const formValid = this.importForm.valid;
    const source = this.importForm.get('source')?.value;

    if (source === 'local') {
      return formValid && this.validFiles().length > 0 && this.invalidFiles().length === 0;
    }

    return formValid;
  });

  readonly sourceDescription = computed(() => {
    const source = this.importForm.get('source')?.value;
    return this.sourceOptions.find(o => o.value === source)?.description || '';
  });

  constructor() {
    // Update validators when source changes
    this.importForm.get('source')?.valueChanges.subscribe((value: string) => {
      const sourceUrlControl = this.importForm.get('source_url');
      if (value === 'huggingface') {
        sourceUrlControl?.setValidators([Validators.required, Validators.pattern(/^https?:\/\/.+/)]);
      } else {
        sourceUrlControl?.clearValidators();
      }
      sourceUrlControl?.updateValueAndValidity();
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);

    const files = Array.from(event.dataTransfer?.files || []);
    this.handleFiles(files);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.handleFiles(files);
  }

  private async handleFiles(files: File[]): Promise<void> {
    this.isValidating.set(true);

    try {
      const validatedFiles = await Promise.all(
        files.map(file => this.validateFile(file))
      );

      this.selectedFiles.update(existing => [
        ...existing,
        ...validatedFiles
      ]);
    } finally {
      this.isValidating.set(false);
    }
  }

  private async validateFile(file: File): Promise<ImportFileValidation> {
    const validation: ImportFileValidation = {
      file,
      isValid: true,
      errors: [],
      size: file.size,
      type: file.type || this.getFileTypeFromExtension(file.name)
    };

    // Check file size (max 5GB)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      validation.isValid = false;
      validation.errors.push(`File size exceeds 5GB limit (${this.formatFileSize(file.size)})`);
    }

    // Check file extension
    const allowedExtensions = [
      '.bin', '.safetensors', '.pt', '.pth', '.onnx',
      '.json', '.txt', '.cfg', '.yaml', '.yml'
    ];
    const fileExtension = this.getFileExtension(file.name);
    if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
      validation.isValid = false;
      validation.errors.push(`Unsupported file type: ${fileExtension}`);
    }

    // Check for required files (basic validation)
    if (fileExtension === '.json') {
      try {
        const content = await this.readFileContent(file);
        JSON.parse(content);
      } catch {
        validation.isValid = false;
        validation.errors.push('Invalid JSON file');
      }
    }

    return validation;
  }

  private getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }

  private getFileTypeFromExtension(filename: string): string {
    const ext = this.getFileExtension(filename).toLowerCase();
    const typeMap: Record<string, string> = {
      '.bin': 'application/octet-stream',
      '.safetensors': 'application/octet-stream',
      '.pt': 'application/octet-stream',
      '.pth': 'application/octet-stream',
      '.onnx': 'application/octet-stream',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.cfg': 'text/plain',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml'
    };
    return typeMap[ext] || 'application/octet-stream';
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  removeFile(index: number): void {
    this.selectedFiles.update(files => files.filter((_, i) => i !== index));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileIcon(file: ImportFileValidation): any {
    const ext = this.getFileExtension(file.file.name).toLowerCase();
    if (['.json', '.yaml', '.yml', '.cfg', '.txt'].includes(ext)) {
      return this.iconComponents.FileText;
    }
    return this.iconComponents.Upload;
  }

  cancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.canSubmit() && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      try {
        const formData: ModelImportFormData = {
          name: this.importForm.get('name')?.value,
          description: this.importForm.get('description')?.value,
          model_type: this.importForm.get('model_type')?.value,
          source: this.importForm.get('source')?.value,
          source_url: this.importForm.get('source_url')?.value,
          compatibility: this.importForm.get('compatibility')?.value,
          local_file: this.validFiles()[0]?.file
        };

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Close dialog with form data as result
        if (this.dialogRef) {
          this.dialogRef.close(formData);
        }
      } catch (error) {
        console.error('Error importing model:', error);
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  getFieldError(fieldName: string): string | undefined {
    const control = this.importForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['pattern']) {
        if (fieldName === 'source_url') return 'Must be a valid HTTP/HTTPS URL';
      }
    }
    return undefined;
  }
}