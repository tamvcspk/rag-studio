# Semantic Components - Quick Reference Guide

Quick lookup reference for all RAG Studio semantic components with essential information for developers.

## 📋 Component Index

### 📊 Data Display (6 components)
| Component | Purpose | Key Props | Use Case |
|-----------|---------|-----------|----------|
| `<rag-card>` | Content container | `variant`, `interactive`, `padding` | Content grouping, layouts |
| `<rag-stat-card>` | Metric display | `data: StatCardData`, `size` | KPIs, dashboard metrics |
| `<rag-code-block>` | Code display | `code`, `language`, `showCopy` | Documentation, examples |
| `<rag-metric-display>` | Performance metrics | `metric: PerformanceMetric` | System monitoring |
| `<rag-key-value>` | Data pairs | `pairs: KeyValuePair[]` | Configuration display |
| `<rag-timestamp>` | Time display | `value`, `format` | Dates, relative time |

### 📝 Forms (4 components)
| Component | Purpose | Key Props | Use Case |
|-----------|---------|-----------|----------|
| `<rag-form-field>` | Field wrapper | `label`, `error`, `required` | Form layouts |
| `<rag-search-input>` | Search input | `debounceTime`, `showClearButton` | Search functionality |
| `<rag-version-input>` | Version selector | `allowLatest`, `allowRange` | Package versions |
| `<rag-cron-input>` | Cron builder | `showPresets` | Scheduling |

### 🧭 Navigation (4 components)
| Component | Purpose | Key Props | Use Case |
|-----------|---------|-----------|----------|
| `<rag-tabs>` | Tab navigation | `tabs: TabItem[]`, `variant` | Content organization |
| `<rag-tab-navigation>` | Router navigation | `items: TabNavItem[]`, `variant` | App navigation tabs |
| `<rag-breadcrumb>` | Path navigation | `items: BreadcrumbItem[]` | Hierarchical navigation |
| `<rag-sidebar-item>` | Sidebar links | `label`, `icon`, `badge` | App navigation |

### 🎭 Overlay (3 components)
| Component | Purpose | Key Props | Use Case |
|-----------|---------|-----------|----------|
| `<rag-dialog>` | Dialog template | `title`, `description`, `size` | Dialog styling wrapper |
| `<rag-dropdown>` | Context menus | `items`, `placement` | Action menus |
| `<rag-context-menu>` | Right-click menus | `items` | Contextual actions |

**Note**: `<rag-dialog>` is used as a template wrapper. Use `RagDialogService` to open components as dialogs.

---

## 🏷️ Type Definitions Quick Reference

### Data Display Types
```typescript
// RagCard
type RagCardVariant = 'default' | 'elevated' | 'outlined';

// RagStatCard
interface StatCardData {
  label: string;
  value: string | number;
  change?: { value: string | number; trend: 'up' | 'down' | 'neutral' };
  icon?: string;
}

// RagMetricDisplay
interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  target?: number;
  threshold?: { good: number; warning: number };
  format?: 'number' | 'percentage' | 'duration' | 'bytes';
}

// RagKeyValue
interface KeyValuePair {
  key: string;
  value: string;
  type?: 'text' | 'code' | 'link';
}
```

### Forms Types
```typescript
// RagFormField
type RagFormFieldSize = 'sm' | 'md' | 'lg';

// RagVersionInput
type VersionType = 'exact' | 'range' | 'latest';
interface VersionValue {
  type: VersionType;
  version: string;
}

// RagCronInput
interface CronValue {
  expression: string;
  description: string;
}
```

### Navigation Types
```typescript
// RagTabs
interface TabItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

// RagTabNavigation
interface TabNavItem {
  id: string;
  label: string;
  icon?: string;
  routerLink?: string;
  disabled?: boolean;
  onClick?: () => void;
}

// RagBreadcrumb
interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
  disabled?: boolean;
  current?: boolean;
}
```

---

## 🎯 Common Usage Patterns

### 1. Dashboard Metrics
```html
<div class="metrics-grid">
  <rag-stat-card [data]="{
    label: 'Active Users',
    value: 1234,
    change: { value: '+5.2%', trend: 'up' },
    icon: 'users'
  }" />
  
  <rag-metric-display [metric]="{
    label: 'Response Time',
    value: 245,
    unit: 'ms',
    target: 500,
    threshold: { good: 200, warning: 400 },
    format: 'duration'
  }" />
</div>
```

### 2. Form with Validation
```html
<form [formGroup]="myForm">
  <rag-form-field 
    label="Project Name"
    [error]="getFieldError('name')"
    [required]="true">
    <rag-input formControlName="name" />
  </rag-form-field>
  
  <rag-form-field label="Search Documents">
    <rag-search-input 
      formControlName="search"
      (search)="onSearch($event)" />
  </rag-form-field>
</form>
```

### 3. Navigation Layout
```html
<!-- Page tabs -->
<rag-tabs 
  [tabs]="pageTab"
  [activeTab]="currentTab"
  (tabChange)="onTabChange($event)" />

<!-- App navigation with router links -->
<rag-tab-navigation
  [items]="navigationItems"
  variant="primary"
  (itemClick)="onNavItemClick($event)" />

<!-- Breadcrumb -->
<rag-breadcrumb [items]="[
  { label: 'Home', url: '/' },
  { label: 'Projects', url: '/projects' },
  { label: 'Current Project', current: true }
]" />
```

### 4. Service-Based Dialogs
```typescript
// Component that opens as a dialog
@Component({
  template: `
    <rag-dialog
      title="Confirm Deletion" 
      size="sm">
      
      <p>Are you sure you want to delete this item?</p>
      
      <div slot="footer" class="dialog-actions">
        <rag-button variant="outline" (click)="cancel()">Cancel</rag-button>
        <rag-button variant="solid" (click)="confirm()">Delete</rag-button>
      </div>
    </rag-dialog>
  `
})
export class ConfirmDialogComponent {
  private dialogRef = inject(DialogRef);
  
  cancel() {
    this.dialogRef.close(false);
  }
  
  confirm() {
    this.dialogRef.close(true);
  }
}

// Opening the dialog
openConfirmDialog() {
  const dialogRef = this.dialogService.open(ConfirmDialogComponent, {
    data: { itemName: 'Selected Item' }
  });
  
  dialogRef.closed.subscribe(result => {
    if (result) {
      console.log('User confirmed deletion');
    }
  });
}
```

### 5. Content Cards
```html
<!-- Interactive card grid -->
<div class="card-grid">
  <rag-card 
    variant="outlined" 
    [interactive]="true"
    (click)="selectItem(item)"
    *ngFor="let item of items">
    
    <h3>{{ item.title }}</h3>
    <p>{{ item.description }}</p>
    <rag-timestamp [value]="item.createdAt" format="relative" />
  </rag-card>
</div>
```

---

## 🎨 Styling & Customization

### CSS Classes Structure
```scss
// Component base classes
.rag-{component}              // Base component
.rag-{component}--{variant}   // Variant modifier  
.rag-{component}--{size}      // Size modifier
.rag-{component}__element     // Child elements

// Example: RagCard
.rag-card                     // Base
.rag-card--elevated          // Elevated variant
.rag-card--interactive       // Interactive state
.rag-card__content           // Content area
```

### Design Token Usage
```scss
// Components use design tokens
.rag-card {
  background: var(--rag-semantic-color-background-default);
  border-radius: var(--rag-primitive-radius-lg);
  padding: var(--rag-primitive-spacing-lg);
  box-shadow: var(--rag-primitive-shadow-sm);
}
```

### Custom Styling
```scss
// Override component styles
:host ::ng-deep {
  .rag-stat-card {
    &.custom-theme {
      background: var(--rag-primitive-color-blue-50);
      border: 2px solid var(--rag-primitive-color-blue-200);
    }
  }
}
```

---

## 🧪 Testing Helpers

### Component Testing
```typescript
// Test utility for stat card
function createStatCard(data: Partial<StatCardData> = {}) {
  return {
    label: 'Test Metric',
    value: 100,
    ...data
  };
}

// Usage in tests
it('should display metric correctly', () => {
  component.data.set(createStatCard({ 
    label: 'Users', 
    value: 1234 
  }));
  fixture.detectChanges();
  
  expect(getByText('Users')).toBeInTheDocument();
  expect(getByText('1234')).toBeInTheDocument();
});
```

### Form Testing
```typescript
// Test form field integration
it('should integrate with reactive forms', () => {
  const form = new FormGroup({
    search: new FormControl('')
  });
  
  const searchInput = fixture.debugElement.query(By.directive(RagSearchInput));
  searchInput.componentInstance.writeValue('test');
  
  expect(form.get('search')?.value).toBe('test');
});
```

### Dialog Testing
```typescript
// Test service-based dialog
it('should open dialog using service', () => {
  const dialogService = TestBed.inject(RagDialogService);
  const dialogRef = dialogService.open(TestDialogComponent, {
    data: { message: 'Test data' }
  });
  
  expect(dialogRef).toBeDefined();
  
  // Test dialog closes with result
  dialogRef.close('test-result');
  dialogRef.closed.subscribe(result => {
    expect(result).toBe('test-result');
  });
});

// Test dialog component
it('should inject DialogRef and DIALOG_DATA', () => {
  const dialogRef = jasmine.createSpyObj('DialogRef', ['close']);
  const dialogData = { message: 'Test' };
  
  TestBed.configureTestingModule({
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      { provide: DIALOG_DATA, useValue: dialogData }
    ]
  });
  
  const component = TestBed.createComponent(TestDialogComponent).componentInstance;
  expect(component.dialogRef).toBe(dialogRef);
  expect(component.data).toBe(dialogData);
});
```

---

## 🚀 Performance Tips

### 1. Use TrackBy Functions
```typescript
// For large lists
readonly trackByFn = (index: number, item: any) => item.id;

// In template
<rag-card *ngFor="let item of items; trackBy: trackByFn">
```

### 2. Lazy Load Heavy Components
```typescript
// Lazy load dialog content using service
@Component({
  template: `
    <rag-dialog title="Heavy Content">
      @defer (on viewport) {
        <heavy-dialog-content />
      } @placeholder {
        <div>Loading...</div>
      }
    </rag-dialog>
  `
})
export class HeavyDialogComponent {
  // Opened via RagDialogService
}
```

### 3. Optimize Search with Debouncing
```html
<!-- Use built-in debouncing -->
<rag-search-input 
  [debounceTime]="500"
  (search)="performExpensiveSearch($event)" />
```

### 4. Virtual Scrolling for Large Lists
```typescript
// For large data sets
@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="72">
      <rag-card *cdkVirtualFor="let item of items">
        {{ item.name }}
      </rag-card>
    </cdk-virtual-scroll-viewport>
  `
})
```

---

## 🔧 Common Issues & Solutions

### Issue: Form validation not showing
```typescript
// ✅ Solution: Properly handle validation state
get fieldError() {
  const control = this.form.get('fieldName');
  return control?.invalid && control?.touched 
    ? control.errors?.['required'] ? 'This field is required' : 'Invalid value'
    : null;
}
```

### Issue: Dialog not focusing properly
```typescript
// ✅ Solution: Use CDK focus trap in dialog component
@Component({
  template: `
    <rag-dialog title="Form Dialog" cdkTrapFocus>
      <form>
        <input #firstInput />
        <button type="submit">Save</button>
      </form>
    </rag-dialog>
  `
})
export class FormDialogComponent {
  // Opened via RagDialogService.open()
}
```

### Issue: Search input not debouncing
```typescript
// ✅ Solution: Use built-in debouncing instead of custom
<rag-search-input 
  [debounceTime]="300"
  (search)="onSearch($event)" />  <!-- Use search event, not input -->
```

### Issue: Performance with large stat card grids
```scss
/* ✅ Solution: Use CSS Grid for performance */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--rag-primitive-spacing-md);
  container-type: inline-size;
}
```

---

**Quick Access**: [Full Documentation](./SEMANTIC_COMPONENTS.md) | [Component Demos](../src/app/pages/design-system) | [API Reference](./COMPONENT_API.md)

---

**Last Updated**: August 30, 2025  
**Total Components**: 16 semantic components
