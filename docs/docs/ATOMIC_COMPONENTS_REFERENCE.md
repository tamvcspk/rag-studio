# Atomic Components - Quick Reference Guide

Quick lookup reference for all RAG Studio atomic components with essential information for developers.

## ⚠️ Important: Icon Component Usage

**RagIcon now requires specific icon imports!** The component no longer accepts a `name` prop. Instead:

```typescript
// ❌ Old way (no longer works)
<rag-icon name="check" />

// ✅ New way (required)
import { CheckIcon } from 'lucide-angular';

@Component({
  template: `<rag-icon [img]="CheckIcon" />`
})
export class MyComponent {
  readonly CheckIcon = CheckIcon;
}
```

This change provides better tree-shaking and type safety by only importing icons you actually use.

---

## 📋 Component Index

### 🎯 Primitive Components (14 components)
| Component | Purpose | Key Props | Use Case |
|-----------|---------|-----------|----------|
| `<rag-button>` | Action triggers | `variant`, `size`, `loading`, `disabled` | Forms, CTAs, navigation |
| `<rag-input>` | Text input | `type`, `placeholder`, `leftIcon`, `rightIcon` | Forms, search, data entry |
| `<rag-textarea>` | Multi-line text | `rows`, `resize`, `maxlength` | Comments, descriptions |
| `<rag-select>` | Dropdown selection | `options`, `searchable`, `clearable` | Forms, filters |
| `<rag-checkbox>` | Boolean selection | `checked`, `indeterminate`, `label` | Forms, bulk actions |
| `<rag-radio>` | Single selection | `value`, `name`, `checked` | Forms, settings |
| `<rag-switch>` | Toggle control | `checked`, `size`, `label` | Settings, features |
| `<rag-toggle>` | Toggle with custom text | `variant`, `onText`, `offText`, `color` | Settings, boolean controls |
| `<rag-slider>` | Range value selection | `min`, `max`, `step`, `unit`, `showValue` | Volume, brightness, ranges |
| `<rag-chip>` | Status/count display | `variant`, `color`, `icon`, `dot` | Status, notifications |
| `<rag-progress>` | Progress indication | `value`, `max`, `variant`, `indeterminate` | Loading, completion |
| `<rag-skeleton>` | Loading placeholder | `width`, `height`, `variant`, `count` | Loading states |
| `<rag-icon>` | Icon display | `img`, `size`, `variant`, `color` | UI decoration, actions |
| `<rag-overflow-bar>` | Horizontal scroll navigation | `scrollAmount`, `hideButtons` | Tabs, chips, horizontal lists |
| `<rag-divider>` | Visual separation | `orientation`, `variant`, `label`, `spacing` | Section dividers, content separation |
| `<rag-toggle-group>` | Multi-option selection | `options`, `multiple`, `variant`, `size` | Settings, filters, tool selection |

### 🔔 Feedback Components (4 components)
| Component | Purpose | Key Props | Use Case |
|-----------|---------|-----------|----------|
| `<rag-alert>` | Important messages | `variant`, `title`, `closable`, `icon` | Notifications, warnings |
| `<rag-toast>` | Overlay-based notifications | `variant`, `duration`, `dismissible`, `actions` | Service-managed notifications |
| `<rag-tooltip>` | Contextual help | `content`, `placement`, `trigger` | Help text, descriptions |
| `<rag-status-indicator>` | System status | `status`, `label`, `size`, `variant` | Health, connection status |

### 🎛️ Utility Components (1 component)
| Component | Purpose | Key Props | Use Case |
|-----------|---------|-----------|----------|
| `<rag-spinner>` | Loading indicator | `size`, `color` | Loading states |

---

## 🏷️ Type Definitions Quick Reference

### Primitive Component Types
```typescript
// RagButton
type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// RagInput
type InputType = 'text' | 'email' | 'password' | 'number' | 'search';
type InputSize = 'sm' | 'md' | 'lg';

// RagSelect
interface RagSelectOption<T = any> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}

// RagChip
type BadgeVariant = 'solid' | 'soft' | 'outline';
type BadgeColor = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'purple';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// RagProgress
type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';

// RagIcon
type IconSize = number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type IconVariant = 'default' | 'subtle' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';

// RagDivider
type RagDividerOrientation = 'horizontal' | 'vertical';
type RagDividerVariant = 'solid' | 'dashed' | 'dotted';

// RagToggleGroup
interface RagToggleGroupOption<T = string> {
  value: T;
  label: string;
  icon?: any; // Lucide icon
  disabled?: boolean;
}
type RagToggleGroupSize = 'sm' | 'md' | 'lg';
type RagToggleGroupVariant = 'default' | 'outline' | 'ghost';
```

### Feedback Component Types
```typescript
// RagAlert
type AlertVariant = 'info' | 'success' | 'warning' | 'error';

// RagToast
type ToastVariant = 'info' | 'success' | 'warning' | 'error';
interface RagToastAction {
  label: string;
  handler: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
}

// ToastService Configuration
interface ToastConfig {
  variant?: ToastVariant;
  title?: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  dismissible?: boolean;
  actions?: RagToastAction[];
}

// RagToggle
type ToggleVariant = 'solid' | 'soft' | 'outline';
type ToggleColor = 'blue' | 'green' | 'red';
type ToggleSize = 'sm' | 'md' | 'lg';

// RagSlider
type SliderSize = 'sm' | 'md' | 'lg';
type SliderColor = 'blue' | 'green' | 'red';

// RagStatusIndicator
type StatusType = 'online' | 'offline' | 'loading' | 'error' | 'warning';
type StatusVariant = 'dot' | 'chip' | 'text';
```

---

## 🎯 Common Usage Patterns

### 1. Form Input Patterns
```html
<!-- Basic input with validation -->
<rag-input 
  [placeholder]="'Enter email'"
  [type]="'email'"
  [error]="emailControl.invalid && emailControl.touched"
  [formControl]="emailControl" />

<!-- Input with icons -->
<rag-input 
  [leftIcon]="'search'"
  [rightIcon]="'x'"
  [placeholder]="'Search...'"
  (onRightIconClick)="clearSearch()" />

<!-- Password input with toggle -->
<rag-input 
  [type]="showPassword ? 'text' : 'password'"
  [rightIcon]="showPassword ? 'eye-off' : 'eye'"
  (onRightIconClick)="togglePassword()" />
```

### 2. Button Action Groups
```html
<!-- Primary and secondary actions -->
<div class="button-group">
  <rag-button variant="solid" [loading]="isSaving" (onClick)="save()">
    Save Changes
  </rag-button>
  <rag-button variant="outline" (onClick)="cancel()">
    Cancel
  </rag-button>
</div>

<!-- Destructive action -->
<rag-button variant="solid" color="red" (onClick)="delete()">
  <rag-icon [img]="TrashIcon" size="sm"></rag-icon>
  Delete
</rag-button>
```

### 3. Status and Feedback
```html
<!-- Status chips -->
<rag-chip variant="soft" color="green">
  <rag-icon [img]="CheckIcon" size="xs"></rag-icon>
  Active
</rag-chip>

<rag-chip variant="soft" color="amber" [dot]="true">
  Pending
</rag-chip>

<!-- Alert messages -->
<rag-alert variant="success" [closable]="true">
  <rag-icon [img]="CheckCircleIcon" size="sm"></rag-icon>
  Settings saved successfully!
</rag-alert>

<rag-alert variant="error" title="Validation Error">
  Please fix the following errors before continuing.
</rag-alert>
```

### 4. Form Controls
```html
<!-- Select with search -->
<rag-select 
  [options]="userOptions"
  [searchable]="true"
  [clearable]="true"
  [placeholder]="'Select user...'"
  (valueChange)="onUserSelect($event)"
  (onSearch)="filterUsers($event)" />

<!-- Checkbox group -->
<div class="checkbox-group">
  <rag-checkbox 
    [label]="'Send notifications'"
    [formControl]="notificationsControl" />
  <rag-checkbox 
    [label]="'Enable analytics'"
    [formControl]="analyticsControl" />
</div>

<!-- Radio group -->
<div class="radio-group">
  <rag-radio 
    [name]="'theme'"
    [value]="'light'"
    [label]="'Light theme'"
    [formControl]="themeControl" />
  <rag-radio
    [name]="'theme'"
    [value]="'dark'"
    [label]="'Dark theme'"
    [formControl]="themeControl" />
</div>

<!-- Toggle controls -->
<rag-toggle
  [label]="'Dark Mode'"
  [onText]="'ON'"
  [offText]="'OFF'"
  [variant]="'soft'"
  [color]="'blue'"
  (onToggle)="toggleDarkMode($event)" />

<!-- Range sliders -->
<rag-slider
  [label]="'Volume'"
  [min]="0"
  [max]="100"
  [step]="5"
  [unit]="'%'"
  [color]="'green'"
  (valueChange)="onVolumeChange($event)" />

<rag-slider
  [label]="'Font Size'"
  [min]="12"
  [max]="24"
  [step]="1"
  [unit]="'px'"
  [color]="'blue'"
  [size]="'lg'" />
```

### 5. Loading States
```html
<!-- Button loading -->
<rag-button [loading]="isSubmitting" [disabled]="isSubmitting">
  {{ isSubmitting ? 'Saving...' : 'Save' }}
</rag-button>

<!-- Progress bar -->
<rag-progress 
  [value]="uploadProgress"
  [max]="100"
  variant="primary"
  [showLabel]="true" />

<!-- Skeleton loading -->
<div class="content-skeleton">
  <rag-skeleton variant="rectangular" width="100%" height="200px" />
  <rag-skeleton [count]="3" />
  <rag-skeleton width="60%" />
</div>

<!-- Spinner -->
<div class="loading-state">
  <rag-spinner size="lg"></rag-spinner>
  <p>Loading data...</p>
</div>
```

### 6. Visual Separation and Layout
```html
<!-- Divider with label -->
<rag-divider [label]="'Settings'"></rag-divider>

<!-- Different orientations -->
<rag-divider orientation="horizontal"></rag-divider>
<rag-divider orientation="vertical"></rag-divider>

<!-- Different variants -->
<rag-divider variant="solid"></rag-divider>
<rag-divider variant="dashed"></rag-divider>
<rag-divider variant="dotted"></rag-divider>

<!-- Custom spacing -->
<rag-divider spacing="lg" [label]="'Advanced Options'"></rag-divider>
```

### 7. Toggle Groups for Multiple Selection
```html
<!-- Single selection toggle group -->
<rag-toggle-group 
  [options]="themeOptions"
  (valueChange)="onThemeChange($event)">
</rag-toggle-group>

<!-- Multiple selection with icons -->
<rag-toggle-group 
  [options]="toolOptions"
  [multiple]="true"
  variant="outline"
  size="lg"
  (valueChange)="onToolsChange($event)">
</rag-toggle-group>

<!-- Disabled options -->
<rag-toggle-group 
  [options]="statusOptions"
  [disabled]="isLoading()"
  (valueChange)="onStatusChange($event)">
</rag-toggle-group>
```

```typescript
// Component must define options
readonly themeOptions = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon }
];

readonly toolOptions = [
  { value: 'search', label: 'Search', icon: SearchIcon },
  { value: 'filter', label: 'Filter', icon: FilterIcon },
  { value: 'sort', label: 'Sort', icon: ArrowUpDownIcon },
  { value: 'export', label: 'Export', icon: DownloadIcon, disabled: true }
];

onThemeChange(theme: string | null) {
  if (theme) {
    this.setTheme(theme);
  }
}

onToolsChange(tools: string[] | null) {
  this.activeTools.set(tools || []);
}
```

### 8. Icon Usage
```html
<!-- Semantic colors -->
<rag-icon [img]="CheckCircleIcon" variant="success" />
<rag-icon [img]="AlertTriangleIcon" variant="warning" />
<rag-icon [img]="XCircleIcon" variant="danger" />

<!-- Sizes -->
<rag-icon [img]="UserIcon" size="xs" />  <!-- 12px -->
<rag-icon [img]="UserIcon" size="sm" />  <!-- 16px -->
<rag-icon [img]="UserIcon" size="md" />  <!-- 20px -->
<rag-icon [img]="UserIcon" size="lg" />  <!-- 24px -->
<rag-icon [img]="UserIcon" size="xl" />  <!-- 28px -->

<!-- Custom size and color -->
<rag-icon [img]="StarIcon" [size]="32" color="#fbbf24" />
```

```typescript
// Component must import specific icons
import { 
  CheckCircleIcon, AlertTriangleIcon, XCircleIcon, 
  UserIcon, StarIcon 
} from 'lucide-angular';

@Component({
  template: `<!-- icon usage above -->`
})
export class IconExampleComponent {
  readonly CheckCircleIcon = CheckCircleIcon;
  readonly AlertTriangleIcon = AlertTriangleIcon;
  readonly XCircleIcon = XCircleIcon;
  readonly UserIcon = UserIcon;
  readonly StarIcon = StarIcon;
}
```

---

## 📢 Toast Service Usage

The `ToastService` provides Angular CDK Overlay-based toast management with stacking and auto-dismiss features:

```typescript
// Inject the service
import { ToastService } from '../shared/services/toast.service';

@Component({
  // ...
})
export class MyComponent {
  private toastService = inject(ToastService);

  // Convenience methods
  showSuccess() {
    this.toastService.success('Operation completed!', 'Success');
  }

  showError() {
    this.toastService.error('Something went wrong', 'Error');
  }

  showInfo() {
    this.toastService.info('New feature available', 'Info');
  }

  showWarning() {
    this.toastService.warning('Please review changes', 'Warning');
  }

  // Custom configuration
  showCustomToast() {
    this.toastService.show({
      variant: 'info',
      title: 'Confirm Action',
      message: 'Are you sure you want to proceed?',
      persistent: true,
      actions: [
        {
          label: 'Yes',
          handler: () => this.proceedAction(),
          variant: 'solid'
        },
        {
          label: 'Cancel',
          handler: () => console.log('Cancelled'),
          variant: 'ghost'
        }
      ]
    });
  }

  // Dismiss specific or all toasts
  dismissAllToasts() {
    this.toastService.dismissAll();
  }
}
```

### ToastService Methods
```typescript
// Convenience methods
toastService.info(message: string, title?: string, config?: Partial<ToastConfig>): string
toastService.success(message: string, title?: string, config?: Partial<ToastConfig>): string
toastService.warning(message: string, title?: string, config?: Partial<ToastConfig>): string
toastService.error(message: string, title?: string, config?: Partial<ToastConfig>): string

// Full configuration
toastService.show(config: ToastConfig): string

// Management
toastService.dismiss(id: string): void
toastService.dismissAll(): void
```

### Toast Features
- **Stacking**: Multiple toasts appear in a vertical stack
- **Auto-dismiss**: Configurable duration (default 5 seconds)
- **Persistent**: Toasts that don't auto-dismiss
- **Actions**: Custom action buttons with handlers
- **Hover pause**: Auto-dismiss pauses on hover
- **Angular CDK Overlay**: Proper z-index and positioning

---

## 🎨 Styling & Customization

### Design Token Integration
```scss
// All components use design tokens
.rag-button {
  // Size tokens
  padding: var(--rag-primitive-spacing-sm) var(--rag-primitive-spacing-md);
  
  // Color tokens
  background: var(--rag-semantic-color-primary-500);
  color: var(--rag-semantic-color-primary-foreground);
  
  // Typography tokens
  font-size: var(--rag-primitive-fontSize-sm);
  font-weight: var(--rag-primitive-fontWeight-medium);
  
  // Radius tokens
  border-radius: var(--rag-primitive-radius-md);
}
```

### Component Variants
```scss
// Button variants
.rag-button {
  &--solid {
    background: var(--rag-semantic-color-primary-500);
    color: var(--rag-primitive-color-white);
  }
  
  &--outline {
    background: transparent;
    border: 1px solid var(--rag-semantic-color-border-default);
    color: var(--rag-semantic-color-text-default);
  }
  
  &--ghost {
    background: transparent;
    color: var(--rag-semantic-color-text-subtle);
    
    &:hover {
      background: var(--rag-semantic-color-background-hover);
    }
  }
}
```

### Custom Styling
```scss
// Override component styles
:host ::ng-deep {
  .rag-input {
    &.custom-search {
      border-radius: var(--rag-primitive-radius-full);
      padding-left: var(--rag-primitive-spacing-xl);
    }
  }
}
```

---

## 🧪 Testing Helpers

### Component Testing Utilities
```typescript
// Button testing
function clickButton(fixture: ComponentFixture<any>, selector: string) {
  const button = fixture.debugElement.query(By.css(selector));
  button.nativeElement.click();
  fixture.detectChanges();
}

// Input testing
function setInputValue(fixture: ComponentFixture<any>, selector: string, value: string) {
  const input = fixture.debugElement.query(By.css(selector));
  input.nativeElement.value = value;
  input.nativeElement.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

// Select testing
function selectOption(fixture: ComponentFixture<any>, selector: string, optionIndex: number) {
  const select = fixture.debugElement.query(By.css(selector));
  const options = select.queryAll(By.css('option'));
  options[optionIndex].nativeElement.selected = true;
  select.nativeElement.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}
```

### Form Testing
```typescript
describe('Form Integration', () => {
  it('should validate required input', () => {
    const form = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email])
    });
    
    component.form = form;
    fixture.detectChanges();
    
    // Test empty state
    expect(form.get('email')?.invalid).toBe(true);
    
    // Test valid email
    form.get('email')?.setValue('user@example.com');
    expect(form.get('email')?.valid).toBe(true);
  });
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

## 🚀 Performance Tips

### 1. Use OnPush Change Detection
```typescript
@Component({
  selector: 'app-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rag-input [value]="inputValue()" (valueChange)="updateValue($event)" />
  `
})
export class FormComponent {
  inputValue = signal('');
  
  updateValue(value: string) {
    this.inputValue.set(value);
  }
}
```

### 2. Optimize Large Option Lists
```html
<!-- Use virtual scrolling for large lists -->
<rag-select [options]="options()">
  <cdk-virtual-scroll-viewport itemSize="32">
    <ng-container *cdkVirtualFor="let option of options()">
      <option [value]="option.value">{{ option.label }}</option>
    </ng-container>
  </cdk-virtual-scroll-viewport>
</rag-select>
```

### 3. Debounce Input Events
```typescript
// Built-in debouncing
<rag-input 
  [debounceTime]="300"
  (valueChange)="onSearch($event)" />

// Manual debouncing
private searchSubject = new Subject<string>();

ngOnInit() {
  this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged()
  ).subscribe(term => this.performSearch(term));
}
```

### 4. Lazy Load Heavy Components
```typescript
// Lazy load heavy form components
@Component({
  template: `
    @if (showAdvancedOptions()) {
      <rag-select [options]="expensiveOptions" />
    } @else {
      <rag-button (onClick)="loadAdvancedOptions()">
        Show Advanced Options
      </rag-button>
    }
  `
})
```

---

## 🔧 Common Issues & Solutions

### Issue: Form validation not displaying
```typescript
// ❌ Wrong: Not checking touched state
get hasError() {
  return this.control.invalid;
}

// ✅ Correct: Check both invalid and touched
get hasError() {
  return this.control.invalid && this.control.touched;
}
```

### Issue: Select options not updating
```typescript
// ❌ Wrong: Mutating array reference
updateOptions() {
  this.options.push(newOption);
}

// ✅ Correct: Create new array reference
updateOptions() {
  this.options = [...this.options, newOption];
}
```

### Issue: Button not showing loading state
```html
<!-- ❌ Wrong: Not handling async operations -->
<rag-button (onClick)="save()">Save</rag-button>

<!-- ✅ Correct: Track loading state -->
<rag-button [loading]="isSaving()" (onClick)="save()">
  Save
</rag-button>
```

### Issue: Icons not displaying
```html
<!-- ❌ Wrong: Using old name attribute -->
<rag-icon name="check" />

<!-- ✅ Correct: Import icon and use img attribute -->
<rag-icon [img]="CheckIcon" />
```

```typescript
// Component must import specific icons
import { CheckIcon, CheckCircleIcon } from 'lucide-angular';

@Component({
  imports: [RagIcon],
  template: `
    <rag-icon [img]="CheckIcon" />
    <rag-icon [img]="CheckCircleIcon" />
  `
})
export class MyComponent {
  readonly CheckIcon = CheckIcon;
  readonly CheckCircleIcon = CheckCircleIcon;
}
```

### Issue: Performance with large forms
```scss
/* ❌ Wrong: Heavy CSS selectors */
.form-container input[type="text"]:focus:invalid {
  border-color: red;
}

/* ✅ Correct: Use component classes */
.rag-input--error {
  border-color: var(--rag-semantic-color-danger-700);
}
```

---

## 📚 Related Documentation

- **[Atomic Components Full Documentation](./ATOMIC_COMPONENTS.md)** - Complete API reference
- **[Semantic Components Reference](./SEMANTIC_COMPONENTS_REFERENCE.md)** - Higher-level components
- **[Design Tokens Guide](./DESIGN_TOKENS_GUIDE.md)** - Styling system
- **[Component Demos](../src/app/pages/design-system)** - Live examples

---

## 🎯 Design System Integration

### Component Hierarchy
```
Semantic Components (Business logic)
    ↓ compose
Atomic Components (UI primitives)  ← You are here
    ↓ use
Design Tokens (Consistent styling)
```

### Token Usage Examples
```html
<!-- Components automatically use design tokens -->
<rag-button>                           <!-- Uses button archetype tokens -->
<rag-input [error]="true">             <!-- Uses form field error tokens -->
<rag-chip variant="soft" color="red"> <!-- Uses chip danger tokens -->
<rag-progress variant="success">       <!-- Uses progress success tokens -->
```

---

**Quick Access**: [Semantic Components](./SEMANTIC_COMPONENTS_REFERENCE.md) | [Design Tokens](./DESIGN_TOKENS_GUIDE.md) | [Component Demos](../src/app/pages/design-system)

---

**Last Updated**: September 2, 2025  
**Total Components**: 21 atomic components
