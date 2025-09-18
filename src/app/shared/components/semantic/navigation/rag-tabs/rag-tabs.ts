import { 
  Component, 
  input, 
  output, 
  signal, 
  computed, 
  ContentChildren, 
  QueryList, 
  AfterContentInit,
  Directive,
  TemplateRef,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

export interface TabItem {
  id: string;
  label: string;
  icon?: any; // Icon component, not string
  disabled?: boolean;
}

@Directive({
  selector: '[ragTabPanel]',
  standalone: true
})
export class RagTabPanelDirective {
  readonly id = input.required<string>({ alias: 'ragTabPanel' });
  readonly label = input.required<string>();
  readonly icon = input<any>();
  readonly disabled = input(false, { transform: Boolean });
  
  constructor(public template: TemplateRef<any>) {}
}

@Component({
  selector: 'rag-tabs',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-tabs.html',
  styleUrl: './rag-tabs.scss'
})
export class RagTabs implements AfterContentInit {
  // Remove tabs input - will be derived from tabPanels
  readonly selectedIndex = input<number>(0);
  readonly variant = input<'primary' | 'secondary' | 'minimal'>('primary');
  readonly disabled = input(false);

  readonly selectedIndexChange = output<number>();
  readonly tabClick = output<{ index: number; id: string }>();

  @ContentChildren(RagTabPanelDirective) tabPanels!: QueryList<RagTabPanelDirective>;
  @ViewChild('tabPanelsContainer', { static: false }) tabPanelsContainer!: ElementRef<HTMLDivElement>;

  private readonly internalSelectedIndex = signal<number>(0);
  readonly tabPanelsSignal = signal<RagTabPanelDirective[]>([]);
  
  readonly currentSelectedIndex = computed(() => {
    return this.selectedIndex() ?? this.internalSelectedIndex();
  });

  readonly navListClasses = computed(() => [
    'rt-TabNavList',
    `rt-variant-${this.variant()}`,
    this.disabled() ? 'rt-disabled' : ''
  ].filter(Boolean).join(' '));

  ngAfterContentInit(): void {
    // Update tabs signal when content changes
    this.updateTabPanelsSignal();
    
    // Listen for changes to tab panels
    this.tabPanels.changes.subscribe(() => {
      this.updateTabPanelsSignal();
    });
    
    // Initialize with first tab if no selection and tabs exist
    if (this.selectedIndex() === undefined && this.tabPanels.length > 0) {
      this.internalSelectedIndex.set(0);
    }
  }
  
  private updateTabPanelsSignal(): void {
    this.tabPanelsSignal.set(this.tabPanels.toArray());
  }

  onTabClick(index: number): void {
    if (this.disabled()) return;
    
    const tabPanel = this.tabPanelsSignal()[index];
    if (tabPanel?.disabled()) return;

    this.internalSelectedIndex.set(index);
    this.selectedIndexChange.emit(index);
    this.tabClick.emit({ index, id: tabPanel.id() });
  }

  isTabActive(index: number): boolean {
    return this.currentSelectedIndex() === index;
  }

  getTabClasses(tabPanel: RagTabPanelDirective, index: number): string {
    return [
      'rt-TabNavItem',
      this.isTabActive(index) ? 'rt-active' : '',
      tabPanel.disabled() ? 'rt-disabled' : ''
    ].filter(Boolean).join(' ');
  }

  getTabPanelById(tabId: string): RagTabPanelDirective | undefined {
    return this.tabPanelsSignal().find(panel => panel.id() === tabId);
  }

  isTabPanelVisible(index: number): boolean {
    return this.currentSelectedIndex() === index;
  }

  getTabPanelClasses(index: number): string {
    return [
      'rt-TabPanel',
      this.isTabPanelVisible(index) ? 'rt-TabPanel--visible' : 'rt-TabPanel--hidden'
    ].join(' ');
  }

  trackByTabId(index: number, tabPanel: RagTabPanelDirective): string {
    return tabPanel.id();
  }

  // Computed property to get tabs array from directives
  readonly tabs = computed(() => {
    return this.tabPanelsSignal().map(panel => ({
      id: panel.id(),
      label: panel.label(),
      icon: panel.icon(),
      disabled: panel.disabled()
    }) as TabItem);
  });
}
