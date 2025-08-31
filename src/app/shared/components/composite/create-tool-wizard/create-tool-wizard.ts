import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { LucideAngularModule, X } from 'lucide-angular';
import { RagDialog } from '../../semantic/overlay/rag-dialog/rag-dialog';
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

/**
 * Create Tool Wizard Dialog Component.
 * Opens via RagDialogService.open() and uses rag-dialog as a template wrapper.
 */
@Component({
  selector: 'app-create-tool-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    RagDialog,
    RagFormField,
    RagInput,
    RagTextarea,
    RagSelect,
    RagButton
  ],
  templateUrl: './create-tool-wizard.html',
  styleUrl: './create-tool-wizard.scss'
})
export class CreateToolWizard {
  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly data = inject(DIALOG_DATA, { optional: true });
  private readonly fb = inject(FormBuilder);

  readonly isSubmitting = signal(false);
  readonly toolCreated = signal<Tool | null>(null);

  // Mock data - replace with actual service calls
  readonly mockKnowledgeBases: KnowledgeBase[] = [
    { id: 'kb1', name: 'angular-docs', version: '1.0.0', displayName: 'Angular Documentation v1.0.0' },
    { id: 'kb2', name: 'react-docs', version: '1.0.0', displayName: 'React Documentation v1.0.0' },
    { id: 'kb3', name: 'vue-docs', version: '1.0.0', displayName: 'Vue Documentation v1.0.0' }
  ];

  readonly toolForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    endpoint: ['', [Validators.required, Validators.pattern(/^tool\.[a-z0-9-]+\.[a-z0-9-]+$/)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    baseOperation: ['search', Validators.required],
    knowledgeBaseId: ['', Validators.required],
    topK: [20, [Validators.required, Validators.min(1), Validators.max(1000)]],
    topN: [5, [Validators.required, Validators.min(1), Validators.max(50)]]
  });

  readonly baseOperations = [
    { value: 'search', label: 'Search' },
    { value: 'answer', label: 'Answer' },
    { value: 'summarize', label: 'Summarize' },
    { value: 'extract', label: 'Extract' }
  ];

  readonly knowledgeBaseOptions = this.mockKnowledgeBases.map(kb => ({
    value: kb.id,
    label: kb.displayName
  }));

  getSelectedKnowledgeBase(): KnowledgeBase | undefined {
    const selectedId = this.toolForm.get('knowledgeBaseId')?.value;
    return this.mockKnowledgeBases.find(kb => kb.id === selectedId);
  }

  cancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  async onFormSubmit(): Promise<void> {
    if (this.toolForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      
      try {
        const formData: CreateToolData = this.toolForm.value;
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const selectedKB = this.getSelectedKnowledgeBase();
        const newTool: Tool = {
          id: `tool-${Date.now()}`,
          name: formData.name,
          endpoint: formData.endpoint,
          description: formData.description,
          status: 'ACTIVE',
          baseOperation: formData.baseOperation as 'rag.search' | 'rag.answer',
          knowledgeBase: {
            name: selectedKB?.name || '',
            version: selectedKB?.version || ''
          },
          config: {
            topK: formData.topK,
            topN: formData.topN
          },
          permissions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.toolCreated.set(newTool);
        if (this.dialogRef) {
          this.dialogRef.close(newTool);
        }
      } catch (error) {
        console.error('Error creating tool:', error);
        // Handle error (could emit error event or show notification)
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }
}