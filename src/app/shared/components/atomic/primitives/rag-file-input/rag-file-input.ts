import {
  Component,
  computed,
  effect,
  forwardRef,
  input,
  output,
  signal,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../rag-icon/rag-icon';
import { UploadIcon, FileIcon, XIcon } from 'lucide-angular';
import { RagAlert } from '../../feedback';

export type RagFileInputSize = 'sm' | 'md' | 'lg';
export type RagFileInputVariant = 'default' | 'dashed' | 'solid';

@Component({
  selector: 'rag-file-input',
  standalone: true,
  imports: [CommonModule, RagIcon, RagAlert],
  templateUrl: './rag-file-input.html',
  styleUrls: ['./rag-file-input.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagFileInput),
      multi: true
    }
  ]
})
export class RagFileInput implements ControlValueAccessor {
  @ViewChild('fileInput', { static: true }) fileInput!: ElementRef<HTMLInputElement>;

  // Input properties
  readonly accept = input<string>('');
  readonly multiple = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly placeholder = input<string>('Choose files...');
  readonly size = input<RagFileInputSize>('md');
  readonly variant = input<RagFileInputVariant>('default');
  readonly maxFiles = input<number | undefined>(undefined);
  readonly maxFileSize = input<number | undefined>(undefined); // in bytes
  readonly showFileList = input<boolean>(true);
  readonly clearable = input<boolean>(true);
  readonly dragDrop = input<boolean>(true);

  // Output events
  readonly filesChange = output<FileList | null>();
  readonly filesSelected = output<File[]>();
  readonly fileRemoved = output<File>();
  readonly onError = output<string>();

  // Internal state
  private readonly _files = signal<File[]>([]);
  private readonly _isDragOver = signal<boolean>(false);
  private readonly _errorMessage = signal<string>('');
  private readonly _showError = signal<boolean>(false);

  // Computed properties
  readonly files = computed(() => this._files());
  readonly isDragOver = computed(() => this._isDragOver());
  readonly errorMessage = computed(() => this._errorMessage());
  readonly showError = computed(() => this._showError());
  readonly hasFiles = computed(() => this._files().length > 0);
  readonly fileCount = computed(() => this._files().length);

  readonly containerClasses = computed(() => [
    'rag-file-input',
    `rag-file-input--${this.size()}`,
    `rag-file-input--${this.variant()}`,
    this.disabled() ? 'rag-file-input--disabled' : '',
    this.isDragOver() ? 'rag-file-input--drag-over' : '',
    this.showError() ? 'rag-file-input--error' : '',
    this.hasFiles() ? 'rag-file-input--has-files' : ''
  ].filter(Boolean).join(' '));

  readonly placeholderText = computed(() => {
    if (this.hasFiles()) {
      const count = this.fileCount();
      return this.multiple()
        ? `${count} file${count !== 1 ? 's' : ''} selected`
        : this.files()[0]?.name || 'File selected';
    }
    return this.placeholder();
  });

  // Icons
  readonly UploadIcon = UploadIcon;
  readonly FileIcon = FileIcon;
  readonly XIcon = XIcon;

  // Form control integration
  private onChange = (files: FileList | null) => {};
  private onTouched = () => {};

  // File input change handler
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    this._handleFiles(files);
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    if (!this.dragDrop() || this.disabled()) return;

    event.preventDefault();
    event.stopPropagation();
    this._isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    if (!this.dragDrop() || this.disabled()) return;

    event.preventDefault();
    event.stopPropagation();
    this._isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    if (!this.dragDrop() || this.disabled()) return;

    event.preventDefault();
    event.stopPropagation();
    this._isDragOver.set(false);

    const files = event.dataTransfer?.files;
    this._handleFiles(files);
  }

  // Click handler to trigger file input
  triggerFileSelect(): void {
    if (this.disabled()) return;
    this.fileInput.nativeElement.click();
  }

  // Remove specific file
  removeFile(file: File): void {
    if (this.disabled()) return;

    const currentFiles = this._files();
    const updatedFiles = currentFiles.filter(f => f !== file);
    this._files.set(updatedFiles);
    this.fileRemoved.emit(file);
    this._updateFormControl();
    this._clearError();
  }

  // Clear all files
  clearFiles(): void {
    if (this.disabled()) return;

    this._files.set([]);
    this.fileInput.nativeElement.value = '';
    this._updateFormControl();
    this._clearError();
  }

  // Dismiss error alert
  dismissError(): void {
    this._clearError();
  }

  // Private methods
  private _handleFiles(fileList: FileList | null | undefined): void {
    if (!fileList || fileList.length === 0) {
      this._files.set([]);
      this._updateFormControl();
      return;
    }

    const files = Array.from(fileList);
    const validFiles: File[] = [];

    // Validate each file before adding
    for (const file of files) {
      const validationError = this._validateSingleFile(file);
      if (validationError) {
        this._showErrorMessage(validationError);
        // Reset file input to clear the invalid selection
        this.fileInput.nativeElement.value = '';
        return; // Stop processing and don't add any files
      }
      validFiles.push(file);
    }

    // Check total file count after validation
    if (this.multiple()) {
      const currentFiles = this._files();
      const allFiles = [...currentFiles, ...validFiles];
      const maxFiles = this.maxFiles();

      if (maxFiles !== undefined && allFiles.length > maxFiles) {
        this._showErrorMessage(`Maximum ${maxFiles} file${maxFiles !== 1 ? 's' : ''} allowed`);
        this.fileInput.nativeElement.value = '';
        return;
      }

      this._files.set(allFiles);
    } else {
      // Single file mode - take only the first valid file
      this._files.set([validFiles[0]]);
    }

    this._clearError();
    this.filesSelected.emit(this._files());
    this._updateFormControl();
  }

  private _validateSingleFile(file: File): string | null {
    const maxFileSize = this.maxFileSize();
    const accept = this.accept();

    // Validate file size
    if (maxFileSize !== undefined && file.size > maxFileSize) {
      const sizeMB = Math.round(maxFileSize / (1024 * 1024));
      return `File "${file.name}" exceeds ${sizeMB}MB limit`;
    }

    // Validate file type
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isValidType = acceptedTypes.some(acceptedType => {
        if (acceptedType.startsWith('.')) {
          return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
        }
        return file.type.match(acceptedType.replace('*', '.*'));
      });

      if (!isValidType) {
        return `File "${file.name}" is not an accepted file type`;
      }
    }

    return null;
  }

  private _showErrorMessage(message: string): void {
    this._errorMessage.set(message);
    this._showError.set(true);
    this.onError.emit(message);
  }

  private _clearError(): void {
    this._errorMessage.set('');
    this._showError.set(false);
  }

  private _updateFormControl(): void {
    const files = this._files();
    const fileList = this._createFileList(files);
    this.filesChange.emit(fileList);
    this.onChange(fileList);
    this.onTouched();
  }

  private _createFileList(files: File[]): FileList | null {
    if (files.length === 0) return null;

    // Create a DataTransfer object to simulate FileList
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
  }

  // ControlValueAccessor implementation
  writeValue(value: FileList | null): void {
    if (value) {
      this._files.set(Array.from(value));
    } else {
      this._files.set([]);
    }
    this._clearError();
  }

  registerOnChange(fn: (files: FileList | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Disabled state is handled through the disabled input
  }

  // Utility method to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}