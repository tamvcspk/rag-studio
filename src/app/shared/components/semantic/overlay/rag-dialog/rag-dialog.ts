import { Component, input, output, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'rag-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './rag-dialog.html',
  styleUrl: './rag-dialog.scss'
})
export class RagDialogComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');
  readonly showCloseButton = input<boolean>(true);
  readonly closeOnEscape = input<boolean>(true);
  readonly closeOnClickOutside = input<boolean>(true);
  readonly preventBodyScroll = input<boolean>(true);

  readonly openChange = output<boolean>();
  readonly close = output<void>();
  readonly afterOpen = output<void>();
  readonly afterClose = output<void>();

  private readonly dialogElement = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly isAnimating = signal(false);
  private readonly originalBodyOverflow = signal<string>('');

  readonly dialogClasses = computed(() => [
    'rt-Dialog',
    this.open() ? 'rt-open' : '',
    this.isAnimating() ? 'rt-animating' : '',
    `rt-size-${this.size()}`
  ].filter(Boolean).join(' '));

  readonly contentClasses = computed(() => [
    'rt-DialogContent',
    `rt-size-${this.size()}`
  ].filter(Boolean).join(' '));

  constructor() {
    // Handle open state changes
    effect(() => {
      const isOpen = this.open();
      const dialog = this.dialogElement()?.nativeElement;
      
      if (isOpen && dialog && !dialog.open) {
        this.showDialog();
      } else if (!isOpen && dialog?.open) {
        this.hideDialog();
      }
    });

    // Handle body scroll prevention
    effect(() => {
      if (this.preventBodyScroll()) {
        if (this.open()) {
          this.originalBodyOverflow.set(document.body.style.overflow);
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = this.originalBodyOverflow();
        }
      }
    });

    // Handle escape key
    if (typeof window !== 'undefined') {
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.closeOnEscape() && this.open()) {
          this.onClose();
        }
      });
    }
  }

  private showDialog(): void {
    const dialog = this.dialogElement()?.nativeElement;
    if (!dialog) return;

    this.isAnimating.set(true);
    dialog.showModal();
    
    // Trigger afterOpen after animation
    setTimeout(() => {
      this.isAnimating.set(false);
      this.afterOpen.emit();
    }, 150);
  }

  private hideDialog(): void {
    const dialog = this.dialogElement()?.nativeElement;
    if (!dialog) return;

    this.isAnimating.set(true);
    
    // Wait for animation to complete
    setTimeout(() => {
      dialog.close();
      this.isAnimating.set(false);
      this.afterClose.emit();
    }, 150);
  }

  onClose(): void {
    this.close.emit();
    this.openChange.emit(false);
  }

  onOverlayClick(event: MouseEvent): void {
    if (this.closeOnClickOutside() && event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onDialogClick(event: MouseEvent): void {
    // Prevent event bubbling to overlay
    event.stopPropagation();
  }
}
