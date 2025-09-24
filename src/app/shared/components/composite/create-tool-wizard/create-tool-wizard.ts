import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
import { ToolsStore, CreateToolRequest } from '../../../store/tools.store';
import { KnowledgeBasesStore } from '../../../store/knowledge-bases.store';

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
export class CreateToolWizard implements OnInit {
  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly data = inject(DIALOG_DATA, { optional: true });
  private readonly fb = inject(FormBuilder);
  private readonly toolsStore = inject(ToolsStore);
  private readonly kbStore = inject(KnowledgeBasesStore);

  readonly isSubmitting = signal(false);
  readonly toolCreated = signal<Tool | null>(null);

  // Get knowledge bases from store
  readonly knowledgeBases = this.kbStore.indexedKnowledgeBases;

  readonly toolForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    endpoint: ['', [Validators.required, Validators.pattern(/^(kb|rag)\.[a-z0-9_]+$/)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    baseOperation: ['rag.search', Validators.required],
    knowledgeBaseId: ['', Validators.required],
    topK: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    topN: [5, [Validators.required, Validators.min(1), Validators.max(20)]]
  });

  readonly baseOperations = [
    { value: 'rag.search', label: 'RAG Search' },
    { value: 'rag.answer', label: 'RAG Answer' }
  ];

  // Computed knowledge base options from store
  readonly knowledgeBaseOptions = computed(() =>
    this.knowledgeBases().map(kb => ({
      value: kb.id,
      label: `${kb.name} v${kb.version || '1.0'}`
    }))
  );

  // Lifecycle methods
  async ngOnInit() {
    // Initialize knowledge bases store if not already initialized
    if (!this.kbStore.isInitialized()) {
      await this.kbStore.initialize();
    }
  }

  getSelectedKnowledgeBase() {
    const selectedId = this.toolForm.get('knowledgeBaseId')?.value;
    return this.knowledgeBases().find(kb => kb.id === selectedId);
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
        const selectedKB = this.getSelectedKnowledgeBase();

        if (!selectedKB) {
          throw new Error('Selected knowledge base not found');
        }

        // Create tool request for the store
        const toolRequest: CreateToolRequest = {
          name: formData.name,
          endpoint: formData.endpoint,
          description: formData.description,
          baseOperation: formData.baseOperation as BaseOperation,
          knowledgeBase: {
            name: selectedKB.name,
            version: selectedKB.version || '1.0'
          },
          config: {
            topK: formData.topK,
            topN: formData.topN
          },
          permissions: ['kb.read'] // Default permissions
        };

        // Create tool via store (this will call Tauri backend)
        const newTool = await this.toolsStore.createTool(toolRequest);

        this.toolCreated.set(newTool);
        if (this.dialogRef) {
          this.dialogRef.close(newTool);
        }
      } catch (error) {
        console.error('Error creating tool:', error);
        // The error will be available in toolsStore.lastError()
        // The UI should show this error to the user
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }
}