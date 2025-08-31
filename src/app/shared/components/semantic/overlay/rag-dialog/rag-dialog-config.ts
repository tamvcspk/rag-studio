/**
 * Configuration for opening a rag-dialog.
 */
export interface RagDialogConfig<D = any> {
  /** Data to pass to the dialog component */
  data?: D;

  /** Dialog title */
  title?: string;

  /** Dialog description */
  description?: string;

  /** Dialog size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /** Whether to show the close button */
  showCloseButton?: boolean;

  /** Whether the dialog can be closed by pressing ESC */
  closeOnEscape?: boolean;

  /** Whether the dialog can be closed by clicking outside */
  closeOnClickOutside?: boolean;

  /** Custom CSS classes to apply to the dialog */
  panelClass?: string | string[];

  /** Custom CSS classes to apply to the backdrop */
  backdropClass?: string | string[];

  /** Whether to disable closing the dialog */
  disableClose?: boolean;

  /** Custom width for the dialog */
  width?: string;

  /** Custom height for the dialog */
  height?: string;

  /** Minimum width of the dialog */
  minWidth?: string;

  /** Minimum height of the dialog */
  minHeight?: string;

  /** Maximum width of the dialog */
  maxWidth?: string;

  /** Maximum height of the dialog */
  maxHeight?: string;
}