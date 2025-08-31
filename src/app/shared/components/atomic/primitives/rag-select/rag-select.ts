import { Component, input, output, forwardRef, signal, computed, ViewChild, ElementRef, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Overlay, OverlayRef, OverlayModule, ConnectedPosition, FlexibleConnectedPositionStrategy } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ViewContainerRef, TemplateRef } from '@angular/core';
import { X, ChevronDown, Search, Check } from 'lucide-angular';
import { RagIcon } from '../rag-icon/rag-icon';

export interface RagSelectOption<T = any> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}

@Component({
  selector: 'rag-select',
  standalone: true,
  imports: [CommonModule, RagIcon, OverlayModule],
  templateUrl: './rag-select.html',
  styleUrl: './rag-select.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RagSelect),
      multi: true
    }
  ]
})
export class RagSelect<T = any> implements ControlValueAccessor, OnDestroy {
  // ViewChild references for overlay positioning
  @ViewChild('trigger', { static: false }) triggerRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('dropdownTemplate', { static: true }) dropdownTemplate!: TemplateRef<any>;
  
  // Icon constants
  readonly XIcon = X;
  readonly ChevronDownIcon = ChevronDown;
  readonly SearchIcon = Search;
  readonly CheckIcon = Check;
  
  // Overlay management
  private overlayRef: OverlayRef | null = null;
  
  // Modern Angular 20: Use input() with proper typing
  readonly options = input<RagSelectOption<T>[]>([]);
  readonly placeholder = input('Select an option...');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly error = input(false);
  readonly searchable = input(false);
  readonly clearable = input(false);
  readonly value = input<T | null>(null);
  
  // Modern Angular 20: Use output() instead of EventEmitter
  readonly valueChange = output<T | null>();
  readonly onSearch = output<string>();

  // Modern Angular 20: Use signals for reactive state
  private readonly internalValue = signal<T | null>(null);
  private readonly isOpenSignal = signal(false);
  private readonly searchTermSignal = signal('');
  private onChange = (value: T | null) => {};
  private onTouched = () => {};
  
  constructor(
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef
  ) {
    // Effect to handle overlay cleanup when isOpen changes
    effect(() => {
      if (!this.isOpen && this.overlayRef) {
        this.closeOverlay();
      }
    });
  }

  // Computed value that prioritizes input() over internal state
  readonly currentValue = computed(() => 
    this.value() !== null ? this.value() : this.internalValue()
  );

  get selectedValue(): T | null {
    return this.currentValue();
  }

  set selectedValue(value: T | null) {
    this.internalValue.set(value);
  }

  get isOpen(): boolean {
    return this.isOpenSignal();
  }

  set isOpen(value: boolean) {
    this.isOpenSignal.set(value);
  }

  get searchTerm(): string {
    return this.searchTermSignal();
  }

  set searchTerm(value: string) {
    this.searchTermSignal.set(value);
  }

  // Modern Angular 20: Use computed for derived state
  readonly selectClasses = computed(() => [
    'rt-SelectTrigger',
    `rt-size-${this.size()}`,
    this.error() ? 'rt-error' : '',
    this.disabled() ? 'rt-disabled' : '',
    this.isOpen ? 'rt-open' : ''
  ].filter(Boolean).join(' '));

  readonly containerClasses = computed(() => [
    'rt-Select',
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  readonly selectedOption = computed(() => 
    this.options().find(option => option.value === this.selectedValue) || null
  );

  readonly filteredOptions = computed(() => {
    if (!this.searchTerm) return this.options();
    return this.options().filter(option => 
      option.label.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  });

  readonly displayValue = computed(() => 
    this.selectedOption()?.label || this.placeholder()
  );

  toggleDropdown(): void {
    if (this.disabled()) return;
    
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }
  
  private openDropdown(): void {
    if (this.overlayRef) {
      this.closeOverlay();
    }
    
    this.createOverlay();
    this.isOpen = true;
  }
  
  private closeDropdown(): void {
    this.isOpen = false;
    this.onTouched();
    this.searchTerm = '';
  }
  
  private createOverlay(): void {
    const positionStrategy = this.getPositionStrategy();
    
    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      width: this.triggerRef.nativeElement.offsetWidth,
      minWidth: 200
    });
    
    const portal = new TemplatePortal(this.dropdownTemplate, this.viewContainerRef);
    this.overlayRef.attach(portal);
    
    // Close dropdown when backdrop is clicked
    this.overlayRef.backdropClick().subscribe(() => {
      this.closeDropdown();
    });
  }
  
  private getPositionStrategy(): FlexibleConnectedPositionStrategy {
    const positions: ConnectedPosition[] = [
      {
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top',
        offsetY: 4
      },
      {
        originX: 'start',
        originY: 'top',
        overlayX: 'start',
        overlayY: 'bottom',
        offsetY: -4
      },
      {
        originX: 'end',
        originY: 'bottom',
        overlayX: 'end',
        overlayY: 'top',
        offsetY: 4
      },
      {
        originX: 'end',
        originY: 'top',
        overlayX: 'end',
        overlayY: 'bottom',
        offsetY: -4
      }
    ];
    
    return this.overlay.position()
      .flexibleConnectedTo(this.triggerRef)
      .withPositions(positions)
      .withPush(false)
      .withViewportMargin(8);
  }
  
  private closeOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  selectOption(option: RagSelectOption<T>): void {
    if (option.disabled) return;
    
    this.selectedValue = option.value;
    this.closeDropdown();
    
    this.onChange(this.selectedValue);
    this.valueChange.emit(this.selectedValue);
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.selectedValue = null;
    this.onChange(this.selectedValue);
    this.valueChange.emit(this.selectedValue);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.onSearch.emit(this.searchTerm);
  }

  // ControlValueAccessor implementation
  writeValue(value: T | null): void {
    this.internalValue.set(value);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Note: With input() signals, disabled state is managed externally via input binding
    // This method is kept for ControlValueAccessor compliance but doesn't modify the input
    // The parent component should bind [disabled]="formControl.disabled" to the component
  }
  
  ngOnDestroy(): void {
    this.closeOverlay();
  }
}
