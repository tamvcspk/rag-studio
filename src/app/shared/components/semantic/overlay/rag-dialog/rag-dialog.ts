import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { X } from 'lucide-angular';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

/**
 * RagDialog component that provides RAG Studio dialog styling and structure.
 * Use this component as a wrapper in your dialog components for consistent styling.
 * 
 * @example
 * ```typescript
 * @Component({
 *   template: `
 *     <rag-dialog 
 *       [title]="'My Dialog'" 
 *       [description]="'Dialog description'"
 *       [showCloseButton]="true">
 *       <!-- Your dialog content here -->
 *       <div slot="footer">
 *         <button (click)="save()">Save</button>
 *       </div>
 *     </rag-dialog>
 *   `
 * })
 * export class MyDialogComponent {}
 * ```
 */
@Component({
  selector: 'rag-dialog',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-dialog.html',
  styleUrl: './rag-dialog.scss'
})
export class RagDialog {
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');
  readonly showCloseButton = input<boolean>(true);

  readonly close = output<void>();

  // Icon constants
  readonly XIcon = X;
  
  // Inject dialog reference if available (when used via service)
  private readonly dialogRef = inject(DialogRef, { optional: true });

  get contentClasses(): string {
    return [
      'rt-DialogContent',
      `rt-size-${this.size()}`
    ].filter(Boolean).join(' ');
  }

  closeDialog(): void {
    this.close.emit();
    
    // Close the dialog if opened via service
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}