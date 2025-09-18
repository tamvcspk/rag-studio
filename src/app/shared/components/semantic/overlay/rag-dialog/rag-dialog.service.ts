import { Injectable, inject, ComponentRef } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { RagDialogConfig } from './rag-dialog-config';

/**
 * Service for opening rag-dialogs.
 * Opens components directly using Angular CDK Dialog with RAG Studio styling.
 */
@Injectable({
  providedIn: 'root'
})
export class RagDialogService {
  private readonly cdkDialog = inject(Dialog);

  /**
   * Opens a dialog with the given component and configuration.
   * 
   * @param component The component class to render in the dialog
   * @param config Configuration for the dialog
   * @returns Reference to the opened dialog
   */
  open<T = any, R = any>(
    component: ComponentType<T>,
    config: RagDialogConfig<T> = {}
  ): DialogRef<R, T> {
    // Merge default configuration
    const dialogConfig: RagDialogConfig<T> = {
      size: 'md',
      showCloseButton: true,
      closeOnEscape: true,
      closeOnClickOutside: true,
      ...config
    };

    // Create CDK dialog configuration
    const cdkConfig: DialogConfig = {
      data: dialogConfig.data,
      disableClose: dialogConfig.disableClose || (!dialogConfig.closeOnEscape && !dialogConfig.closeOnClickOutside),
      hasBackdrop: true,
      backdropClass: this.buildBackdropClasses(dialogConfig),
      panelClass: this.buildPanelClasses(dialogConfig),
      closeOnNavigation: dialogConfig.closeOnEscape !== false,
      width: dialogConfig.width,
      height: dialogConfig.height,
      minWidth: dialogConfig.minWidth,
      minHeight: dialogConfig.minHeight,
      maxWidth: dialogConfig.maxWidth || '95vw',
      maxHeight: dialogConfig.maxHeight || '95vh'
    };

    // Open the dialog with the component directly
    const cdkDialogRef = this.cdkDialog.open(component, cdkConfig as any);

    // Handle backdrop clicks if configured to not close
    if (!dialogConfig.closeOnClickOutside) {
      cdkDialogRef.backdropClick.subscribe((event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      });
    }

    // Inject dialog configuration into the component instance
    if (cdkDialogRef.componentInstance) {
      const instance = cdkDialogRef.componentInstance as any;
      
      // Inject common dialog properties if they exist on the component
      if ('title' in instance && dialogConfig.title) {
        instance.title = dialogConfig.title;
      }
      if ('description' in instance && dialogConfig.description) {
        instance.description = dialogConfig.description;
      }
      if ('size' in instance) {
        instance.size = dialogConfig.size;
      }
      if ('showCloseButton' in instance) {
        instance.showCloseButton = dialogConfig.showCloseButton;
      }
      if ('dialogRef' in instance) {
        instance.dialogRef = cdkDialogRef;
      }
      if ('config' in instance) {
        instance.config = dialogConfig;
      }
    }

    return cdkDialogRef as DialogRef<R, T>;
  }

  /**
   * Closes all currently open dialogs.
   */
  closeAll(): void {
    this.cdkDialog.closeAll();
  }

  /**
   * Gets an array of the currently open dialogs.
   */
  get openDialogs(): readonly DialogRef<any>[] {
    return this.cdkDialog.openDialogs;
  }

  /**
   * Builds CSS classes for the dialog backdrop.
   */
  private buildBackdropClasses(config: RagDialogConfig): string[] {
    const classes = ['rag-dialog-backdrop'];
    
    if (config.backdropClass) {
      if (Array.isArray(config.backdropClass)) {
        classes.push(...config.backdropClass);
      } else {
        classes.push(config.backdropClass);
      }
    }

    return classes;
  }

  /**
   * Builds CSS classes for the dialog panel.
   */
  private buildPanelClasses(config: RagDialogConfig): string[] {
    const classes = ['rag-dialog-panel', `rag-dialog-${config.size}`];
    
    if (config.panelClass) {
      if (Array.isArray(config.panelClass)) {
        classes.push(...config.panelClass);
      } else {
        classes.push(config.panelClass);
      }
    }

    return classes;
  }
}