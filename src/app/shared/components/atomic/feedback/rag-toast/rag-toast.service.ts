import { Injectable, ComponentRef, inject, signal } from '@angular/core';
import { Overlay, OverlayRef, OverlayConfig, GlobalPositionStrategy } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { RagToast, RagToastAction } from './rag-toast';

export interface RagToastConfig {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  dismissible?: boolean;
  actions?: RagToastAction[];
}

interface RagToastInstance {
  id: string;
  overlayRef: OverlayRef;
  componentRef: ComponentRef<RagToast>;
  config: RagToastConfig;
  position: number;
}

@Injectable({
  providedIn: 'root'
})
export class RagToastService {
  private readonly overlay = inject(Overlay);
  
  private readonly toasts = signal<RagToastInstance[]>([]);
  private toastCounter = 0;
  private readonly TOAST_HEIGHT = 80; // Approximate height including gap
  private readonly INITIAL_TOP_OFFSET = 16; // Top offset from screen edge
  private readonly GAP_BETWEEN_TOASTS = 12; // Gap between stacked toasts

  show(config: RagToastConfig): string {
    const id = `toast-${++this.toastCounter}`;
    const position = this.calculateNextPosition();
    
    const overlayRef = this.createOverlay(position);
    const portal = new ComponentPortal(RagToast);
    const componentRef = overlayRef.attach(portal);

    // Configure the toast component inputs
    const instance = componentRef.instance;
    
    // Set component inputs using setInput method
    componentRef.setInput('variant', config.variant || 'info');
    componentRef.setInput('title', config.title);
    componentRef.setInput('message', config.message);
    componentRef.setInput('duration', config.duration ?? 5000);
    componentRef.setInput('persistent', config.persistent ?? false);
    componentRef.setInput('dismissible', config.dismissible ?? true);
    componentRef.setInput('actions', config.actions || []);

    // Handle dismiss event
    instance.onDismiss.subscribe(() => {
      this.dismiss(id);
    });

    const toastInstance: RagToastInstance = {
      id,
      overlayRef,
      componentRef,
      config,
      position
    };

    // Add to active toasts
    this.toasts.update(toasts => [...toasts, toastInstance]);

    // Auto-dismiss if not persistent and has duration
    if (!config.persistent && (config.duration ?? 5000) > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, config.duration ?? 5000);
    }

    return id;
  }

  dismiss(id: string): void {
    const currentToasts = this.toasts();
    const toastIndex = currentToasts.findIndex(toast => toast.id === id);
    
    if (toastIndex === -1) return;

    const toast = currentToasts[toastIndex];
    
    // Trigger exit animation
    toast.componentRef.instance.dismiss();

    // Wait for animation to complete, then clean up
    setTimeout(() => {
      toast.overlayRef.dispose();
      
      // Remove from active toasts
      this.toasts.update(toasts => toasts.filter(t => t.id !== id));
      
      // Reposition remaining toasts
      this.repositionToasts();
    }, 350); // Slightly longer than animation duration
  }

  dismissAll(): void {
    const currentToasts = this.toasts();
    currentToasts.forEach(toast => this.dismiss(toast.id));
  }

  // Convenience methods for different toast types
  info(message: string, title?: string, config?: Partial<RagToastConfig>): string {
    return this.show({
      variant: 'info',
      message,
      title,
      ...config
    });
  }

  success(message: string, title?: string, config?: Partial<RagToastConfig>): string {
    return this.show({
      variant: 'success',
      message,
      title,
      ...config
    });
  }

  warning(message: string, title?: string, config?: Partial<RagToastConfig>): string {
    return this.show({
      variant: 'warning',
      message,
      title,
      ...config
    });
  }

  error(message: string, title?: string, config?: Partial<RagToastConfig>): string {
    return this.show({
      variant: 'error',
      message,
      title,
      persistent: true, // Error toasts are persistent by default
      ...config
    });
  }

  private createOverlay(topPosition: number): OverlayRef {
    const positionStrategy: GlobalPositionStrategy = this.overlay
      .position()
      .global()
      .top(`${topPosition}px`)
      .right('16px');

    const overlayConfig: OverlayConfig = {
      positionStrategy,
      hasBackdrop: false,
      panelClass: 'toast-overlay-panel'
    };

    return this.overlay.create(overlayConfig);
  }

  private calculateNextPosition(): number {
    const activeToasts = this.toasts();
    if (activeToasts.length === 0) {
      return this.INITIAL_TOP_OFFSET;
    }

    // Stack toasts vertically
    return this.INITIAL_TOP_OFFSET + (activeToasts.length * (this.TOAST_HEIGHT + this.GAP_BETWEEN_TOASTS));
  }

  private repositionToasts(): void {
    const currentToasts = this.toasts();
    
    currentToasts.forEach((toast, index) => {
      const newPosition = this.INITIAL_TOP_OFFSET + (index * (this.TOAST_HEIGHT + this.GAP_BETWEEN_TOASTS));
      
      // Update overlay position
      const positionStrategy = toast.overlayRef.getConfig().positionStrategy as GlobalPositionStrategy;
      if (positionStrategy && typeof positionStrategy.top === 'function') {
        positionStrategy.top(`${newPosition}px`);
        toast.overlayRef.updatePosition();
      }
      
      toast.position = newPosition;
    });
  }
}