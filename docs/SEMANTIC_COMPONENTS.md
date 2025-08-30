# RAG Studio Semantic Components Library

Comprehensive documentation for the semantic UI components that provide higher-level, domain-specific functionality built on top of atomic components.

## 📋 Overview

Semantic components are composed UI elements that encapsulate specific business logic and user interactions. They combine multiple atomic components to create meaningful, reusable patterns specific to the RAG Studio application domain.

### Component Architecture

```
Semantic Components (Domain-specific, business logic)
    ↓ compose
Atomic Components (Basic UI primitives)  
    ↓ use
Design Tokens (Consistent styling)
    ↓ organized by
Component Archetype Patterns (Standardized interaction patterns)
```

## 🎨 Enhanced Archetype System

Our semantic components now fully utilize the **archetype system** - standardized design patterns that provide consistent styling and behavior across similar component types:

### 🎭 Overlay Archetype
Components that appear above content:
- **Dialog**: Modal dialogs with backdrop, header, content, and footer styling
- **Dropdown**: Contextual menus with container, item states, and separators
- **Context Menu**: Right-click menus using dropdown archetype patterns

### 🧭 Navigation Archetype
Components for app navigation:
- **Tabs**: Content switching with container and trigger state styling
- **Breadcrumb**: Hierarchical navigation with item states and separators
- **Sidebar**: Main navigation menu

### 📋 Data Display Archetype
Components for presenting data:
- **Card**: Content containers using card archetype variants
- **Stat Card**: Metrics display with card archetype foundation
- **Code Block**: Code presentation

### � Form Archetype
Components for data input:
- **Form Field**: Wrapper with label, description, error, and required indicator styling
- **Search Input**: Search-specific input patterns
- **Version Input**: Version number input
- **Cron Input**: Cron expression builder

### Status Update: Component Archetype Integration

✅ **Completed**: All overlay components (dialog, dropdown, context-menu) now use archetype patterns  
✅ **Completed**: All navigation components (tabs, breadcrumb) now use archetype patterns  
✅ **Completed**: Data display components (card, stat-card) now use archetype patterns  
✅ **Completed**: Form components (form-field) now use archetype patterns  

All semantic components have been updated to use the enhanced archetype system for consistent styling and behavior patterns.
Components for presenting data:
- **Card**: Content container
- **Table**: Tabular data display
- **List**: Item collections

### 🎭 Overlay Archetype
Components that appear above content:
- **Modal**: Focused interactions
- **Dialog**: Confirmations/forms
- **Dropdown**: Contextual content

For detailed archetype documentation and implementation details, see [ARCHETYPE_SYSTEM.md](../src/app/shared/tokens/archetypes/ARCHETYPE_SYSTEM.md).

### Categories

| Category | Components | Purpose |
|----------|------------|---------|
| **Data Display** | 6 components | Presenting information and data visualization |
| **Forms** | 4 components | Advanced form controls and input patterns |
| **Navigation** | 3 components | User navigation and wayfinding |
| **Overlay** | 3 components | Modal dialogs, dropdowns, and layered content |

---

## 📊 Data Display Components

### RagCard
**Purpose**: Container component for grouping related content with consistent styling and interaction states.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'default' \| 'elevated' \| 'outlined'` | `'default'` | Visual style variant |
| `padding` | `boolean` | `true` | Apply internal padding |
| `interactive` | `boolean` | `false` | Enable hover/focus interactions |

#### Usage
```html
<!-- Basic card -->
<rag-card>
  <h3>Card Title</h3>
  <p>Card content goes here...</p>
</rag-card>

<!-- Elevated interactive card -->
<rag-card variant="elevated" [interactive]="true">
  <div>Clickable card content</div>
</rag-card>

<!-- Outlined card without padding -->
<rag-card variant="outlined" [padding]="false">
  <img src="image.jpg" alt="Full width image">
</rag-card>
```

#### Variants
- **Default**: Subtle shadow, standard appearance
- **Elevated**: Prominent shadow, elevated appearance  
- **Outlined**: Border only, minimal shadow

---

### RagStatCard
**Purpose**: Display key metrics and statistics with trend indicators and visual hierarchy.

#### Props
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `data` | `StatCardData` | ✅ | Metric data and configuration |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `variant` | `'default' \| 'minimal'` | `'default'` | Visual style |

#### StatCardData Interface
```typescript
interface StatCardData {
  label: string;                    // Metric label
  value: string | number;           // Main value
  change?: {                        // Optional trend data
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: string;                    // Lucide icon name
}
```

#### Usage
```html
<!-- Basic metric -->
<rag-stat-card [data]="{
  label: 'Total Users',
  value: 1234,
  icon: 'users'
}" />

<!-- Metric with trend -->
<rag-stat-card 
  size="lg"
  [data]="{
    label: 'Revenue',
    value: '$45,230',
    change: { value: '+12.5%', trend: 'up' },
    icon: 'dollar-sign'
  }" />
```

---

### RagCodeBlock  
**Purpose**: Display formatted code with syntax highlighting, copy functionality, and line numbers.

#### Props
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `code` | `string` | ✅ | Code content to display |
| `language` | `string` | `''` | Programming language for highlighting |
| `title` | `string` | `''` | Optional code block title |
| `showCopy` | `boolean` | `true` | Show copy to clipboard button |
| `showLineNumbers` | `boolean` | `false` | Display line numbers |
| `maxHeight` | `string` | `''` | Maximum height with scrolling |

#### Usage
```html
<!-- Basic code block -->
<rag-code-block 
  [code]="'console.log(\"Hello World\");'"
  language="javascript" />

<!-- Advanced code block -->
<rag-code-block
  [code]="longCodeExample"
  language="typescript"
  title="Component Example"
  [showLineNumbers]="true"
  maxHeight="300px" />
```

---

### RagMetricDisplay
**Purpose**: Advanced performance metric visualization with thresholds, targets, and status indicators.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `metric` | `PerformanceMetric` | ✅ | Metric configuration |
| `showTarget` | `boolean` | `true` | Display target progress |
| `variant` | `'default' \| 'compact' \| 'detailed'` | `'default'` | Display style |

#### PerformanceMetric Interface
```typescript
interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  target?: number;                  // Target value for progress
  threshold?: {                     // Status thresholds
    good: number;
    warning: number;
  };
  format?: 'number' | 'percentage' | 'duration' | 'bytes';
}
```

#### Usage
```html
<!-- Response time metric -->
<rag-metric-display [metric]="{
  label: 'Response Time',
  value: 245,
  unit: 'ms',
  target: 500,
  threshold: { good: 200, warning: 400 },
  format: 'duration'
}" />

<!-- Memory usage with progress -->
<rag-metric-display
  variant="detailed"
  [metric]="{
    label: 'Memory Usage',
    value: 1536,
    unit: 'MB',
    target: 2048,
    format: 'bytes'
  }" />
```

---

### RagKeyValue
**Purpose**: Display key-value pairs in a structured, scannable format.

#### Usage
```html
<rag-key-value [pairs]="[
  { key: 'Model', value: 'GPT-4' },
  { key: 'Temperature', value: '0.7' },
  { key: 'Max Tokens', value: '2048' }
]" />
```

---

### RagTimestamp  
**Purpose**: Intelligent timestamp display with relative time and formatting options.

#### Usage
```html
<!-- Relative time -->
<rag-timestamp [value]="lastUpdated" format="relative" />

<!-- Absolute time with custom format -->
<rag-timestamp 
  [value]="createdDate" 
  format="absolute"
  dateFormat="MMM dd, yyyy" />
```

---

## 📝 Forms Components

### RagFormField
**Purpose**: Wrapper component that provides consistent labeling, validation, and layout for form inputs.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | | Field label text |
| `description` | `string` | | Optional help text |
| `error` | `string` | | Error message |
| `required` | `boolean` | `false` | Show required indicator |
| `size` | `RagFormFieldSize` | `'md'` | Field size |
| `disabled` | `boolean` | `false` | Disabled state |
| `htmlFor` | `string` | | Label association |

#### Usage
```html
<!-- Basic form field -->
<rag-form-field 
  label="Email Address"
  description="We'll never share your email"
  [required]="true">
  <rag-input 
    type="email" 
    placeholder="Enter your email" />
</rag-form-field>

<!-- Field with validation error -->
<rag-form-field
  label="Password"
  [error]="passwordError"
  [required]="true">
  <rag-input 
    type="password"
    placeholder="Enter password" />
</rag-form-field>
```

---

### RagSearchInput
**Purpose**: Specialized search input with debouncing, clear functionality, and search-specific UX patterns.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `placeholder` | `string` | `'Search...'` | Placeholder text |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input size |
| `disabled` | `boolean` | `false` | Disabled state |
| `showClearButton` | `boolean` | `true` | Show clear button |
| `debounceTime` | `number` | `300` | Search debounce in ms |

#### Events
| Event | Type | Description |
|-------|------|-------------|
| `search` | `string` | Emitted when search value changes (debounced) |
| `clear` | `void` | Emitted when clear button clicked |

#### Usage
```html
<!-- Basic search -->
<rag-search-input 
  placeholder="Search documents..."
  (search)="onSearch($event)"
  (clear)="onClearSearch()" />

<!-- Large search with custom debounce -->
<rag-search-input
  size="lg"
  [debounceTime]="500"
  placeholder="Search knowledge bases..."
  (search)="performSearch($event)" />
```

#### Form Integration
```typescript
// Reactive forms integration
<rag-search-input 
  [formControl]="searchControl"
  (search)="handleSearch($event)" />
```

---

### RagVersionInput
**Purpose**: Specialized input for version specifications with support for exact versions, ranges, and latest.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `placeholder` | `string` | `'e.g., 1.0.0'` | Input placeholder |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input size |
| `disabled` | `boolean` | `false` | Disabled state |
| `allowLatest` | `boolean` | `true` | Allow "latest" option |
| `allowRange` | `boolean` | `true` | Allow version ranges |

#### VersionValue Interface
```typescript
interface VersionValue {
  type: 'exact' | 'range' | 'latest';
  version: string;
}
```

#### Usage
```html
<!-- Basic version input -->
<rag-version-input 
  placeholder="Enter version"
  (versionChange)="onVersionChange($event)" />

<!-- Exact versions only -->
<rag-version-input
  [allowLatest]="false"
  [allowRange]="false"
  placeholder="1.0.0" />
```

---

### RagCronInput
**Purpose**: User-friendly cron expression builder with presets and visual feedback.

#### Usage
```html
<rag-cron-input 
  [formControl]="cronControl"
  [showPresets]="true"
  (cronChange)="onCronChange($event)" />
```

---

## 🧭 Navigation Components

### RagTabs
**Purpose**: Tab navigation with keyboard support, icons, and disabled states.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tabs` | `TabItem[]` | ✅ | Tab configuration |
| `activeTab` | `string \| null` | `null` | Currently active tab ID |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tab size |
| `variant` | `'default' \| 'pills'` | `'default'` | Visual style |
| `disabled` | `boolean` | `false` | Disable all tabs |

#### TabItem Interface
```typescript
interface TabItem {
  id: string;
  label: string;
  icon?: string;                    // Lucide icon name
  disabled?: boolean;
}
```

#### Events
| Event | Type | Description |
|-------|------|-------------|
| `tabChange` | `string` | Emitted when tab selection changes |

#### Usage
```html
<!-- Basic tabs -->
<rag-tabs 
  [tabs]="[
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'logs', label: 'Logs', icon: 'file-text', disabled: true }
  ]"
  (tabChange)="onTabChange($event)" />

<!-- Pills variant -->
<rag-tabs
  variant="pills"
  size="lg"
  [tabs]="tabItems"
  [activeTab]="currentTab" />
```

---

### RagBreadcrumb
**Purpose**: Hierarchical navigation with home link, truncation, and click handling.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `items` | `BreadcrumbItem[]` | ✅ | Breadcrumb items |
| `separator` | `string` | `'chevron-right'` | Separator icon |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `maxItems` | `number \| null` | `null` | Maximum items to show |
| `showHome` | `boolean` | `true` | Include home link |
| `homeIcon` | `string` | `'house'` | Home icon |
| `homeLabel` | `string` | `'Home'` | Home label |
| `homeUrl` | `string` | `'/'` | Home URL |

#### BreadcrumbItem Interface
```typescript
interface BreadcrumbItem {
  label: string;
  url?: string;                     // Router link or external URL
  icon?: string;                    // Lucide icon name
  disabled?: boolean;
  current?: boolean;                // Mark as current page
}
```

#### Usage
```html
<!-- Basic breadcrumb -->
<rag-breadcrumb [items]="[
  { label: 'Knowledge Bases', url: '/knowledge-bases' },
  { label: 'Documents', url: '/knowledge-bases/docs' },
  { label: 'Current Document', current: true }
]" />

<!-- Custom home and truncation -->
<rag-breadcrumb
  homeLabel="Dashboard"
  homeUrl="/dashboard"
  [maxItems]="4"
  [items]="longBreadcrumbPath" />
```

---

### RagSidebarItem
**Purpose**: Sidebar navigation item with nested children, badges, and state management.

#### Usage
```html
<rag-sidebar-item
  label="Knowledge Bases"
  icon="database"
  [badge]="5"
  [active]="currentRoute === '/knowledge-bases'" />
```

---

## 🎭 Overlay Components

### RagDialog
**Purpose**: Modal dialog with focus management, animations, and accessibility features.

#### Props
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `open` | `boolean` | `false` | Dialog visibility |
| `title` | `string` | `''` | Dialog title |
| `description` | `string` | `''` | Dialog description |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Dialog size |
| `showCloseButton` | `boolean` | `true` | Show close button |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `closeOnClickOutside` | `boolean` | `true` | Close on overlay click |
| `preventBodyScroll` | `boolean` | `true` | Prevent body scrolling |

#### Events
| Event | Type | Description |
|-------|------|-------------|
| `openChange` | `boolean` | Dialog open state changed |
| `close` | `void` | Dialog close requested |
| `afterOpen` | `void` | Dialog opened (after animation) |
| `afterClose` | `void` | Dialog closed (after animation) |

#### Usage
```html
<!-- Confirmation dialog -->
<rag-dialog
  [open]="showDeleteDialog"
  title="Confirm Deletion"
  description="This action cannot be undone."
  size="sm"
  (close)="showDeleteDialog = false">
  
  <div class="dialog-content">
    <p>Are you sure you want to delete this item?</p>
  </div>
  
  <div class="dialog-actions">
    <rag-button variant="outline" (click)="showDeleteDialog = false">
      Cancel
    </rag-button>
    <rag-button variant="solid" (click)="confirmDelete()">
      Delete
    </rag-button>
  </div>
</rag-dialog>

<!-- Form dialog -->
<rag-dialog
  [open]="showCreateDialog"
  title="Create New Item"
  size="lg"
  (openChange)="showCreateDialog = $event">
  
  <form [formGroup]="createForm">
    <rag-form-field label="Name" [required]="true">
      <rag-input formControlName="name" />
    </rag-form-field>
    <!-- More form fields -->
  </form>
</rag-dialog>
```

---

### RagDropdown
**Purpose**: Context-aware dropdown menu with positioning, keyboard navigation, and nested items.

#### Usage
```html
<rag-dropdown [items]="menuItems" (itemSelect)="onMenuSelect($event)">
  <rag-button variant="outline">
    Actions
    <rag-icon [img]="ChevronDownIcon" />
  </rag-button>
</rag-dropdown>
```

---

### RagContextMenu
**Purpose**: Right-click context menu with dynamic positioning and hierarchical items.

#### Usage
```html
<div rag-context-menu [items]="contextItems">
  Right-click for context menu
</div>
```

---

## 🎯 Design Principles

### 1. **Composition over Inheritance**
Semantic components compose atomic components rather than extending them, promoting reusability and maintainability.

### 2. **Single Responsibility**
Each component has a clear, focused purpose and handles specific user interaction patterns.

### 3. **Accessibility First**
All components include proper ARIA attributes, keyboard navigation, and focus management.

### 4. **Progressive Enhancement**
Components work with basic functionality and enhance with advanced features when needed.

### 5. **Modern Angular Patterns**
- Use `input()` and `output()` for component props and events
- Leverage `signal()` and `computed()` for reactive state
- Implement `ControlValueAccessor` for form integration
- Use `effect()` for side effects and lifecycle management

---

## 🧪 Testing Patterns

### Component Testing
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RagStatCard } from './rag-stat-card';

describe('RagStatCard', () => {
  let component: RagStatCard;
  let fixture: ComponentFixture<RagStatCard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RagStatCard]
    });
    fixture = TestBed.createComponent(RagStatCard);
    component = fixture.componentInstance;
  });

  it('should display metric data correctly', () => {
    component.data.set({
      label: 'Test Metric',
      value: 100,
      icon: 'activity'
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Test Metric');
    expect(fixture.nativeElement.textContent).toContain('100');
  });

  it('should show trend indicator when change data provided', () => {
    component.data.set({
      label: 'Revenue',
      value: 1000,
      change: { value: '+10%', trend: 'up' }
    });
    fixture.detectChanges();

    const trendElement = fixture.nativeElement.querySelector('.rag-stat-card__change--up');
    expect(trendElement).toBeTruthy();
  });
});
```

### Integration Testing
```typescript
describe('Form Integration', () => {
  it('should work with reactive forms', fakeAsync(() => {
    const form = new FormGroup({
      search: new FormControl('')
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.form = form;
    fixture.detectChanges();

    const searchInput = fixture.debugElement.query(By.directive(RagSearchInput));
    searchInput.nativeElement.value = 'test query';
    searchInput.nativeElement.dispatchEvent(new Event('input'));

    tick(300); // Wait for debounce

    expect(form.get('search')?.value).toBe('test query');
  }));
});
```

---

## 🚀 Best Practices

### 1. **Component Composition**
```html
<!-- ✅ Good: Compose semantic components -->
<rag-form-field label="Search Documents">
  <rag-search-input 
    (search)="performSearch($event)"
    [debounceTime]="500" />
</rag-form-field>

<!-- ❌ Avoid: Recreating existing functionality -->
<div class="custom-form-field">
  <label>Search Documents</label>
  <input type="text" (input)="onSearch($event)" />
</div>
```

### 2. **State Management**
```typescript
// ✅ Good: Use signals for reactive state
readonly isLoading = signal(false);
readonly searchResults = signal<SearchResult[]>([]);

readonly hasResults = computed(() => 
  this.searchResults().length > 0
);

// ✅ Good: Use effects for side effects
constructor() {
  effect(() => {
    if (this.searchQuery()) {
      this.performSearch(this.searchQuery());
    }
  });
}
```

### 3. **Form Integration**
```typescript
// ✅ Good: Implement ControlValueAccessor
@Component({
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CustomInput),
    multi: true
  }]
})
export class CustomInput implements ControlValueAccessor {
  // Implementation...
}
```

### 4. **Accessibility**
```html
<!-- ✅ Good: Proper ARIA attributes -->
<rag-dialog
  [open]="isOpen"
  title="Settings"
  role="dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description">
  
  <h2 id="dialog-title">Settings</h2>
  <p id="dialog-description">Configure your preferences</p>
</rag-dialog>
```

### 5. **Performance**
```typescript
// ✅ Good: Use computed for derived values
readonly filteredItems = computed(() => 
  this.items().filter(item => 
    item.name.toLowerCase().includes(this.searchTerm().toLowerCase())
  )
);

// ✅ Good: Use trackBy for large lists
readonly trackByFn = (index: number, item: any) => item.id;
```

---

## 📚 Summary

The RAG Studio semantic components provide:

- **16 high-level components** across 4 categories
- **Comprehensive form integration** with reactive forms support
- **Advanced interaction patterns** (search, version input, cron builder)
- **Accessibility features** built-in
- **Modern Angular 20 patterns** throughout
- **Design token integration** for consistent styling
- **Extensive customization options** via props and variants

These components form the building blocks for complex RAG Studio interfaces, providing consistent UX patterns and reducing development time while maintaining flexibility and accessibility standards.

---

**Last Updated**: August 30, 2025  
**Version**: 2.0.0  
**Total Components**: 16 semantic components
