import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X } from 'lucide-angular';
import { RagDialogComponent } from '../../semantic/overlay/rag-dialog/rag-dialog';
import { RagFormField } from '../../semantic/forms/rag-form-field/rag-form-field';
import { RagInput } from '../../atomic/primitives/rag-input/rag-input';
import { RagTextarea } from '../../atomic/primitives/rag-textarea/rag-textarea';
import { RagSelect } from '../../atomic/primitives/rag-select/rag-select';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { Tool, BaseOperation } from '../../../types/tool.types';

interface CreateToolData {
  name: string;
  endpoint: string;
  description: string;
  baseOperation: BaseOperation;
  knowledgeBaseId: string;
  topK: number;
  topN: number;
}

interface KnowledgeBase {
  id: string;
  name: string;
  version: string;
  displayName: string;
}

@Component({
  selector: 'app-create-tool-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    RagDialogComponent,
    RagFormField,
    RagInput,
    RagTextarea,
    RagSelect,
    RagButton
  ],
  templateUrl: './create-tool-wizard.html',
  styleUrl: './create-tool-wizard.scss'
})
export class CreateToolWizardComponent {
  readonly isOpen = signal(false);
  readonly isSubmitting = signal(false);
  
  readonly onClose = output<void>();
  readonly onSubmit = output<CreateToolData>();
  
  readonly X = X;
  
  readonly toolForm: FormGroup;
  
  // Mock data for dropdowns
  readonly baseOperations = [
    { value: 'rag.search', label: 'rag.search - Return search results with citations' },
    { value: 'rag.answer', label: 'rag.answer - Generate answers with citations' }
  ];
  
  readonly knowledgeBases: KnowledgeBase[] = [
    { id: '1', name: 'angular', version: '14.2.0', displayName: 'angular@14.2.0' },
    { id: '2', name: 'react', version: '18.2.0', displayName: 'react@18.2.0' },
    { id: '3', name: 'vue', version: '3.3.0', displayName: 'vue@3.3.0' },
    { id: '4', name: 'python', version: '3.11', displayName: 'python@3.11' }
  ];

  readonly knowledgeBaseOptions = this.knowledgeBases.map(kb => ({ 
    value: kb.id, 
    label: kb.displayName 
  }));

  constructor(private fb: FormBuilder) {
    this.toolForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      endpoint: ['', [Validators.required, Validators.pattern(/^tool\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      baseOperation: ['rag.search', Validators.required],
      knowledgeBaseId: ['', Validators.required],
      topK: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
      topN: [8, [Validators.required, Validators.min(1), Validators.max(50)]]
    });

    // Subscribe to name changes for auto-generating endpoint
    this.toolForm.get('name')?.valueChanges.subscribe(name => {
      if (name && !this.toolForm.get('endpoint')?.dirty) {
        const suggested = this.generateEndpointSuggestion(name);
        this.toolForm.patchValue({ endpoint: suggested });
      }
    });
  }

  open() {
    this.isOpen.set(true);
    this.toolForm.reset({
      name: '',
      endpoint: '',
      description: '',
      baseOperation: 'rag.search',
      knowledgeBaseId: '',
      topK: 100,
      topN: 8
    });
  }

  close() {
    this.isOpen.set(false);
    this.onClose.emit();
  }

  async onFormSubmit() {
    if (this.toolForm.invalid) {
      this.toolForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    
    try {
      const formData = this.toolForm.value as CreateToolData;
      this.onSubmit.emit(formData);
      this.close();
    } finally {
      this.isSubmitting.set(false);
    }
  }


  private generateEndpointSuggestion(name: string): string {
    // Convert name to kebab-case and create endpoint suggestion
    const kebabName = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const baseOp = this.toolForm.get('baseOperation')?.value === 'rag.search' ? 'search' : 'answer';
    return `tool.${kebabName}.${baseOp}`;
  }

  getSelectedKnowledgeBase(): KnowledgeBase | undefined {
    const selectedId = this.toolForm.get('knowledgeBaseId')?.value;
    return this.knowledgeBases.find(kb => kb.id === selectedId);
  }
}
