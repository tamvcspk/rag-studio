# RAG Studio - Component Quick Reference Guide

Complete quick reference for all RAG Studio components - both atomic and semantic levels.

## 📚 Documentation Structure

| Guide | Purpose | When to Use |
|-------|---------|-------------|
| **[Atomic Components Reference](./ATOMIC_COMPONENTS_REFERENCE.md)** | Complete reference for UI primitives | Building basic interfaces, forms, and interactions |
| **[Semantic Components Reference](./SEMANTIC_COMPONENTS_REFERENCE.md)** | Business logic components reference | Building complex features and domain-specific UI |
| **This Quick Reference** | Fast lookup and common patterns | Quick API lookup and copy-paste examples |

---

## 🚀 Quick Start

### Import Components

```typescript
// Atomic components
import { 
  RagButton, RagInput, RagSelect, RagChip, RagAlert,
  RagIcon, RagSpinner, RagProgress, RagSkeleton
} from './shared/components/atomic';

// Services
import { ToastService } from './shared/services/toast.service';

// Semantic components  
import {
  RagCard, RagStatCard, RagFormField, RagTabs,
  RagDialog, RagDropdown, RagBreadcrumb
} from './shared/components/semantic';

// Composite components
import {
  FlowCard, ToolCard, KnowledgeBaseCard,
  CreateFlowWizard, FlowDesigner
} from './shared/components/composite';
```

### Basic Setup
```typescript
@Component({
  selector: 'app-example',
  imports: [RagButton, RagInput, RagCard, RagIcon], // Standalone components
  template: `
    <rag-card>
      <rag-input [placeholder]="'Enter text'" />
      <rag-button (onClick)="submit()">Submit</rag-button>
    </rag-card>
  `
})
export class ExampleComponent {
  private toastService = inject(ToastService);
  
  // Import specific icons needed
  readonly SaveIcon = SaveIcon;
  readonly SearchIcon = SearchIcon;
  
  submit() {
    // Show success toast
    this.toastService.success('Form submitted successfully!', 'Success');
  }
}
```

---

## ⚡ Most Used Patterns

### 1. Form with Validation
```html
<rag-card>
  <form [formGroup]="myForm">
    <!-- Text input with validation -->
    <rag-form-field 
      label="Email Address"
      [error]="getFieldError('email')"
      [required]="true">
      <rag-input 
        formControlName="email"
        [type]="'email'"
        [leftIcon]="'mail'"
        [error]="emailControl.invalid && emailControl.touched" />
    </rag-form-field>

    <!-- Select with search -->
    <rag-form-field label="Project">
      <rag-select 
        formControlName="project"
        [options]="projects"
        [searchable]="true"
        [placeholder]="'Select project...'" />
    </rag-form-field>

    <!-- Action buttons -->
    <div class="form-actions">
      <rag-button 
        variant="solid" 
        [loading]="isSubmitting()"
        [disabled]="myForm.invalid"
        (onClick)="submit()">
        Save Changes
      </rag-button>
      <rag-button variant="outline" (onClick)="cancel()">
        Cancel
      </rag-button>
    </div>
  </form>
</rag-card>

<!-- Toast notifications will appear automatically via service -->
```

```typescript
export class FormComponent {
  private toastService = inject(ToastService);
  
  async submit() {
    if (this.myForm.invalid) return;
    
    this.isSubmitting.set(true);
    
    try {
      await this.saveData(this.myForm.value);
      this.toastService.success('Changes saved successfully!', 'Success');
    } catch (error) {
      this.toastService.error('Failed to save changes. Please try again.', 'Error');
    } finally {
      this.isSubmitting.set(false);
    }
  }
  
  cancel() {
    if (this.myForm.dirty) {
      // Show confirmation toast with actions
      this.toastService.show({
        variant: 'warning',
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to cancel?',
        persistent: true,
        actions: [
          {
            label: 'Save & Exit',
            handler: () => this.submit(),
            variant: 'solid'
          },
          {
            label: 'Discard Changes',
            handler: () => this.discardAndExit(),
            variant: 'outline'
          },
          {
            label: 'Continue Editing',
            handler: () => {}, // Just dismisses the toast
            variant: 'ghost'
          }
        ]
      });
    } else {
      this.router.navigate(['/']);
    }
  }
}
```

### 2. Dashboard Cards with Metrics
```html
<div class="dashboard-grid">
  <!-- Stat cards -->
  <rag-stat-card [data]="{
    label: 'Active Users',
    value: 1234,
    change: { value: '+5.2%', trend: 'up' },
    icon: 'users'
  }" />

  <rag-stat-card [data]="{
    label: 'Total Documents',
    value: 856,
    icon: 'file-text'
  }" />

  <!-- Content card -->
  <rag-card variant="elevated" [interactive]="true">
    <h3>Recent Activity</h3>
    <div class="activity-list">
      @for (activity of recentActivities; track activity.id) {
        <div class="activity-item">
          <rag-chip variant="soft" [color]="activity.type">
            {{ activity.label }}
          </rag-chip>
          <span>{{ activity.description }}</span>
          <rag-timestamp [value]="activity.createdAt" format="relative" />
        </div>
      }
    </div>
  </rag-card>
</div>
```

### 3. Navigation with Page Headers, Tabs and Breadcrumbs
```html
<!-- Page header with actions -->
<rag-page-header
  [title]="'Complete Flows'"
  [description]="'End-to-end RAG processes combining tools, knowledge bases, and pipelines'"
  [icon]="GitBranchIcon"
  [actions]="[
    {
      label: 'Flow Designer',
      icon: LayoutIcon,
      variant: 'outline',
      action: () => openDesigner()
    },
    {
      label: 'Create Flow',
      icon: PlusIcon,
      variant: 'solid',
      action: () => openCreateWizard()
    }
  ]" />

<!-- Breadcrumb navigation -->
<rag-breadcrumb [items]="[
  { label: 'Dashboard', url: '/' },
  { label: 'Projects', url: '/projects' },
  { label: currentProject.name, current: true }
]" />

<!-- App-level navigation (with router links) -->
<rag-tab-navigation
  [items]="[
    { id: 'dashboard', label: 'Dashboard', icon: 'home', routerLink: '/' },
    { id: 'projects', label: 'Projects', icon: 'folder', routerLink: '/projects' },
    { id: 'settings', label: 'Settings', icon: 'settings', routerLink: '/settings' }
  ]"
  variant="primary"
  (itemClick)="onNavigation($event)" />

<!-- Page-level tabs (content switching) -->
<rag-tabs 
  [tabs]="[
    { id: 'overview', label: 'Overview', icon: 'eye' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'members', label: 'Members', icon: 'users' }
  ]"
  [activeTab]="currentTab()"
  (tabChange)="switchTab($event)" />

<!-- Tab content -->
<div class="tab-content">
  @switch (currentTab()) {
    @case ('overview') {
      <project-overview />
    }
    @case ('settings') {
      <project-settings />
    }
    @case ('members') {
      <project-members />
    }
  }
</div>
```

### 4. Modal Dialogs and Dropdowns
```html
<!-- Action dropdown -->
<rag-dropdown [items]="[
  { label: 'Edit', icon: 'edit', action: () => edit() },
  { label: 'Duplicate', icon: 'copy', action: () => duplicate() },
  { type: 'separator' },
  { label: 'Delete', icon: 'trash', action: () => confirmDelete(), danger: true }
]">
  <rag-button variant="ghost" [icon]="'more-vertical'">
    Actions
  </rag-button>
</rag-dropdown>

<!-- Opening dialogs via service (recommended) -->
<rag-button (click)="openConfirmDialog()" variant="solid" color="red">
  Delete Item
</rag-button>
```

```typescript
// Service-based dialog approach (recommended)
export class MyComponent {
  private dialogService = inject(RagDialogService);

  openConfirmDialog() {
    const dialogRef = this.dialogService.open(ConfirmDeleteDialogComponent, {
      title: 'Confirm Deletion',
      size: 'sm',
      data: { item: this.itemToDelete }
    });

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.performDelete();
      }
    });
  }
}

// Dialog component with rag-dialog wrapper
@Component({
  template: `
    <rag-dialog 
      title="Confirm Deletion"
      [showCloseButton]="true">
      
      <p>Are you sure you want to delete "{{ data?.item?.name }}"?</p>
      <rag-alert variant="warning" [icon]="'alert-triangle'">
        This action cannot be undone.
      </rag-alert>

      <div slot="footer" class="dialog-actions">
        <rag-button variant="outline" (click)="cancel()">
          Cancel
        </rag-button>
        <rag-button 
          variant="solid" 
          color="red"
          [loading]="isDeleting()"
          (click)="confirm()">
          Delete
        </rag-button>
      </div>
    </rag-dialog>
  `
})
export class ConfirmDeleteDialogComponent {
  private dialogRef = inject(DialogRef);
  data = inject(DIALOG_DATA, { optional: true });
  
  isDeleting = signal(false);

  cancel() {
    this.dialogRef.close(false);
  }

  confirm() {
    this.dialogRef.close(true);
  }
}
```

### 5. Toast Notifications (Service-based)
```typescript
// Toast service injection and usage
@Component({
  selector: 'app-actions',
  template: `
    <div class="action-buttons">
      <rag-button (onClick)="showSuccess()">Success Toast</rag-button>
      <rag-button (onClick)="showError()">Error Toast</rag-button>
      <rag-button (onClick)="showConfirmation()">Confirmation</rag-button>
      <rag-button (onClick)="showMultiple()">Multiple Toasts</rag-button>
      <rag-button (onClick)="clearAll()" variant="ghost">Clear All</rag-button>
    </div>
  `
})
export class ActionsComponent {
  private toastService = inject(ToastService);

  // Convenience methods
  showSuccess() {
    this.toastService.success(
      'Your operation completed successfully!', 
      'Success'
    );
  }

  showError() {
    this.toastService.error(
      'Something went wrong. Please try again.', 
      'Error'
    );
  }

  showInfo() {
    this.toastService.info(
      'New features are now available.', 
      'Information'
    );
  }

  showWarning() {
    this.toastService.warning(
      'Your session will expire in 5 minutes.', 
      'Warning'
    );
  }

  // Advanced usage with actions
  showConfirmation() {
    this.toastService.show({
      variant: 'warning',
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This cannot be undone.',
      persistent: true, // Won't auto-dismiss
      actions: [
        {
          label: 'Delete',
          handler: () => this.performDelete(),
          variant: 'solid'
        },
        {
          label: 'Cancel',
          handler: () => {}, // Just dismisses
          variant: 'ghost'
        }
      ]
    });
  }

  // Multiple stacked toasts
  showMultiple() {
    this.toastService.info('First notification');
    setTimeout(() => this.toastService.success('Second notification'), 500);
    setTimeout(() => this.toastService.warning('Third notification'), 1000);
  }

  // Clear all toasts
  clearAll() {
    this.toastService.dismissAll();
  }

  private performDelete() {
    // Simulate async operation
    this.toastService.info('Deleting item...', 'Processing');
    
    setTimeout(() => {
      this.toastService.success('Item deleted successfully!', 'Deleted');
    }, 2000);
  }
}
```

### 6. Loading States and Feedback
```html
<!-- Content loading with skeleton -->
@if (isLoading()) {
  <rag-card>
    <rag-skeleton variant="rectangular" width="100%" height="200px" />
    <rag-skeleton [count]="3" />
    <rag-skeleton width="60%" />
  </rag-card>
} @else {
  <rag-card>
    <!-- Actual content -->
  </rag-card>
}

<!-- Progress indication -->
<rag-card>
  <h3>Upload Progress</h3>
  <rag-progress 
    [value]="uploadProgress()"
    [max]="100"
    variant="primary"
    [showLabel]="true" />
  
  @if (uploadComplete()) {
    <rag-alert variant="success" [closable]="true">
      <rag-icon [img]="CheckCircleIcon" size="sm"></rag-icon>
      Upload completed successfully!
    </rag-alert>
  }
</rag-card>

<!-- Button loading states -->
<rag-button 
  [loading]="isSaving()"
  [disabled]="isSaving() || form.invalid"
  (onClick)="save()">
  {{ isSaving() ? 'Saving...' : 'Save Changes' }}
</rag-button>
```

---

## 🎨 Component Categories

### 🎯 Atomic Components (UI Primitives)
| Component | Quick Example | Most Common Props |
|-----------|---------------|-------------------|
| `<rag-button>` | `<rag-button variant="solid">Save</rag-button>` | `variant`, `loading`, `disabled` |
| `<rag-input>` | `<rag-input [placeholder]="'Email'" [leftIcon]="'mail'">` | `type`, `error`, `leftIcon` |
| `<rag-select>` | `<rag-select [options]="items" [searchable]="true">` | `options`, `searchable`, `clearable` |
| `<rag-chip>` | `<rag-chip color="green">Active</rag-chip>` | `variant`, `color`, `icon` |
| `<rag-alert>` | `<rag-alert variant="success">Success!</rag-alert>` | `variant`, `closable`, `title` |
| `<rag-toast>` | `toastService.success('Done!', 'Success')` | Service-based, `variant`, `actions` |
| `<rag-icon>` | `<rag-icon [img]="CheckIcon" variant="success">` | `img`, `size`, `variant` |

### 📊 Semantic Components (Business Logic)
| Component | Quick Example | Most Common Props |
|-----------|---------------|-------------------|
| `<rag-card>` | `<rag-card variant="elevated">Content</rag-card>` | `variant`, `interactive`, `padding` |
| `<rag-stat-card>` | `<rag-stat-card [data]="metric">` | `data`, `size`, `variant` |
| `<rag-form-field>` | `<rag-form-field label="Name" [error]="err">` | `label`, `error`, `required` |
| `<rag-tabs>` | `<rag-tabs [tabs]="items" (tabChange)="change">` | `tabs`, `activeTab`, `variant` |
| `<rag-tab-navigation>` | `<rag-tab-navigation [items]="navItems">` | `items`, `variant`, `activeItem` |
| `<rag-page-header>` | `<rag-page-header [title]="'Page'" [actions]="acts">` | `title`, `description`, `actions` |
| `<rag-dialog>` | `<rag-dialog [open]="show" title="Edit">` | `open`, `title`, `size` |
| `<rag-breadcrumb>` | `<rag-breadcrumb [items]="path">` | `items`, `separator`, `maxItems` |

---

## 🎯 Component Variants Reference

### Button Variants
```html
<!-- Visual styles -->
<rag-button variant="solid">Primary Action</rag-button>
<rag-button variant="outline">Secondary</rag-button>
<rag-button variant="ghost">Subtle</rag-button>
<rag-button variant="soft">Soft Background</rag-button>

<!-- Sizes -->
<rag-button size="xs">Tiny</rag-button>
<rag-button size="sm">Small</rag-button>
<rag-button size="md">Medium</rag-button>  <!-- default -->
<rag-button size="lg">Large</rag-button>
<rag-button size="xl">Extra Large</rag-button>

<!-- States -->
<rag-button [loading]="true">Loading...</rag-button>
<rag-button [disabled]="true">Disabled</rag-button>
<rag-button [fullWidth]="true">Full Width</rag-button>
```

### Badge Variants  
```html
<!-- Visual styles -->
<rag-chip variant="solid" color="blue">Solid</rag-chip>
<rag-chip variant="soft" color="green">Soft</rag-chip>
<rag-chip variant="outline" color="amber">Outline</rag-chip>

<!-- Status colors -->
<rag-chip color="green">Success</rag-chip>
<rag-chip color="amber">Warning</rag-chip>
<rag-chip color="red">Error</rag-chip>
<rag-chip color="blue">Info</rag-chip>

<!-- With icons -->
<rag-chip [icon]="'check'" color="green">Completed</rag-chip>
<rag-chip [dot]="true" color="red">Error</rag-chip>
```

### Alert Variants
```html
<!-- Message types -->
<rag-alert variant="info">Information message</rag-alert>
<rag-alert variant="success">Success message</rag-alert>
<rag-alert variant="warning">Warning message</rag-alert>
<rag-alert variant="error">Error message</rag-alert>

<!-- With titles and actions -->
<rag-alert variant="warning" title="Important Notice" [closable]="true">
  Please review your settings before continuing.
</rag-alert>
```

### Card Variants
```html
<!-- Visual styles -->
<rag-card variant="default">Standard card</rag-card>
<rag-card variant="elevated">Elevated card</rag-card>
<rag-card variant="outlined">Outlined card</rag-card>

<!-- Interactive cards -->
<rag-card [interactive]="true" (click)="selectCard()">
  Clickable card content
</rag-card>

<!-- No padding for images -->
<rag-card [padding]="false">
  <img src="image.jpg" alt="Full width image">
  <div class="card-content">Content with custom padding</div>
</rag-card>
```

---

## 📝 Form Patterns

### Reactive Forms Integration
```typescript
// Component setup with icon imports
export class FormComponent {
  // Import specific icons needed
  readonly CheckCircleIcon = CheckCircleIcon;
  readonly UserIcon = UserIcon;
  readonly TrashIcon = TrashIcon;
  
  form = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['user'],
    notifications: [true]
  });

  get nameError() {
    const control = this.form.get('name');
    if (control?.hasError('required') && control.touched) {
      return 'Name is required';
    }
    return null;
  }
}
```

```html
<!-- Template -->
<form [formGroup]="form" (ngSubmit)="submit()">
  <rag-form-field 
    label="Full Name"
    [error]="nameError"
    [required]="true">
    <rag-input formControlName="name" [placeholder]="'Enter name'" />
  </rag-form-field>

  <rag-form-field label="Email">
    <rag-input 
      formControlName="email"
      [type]="'email'"
      [leftIcon]="'mail'" />
  </rag-form-field>

  <rag-form-field label="Role">
    <rag-select 
      formControlName="role"
      [options]="roleOptions" />
  </rag-form-field>

  <rag-form-field label="Settings">
    <rag-checkbox 
      formControlName="notifications"
      [label]="'Email notifications'" />
  </rag-form-field>
</form>
```

### Search and Filter Patterns
```html
<!-- Search input with debouncing -->
<rag-search-input 
  [placeholder]="'Search documents...'"
  [debounceTime]="500"
  (search)="performSearch($event)"
  (clear)="clearSearch()" />

<!-- Filter dropdowns -->
<div class="filters">
  <rag-select 
    [options]="statusOptions"
    [placeholder]="'All statuses'"
    [clearable]="true"
    (valueChange)="filterByStatus($event)" />
    
  <rag-select 
    [options]="tagOptions"
    [placeholder]="'Select tags'"
    [clearable]="true"
    (valueChange)="filterByTags($event)" />
</div>
```

---

## 🚀 Performance Tips

### 1. Use Signals for Reactivity
```typescript
// ✅ Reactive with signals
export class Component {
  data = signal<Item[]>([]);
  filteredData = computed(() => 
    this.data().filter(item => item.active)
  );
  loading = signal(false);
}
```

### 2. Track Functions for Lists
```typescript
// ✅ Efficient list rendering
readonly trackByFn = (index: number, item: Item) => item.id;

// Template
@for (item of items(); track trackByFn($index, item)) {
  <rag-card>{{ item.name }}</rag-card>
}
```

### 3. Lazy Loading Heavy Components  
```html
<!-- ✅ Conditional rendering -->
@if (showAdvanced()) {
  <expensive-component />
} @else {
  <rag-button (onClick)="showAdvanced.set(true)">
    Show Advanced Options
  </rag-button>
}
```

### 4. Debounce User Input
```html
<!-- ✅ Built-in debouncing -->
<rag-search-input 
  [debounceTime]="300"
  (search)="onSearch($event)" />
```

---

## 🔧 Common Issues & Quick Fixes

### Form Validation Not Showing
```typescript
// ❌ Wrong
get hasError() {
  return this.control.invalid;
}

// ✅ Correct - check touched state
get hasError() {
  return this.control.invalid && this.control.touched;
}
```

### Select Options Not Updating
```typescript
// ❌ Wrong - mutating array
updateOptions() {
  this.options.push(newOption);
}

// ✅ Correct - new array reference
updateOptions() {
  this.options = [...this.options, newOption];
}
```

### Icons Not Displaying
```html
<!-- ❌ Wrong - using old name attribute -->
<rag-icon name="check" />

<!-- ✅ Correct - import icon and use img attribute -->
<rag-icon [img]="CheckIcon" />
```

```typescript
// Component must import specific icons
import { CheckIcon } from 'lucide-angular';

@Component({
  template: `<rag-icon [img]="CheckIcon" />`
})
export class MyComponent {
  readonly CheckIcon = CheckIcon;
}
```

### Button Loading State
```html
<!-- ❌ Wrong - no loading feedback -->
<rag-button (onClick)="save()">Save</rag-button>

<!-- ✅ Correct - show loading state -->
<rag-button [loading]="isSaving()" (onClick)="save()">
  Save
</rag-button>
```

### Toast Service Missing
```typescript
// ❌ Wrong - not providing feedback to user
async saveData() {
  try {
    await this.api.save(this.data);
    // No feedback to user
  } catch (error) {
    // Error ignored
  }
}

// ✅ Correct - proper user feedback
async saveData() {
  try {
    await this.api.save(this.data);
    this.toastService.success('Data saved successfully!', 'Success');
  } catch (error) {
    this.toastService.error('Failed to save data. Please try again.', 'Error');
  }
}
```

---

## 🎨 Design System Hierarchy

```
🏗️ Composite Components (Complex features)
    ↓ compose
📊 Semantic Components (Business logic)
    ↓ compose  
🎯 Atomic Components (UI primitives)
    ↓ use
🎨 Design Tokens (Consistent styling)
```

### When to Use Each Level

| Level | Use When | Examples |
|-------|----------|----------|
| **Composite** | Building complete features | `<create-flow-wizard>`, `<flow-designer>` |
| **Semantic** | Domain-specific UI patterns | `<rag-stat-card>`, `<rag-form-field>` |
| **Atomic** | Basic UI elements | `<rag-button>`, `<rag-input>` |

---

## 📚 Documentation Links

| Resource | Purpose | Quick Access |
|----------|---------|--------------|
| **[Atomic Components Reference](./ATOMIC_COMPONENTS_REFERENCE.md)** | Complete API for UI primitives | Button, Input, Select, Badge, etc. |
| **[Semantic Components Reference](./SEMANTIC_COMPONENTS_REFERENCE.md)** | Business logic components | Card, StatCard, FormField, Dialog, etc. |
| **[Full Atomic Documentation](./ATOMIC_COMPONENTS.md)** | Detailed atomic components guide | Complete specifications and examples |
| **[Full Semantic Documentation](./SEMANTIC_COMPONENTS.md)** | Detailed semantic components guide | Advanced patterns and integrations |
| **[Design Tokens Guide](./DESIGN_TOKENS_GUIDE.md)** | Styling system documentation | Colors, spacing, typography tokens |
| **[Component Demos](../src/app/pages/design-system)** | Live interactive examples | See components in action |

---

## 🎯 Quick Lookup Tables

### Component Size Scale
| Size | Typical Use | Example |
|------|-------------|---------|
| `xs` | Icons in text, tiny chips | `<rag-icon size="xs">` |
| `sm` | Compact interfaces, table cells | `<rag-button size="sm">` |  
| `md` | Default size (most common) | `<rag-input size="md">` |
| `lg` | Prominent elements, CTAs | `<rag-button size="lg">` |
| `xl` | Hero elements, large targets | `<rag-button size="xl">` |

### Semantic Color Meaning
| Color | Semantic Usage | Component Examples |
|-------|---------------|-------------------|
| `gray` | Neutral, default | `<rag-chip color="gray">` |
| `blue` | Primary, information | `<rag-alert variant="info">` |
| `green` | Success, positive | `<rag-chip color="green">` |
| `amber` | Warning, caution | `<rag-alert variant="warning">` |
| `red` | Error, destructive | `<rag-button color="red">` |
| `orange` | Alert, attention | `<rag-chip color="orange">` |
| `purple` | Special, premium | `<rag-chip color="purple">` |

### Icon Size Reference
| Size | Pixels | Use Case |
|------|--------|----------|
| `xs` | 12px | Text inline icons |
| `sm` | 16px | Button icons, form icons |
| `md` | 20px | Default icons |  
| `lg` | 24px | Header icons, important actions |
| `xl` | 28px | Large interface elements |

### ToastService API Reference
| Method | Usage | Returns |
|--------|-------|---------|
| `info(msg, title?, config?)` | Information toast | `string` (toast ID) |
| `success(msg, title?, config?)` | Success toast | `string` (toast ID) |
| `warning(msg, title?, config?)` | Warning toast | `string` (toast ID) |
| `error(msg, title?, config?)` | Error toast (persistent) | `string` (toast ID) |
| `show(config)` | Custom toast | `string` (toast ID) |
| `dismiss(id)` | Remove specific toast | `void` |
| `dismissAll()` | Remove all toasts | `void` |

### Toast Configuration Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `variant` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Toast type |
| `title` | `string` | - | Toast title |
| `message` | `string` | - | Toast message |
| `duration` | `number` | `5000` | Auto-dismiss time (ms) |
| `persistent` | `boolean` | `false` | Prevent auto-dismiss |
| `dismissible` | `boolean` | `true` | Show close button |
| `actions` | `RagToastAction[]` | `[]` | Action buttons |

---

## 🧪 Testing Patterns

### Component Testing
```typescript
// Test button interactions
it('should emit click event', () => {
  const clickSpy = jasmine.createSpy();
  component.onClick.subscribe(clickSpy);
  
  const button = fixture.debugElement.query(By.css('rag-button'));
  button.nativeElement.click();
  
  expect(clickSpy).toHaveBeenCalled();
});

// Test form integration
it('should integrate with reactive forms', () => {
  const form = new FormGroup({
    email: new FormControl('test@example.com')
  });
  
  component.form = form;
  fixture.detectChanges();
  
  const input = fixture.debugElement.query(By.css('rag-input'));
  expect(input.componentInstance.value).toBe('test@example.com');
});
```

### Accessibility Testing
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const results = await axe(fixture.nativeElement);
  expect(results).toHaveNoViolations();
});
```

---

## 🔗 Component Integration Examples

### Complete Form Example
```html
<rag-card>
  <form [formGroup]="userForm" (ngSubmit)="saveUser()">
    <div class="form-header">
      <h2>User Information</h2>
      <rag-chip color="blue">Required</rag-chip>
    </div>

    <div class="form-grid">
      <rag-form-field label="Full Name" [required]="true" [error]="getError('name')">
        <rag-input formControlName="name" [placeholder]="'Enter full name'" />
      </rag-form-field>

      <rag-form-field label="Email" [required]="true" [error]="getError('email')">
        <rag-input formControlName="email" [type]="'email'" [leftIcon]="'mail'" />
      </rag-form-field>

      <rag-form-field label="Role">
        <rag-select formControlName="role" [options]="roleOptions" />
      </rag-form-field>

      <rag-form-field label="Department">
        <rag-select 
          formControlName="department" 
          [options]="departmentOptions"
          [searchable]="true" />
      </rag-form-field>
    </div>

    <div class="form-actions">
      <rag-button type="submit" [loading]="isSaving()" [disabled]="userForm.invalid">
        Save User
      </rag-button>
      <rag-button variant="outline" (onClick)="cancel()">
        Cancel
      </rag-button>
    </div>
  </form>
</rag-card>
```

---

**Last Updated**: September 1, 2025  
**Components Covered**: 16 atomic + 17 semantic + composite components
