import {
  Directive,
  ElementRef,
  Renderer2,
  input,
  effect,
  TemplateRef,
  ViewContainerRef,
  EmbeddedViewRef,
  OnDestroy
} from '@angular/core';

@Directive({
  selector: '[ragBadge]',
  standalone: true
})
export class RagBadge implements OnDestroy {
  // Badge content - can be text or number
  readonly ragBadge = input<string | number | TemplateRef<any> | null>(null);

  // Badge styling options
  readonly badgeVariant = input<'solid' | 'soft' | 'outline'>('solid');
  readonly badgeColor = input<'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple'>('red');
  readonly badgeSize = input<'xs' | 'sm' | 'md'>('sm');
  readonly badgePosition = input<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  readonly badgeOffset = input<boolean>(false); // Slightly offset from element
  readonly badgeHidden = input<boolean>(false); // Hide the badge

  private badgeElement: HTMLElement | null = null;
  private embeddedViewRef: EmbeddedViewRef<any> | null = null;

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private viewContainer: ViewContainerRef
  ) {
    // Set up host element positioning
    this.setupHostElement();

    // Create badge when content changes
    effect(() => {
      this.updateBadge();
    });
  }

  ngOnDestroy(): void {
    this.removeBadge();
  }

  private setupHostElement(): void {
    const hostElement = this.elementRef.nativeElement;
    const currentPosition = getComputedStyle(hostElement).position;

    // Ensure host element has relative positioning for badge positioning
    if (currentPosition === 'static') {
      this.renderer.setStyle(hostElement, 'position', 'relative');
    }
  }

  private updateBadge(): void {
    const content = this.ragBadge();
    const hidden = this.badgeHidden();

    // Remove existing badge
    this.removeBadge();

    // Don't create badge if content is null/undefined/empty or hidden
    if (content == null || content === '' || hidden) {
      return;
    }

    this.createBadge(content);
  }

  private createBadge(content: string | number | TemplateRef<any>): void {
    if (content instanceof TemplateRef) {
      this.createTemplateBadge(content);
    } else {
      this.createTextBadge(content.toString());
    }
  }

  private createTextBadge(text: string): void {
    this.badgeElement = this.renderer.createElement('span');

    // Set badge classes
    const classes = this.getBadgeClasses();
    classes.forEach(className => {
      this.renderer.addClass(this.badgeElement!, className);
    });

    // Set badge text
    this.renderer.setProperty(this.badgeElement, 'textContent', text);

    // Apply positioning styles
    this.applyPositionStyles(this.badgeElement!);

    // Append to host element
    this.renderer.appendChild(this.elementRef.nativeElement, this.badgeElement);
  }

  private createTemplateBadge(template: TemplateRef<any>): void {
    // Create container for template badge
    this.badgeElement = this.renderer.createElement('div');

    const classes = this.getBadgeClasses();
    classes.forEach(className => {
      this.renderer.addClass(this.badgeElement!, className);
    });

    // Create embedded view from template
    this.embeddedViewRef = this.viewContainer.createEmbeddedView(template);

    // Append template content to badge element
    this.embeddedViewRef.rootNodes.forEach(node => {
      this.renderer.appendChild(this.badgeElement!, node);
    });

    this.applyPositionStyles(this.badgeElement!);
    this.renderer.appendChild(this.elementRef.nativeElement, this.badgeElement);
  }

  private getBadgeClasses(): string[] {
    return [
      'rag-badge',
      `rag-badge--${this.badgeVariant()}`,
      `rag-badge--${this.badgeColor()}`,
      `rag-badge--${this.badgeSize()}`,
      `rag-badge--${this.badgePosition()}`,
      this.badgeOffset() ? 'rag-badge--offset' : ''
    ].filter(Boolean);
  }

  private applyPositionStyles(element: HTMLElement): void {
    const position = this.badgePosition();
    const offset = this.badgeOffset();

    // Base positioning styles
    this.renderer.setStyle(element, 'position', 'absolute');
    this.renderer.setStyle(element, 'z-index', '10');

    // Position-specific styles
    switch (position) {
      case 'top-right':
        this.renderer.setStyle(element, 'top', offset ? '-8px' : '0');
        this.renderer.setStyle(element, 'right', offset ? '-8px' : '0');
        this.renderer.setStyle(element, 'transform', 'translate(50%, -50%)');
        break;
      case 'top-left':
        this.renderer.setStyle(element, 'top', offset ? '-8px' : '0');
        this.renderer.setStyle(element, 'left', offset ? '-8px' : '0');
        this.renderer.setStyle(element, 'transform', 'translate(-50%, -50%)');
        break;
      case 'bottom-right':
        this.renderer.setStyle(element, 'bottom', offset ? '-8px' : '0');
        this.renderer.setStyle(element, 'right', offset ? '-8px' : '0');
        this.renderer.setStyle(element, 'transform', 'translate(50%, 50%)');
        break;
      case 'bottom-left':
        this.renderer.setStyle(element, 'bottom', offset ? '-8px' : '0');
        this.renderer.setStyle(element, 'left', offset ? '-8px' : '0');
        this.renderer.setStyle(element, 'transform', 'translate(-50%, 50%)');
        break;
    }
  }

  private removeBadge(): void {
    if (this.badgeElement) {
      this.renderer.removeChild(this.elementRef.nativeElement, this.badgeElement);
      this.badgeElement = null;
    }

    if (this.embeddedViewRef) {
      this.embeddedViewRef.destroy();
      this.embeddedViewRef = null;
    }
  }
}