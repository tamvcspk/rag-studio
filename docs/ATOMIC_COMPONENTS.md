# RAG Studio - Atomic Components Documentation

This document provides comprehensive documentation for all atomic components in the RAG Studio design system. These components are the foundational building blocks used throughout the application and are fully integrated with the enhanced design token system.

## 🎨 Design Token Integration

All atomic components leverage the **RAG Studio Design Token System** with three layers:

- **Primitive Tokens**: Raw values (colors, spacing, typography)
- **Semantic Tokens**: Contextual meanings (primary, success, warning, etc.)
- **Component Archetypes**: Ready-to-use patterns for consistent component styling

### Archetype Benefits

- **Consistency**: All components use the same styling patterns
- **Maintainability**: Update styles centrally through archetypes
- **Accessibility**: Built-in focus states and proper contrast
- **Theming**: Easy theme switching through CSS custom properties

## Table of Contents

- [Primitive Components](#primitive-components)
  - [RagChip](#ragchip)
  - [RagButton](#ragbutton)
  - [RagCheckbox](#ragcheckbox)
  - [RagIcon](#ragicon)
  - [RagInput](#raginput)
  - [RagProgress](#ragprogress)
  - [RagRadio](#ragradio)
  - [RagSelect](#ragselect)
  - [RagSkeleton](#ragskeleton)
  - [RagSpinner](#ragspinner)
  - [RagSwitch](#ragswitch)
  - [RagTextarea](#ragtextarea)
- [Feedback Components](#feedback-components)
  - [RagAlert](#ragalert)
  - [RagStatusIndicator](#ragstatusindicator)
  - [RagToast](#ragtoast)
  - [RagTooltip](#ragtooltip)

---

## Primitive Components

### RagChip

A versatile chip component for displaying status, counts, or labels.

**Selector:** `rag-chip`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'solid' \| 'soft' \| 'outline'` | `'soft'` | Visual style variant |
| `color` | `'gray' \| 'blue' \| 'green' \| 'amber' \| 'red' \| 'orange' \| 'purple'` | `'gray'` | Color theme |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Size of the chip |
| `icon` | `string \| undefined` | `undefined` | Lucide icon name to display |
| `dot` | `boolean` | `false` | Show as a status dot instead of text |

#### Usage Examples

```html
<!-- Basic chip -->
<rag-chip>New</rag-chip>

<!-- Badge with icon -->
<rag-chip [icon]="'star'" [color]="'amber'">Featured</rag-chip>

<!-- Status dot -->
<rag-chip [dot]="true" [color]="'green'"></rag-chip>

<!-- Different variants -->
<rag-chip [variant]="'solid'" [color]="'blue'">Solid</rag-chip>
<rag-chip [variant]="'outline'" [color]="'red'">Outline</rag-chip>
```

---

### RagButton

A comprehensive button component with multiple variants and states.

**Selector:** `rag-button`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'solid' \| 'outline' \| 'ghost' \| 'soft'` | `'solid'` | Visual style variant |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Size of the button |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading state with spinner |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `fullWidth` | `boolean` | `false` | Make button full width |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `onClick` | `EventEmitter<Event>` | Emitted when button is clicked |

#### Usage Examples

```html
<!-- Basic button -->
<rag-button (onClick)="handleClick()">Click me</rag-button>

<!-- Button with icon -->
<rag-button [variant]="'outline'" [size]="'lg'">
  <rag-icon [img]="PlusIcon" size="sm"></rag-icon>
  Add Item
</rag-button>

<!-- Loading button -->
<rag-button [loading]="isSubmitting" [disabled]="isSubmitting">
  Submit
</rag-button>

<!-- Full-width button -->
<rag-button [fullWidth]="true" [variant]="'soft'">
  Full Width
</rag-button>
```

```typescript
// Component using button with icon
import { PlusIcon } from 'lucide-angular';

@Component({
  imports: [RagButton, RagIcon],
  template: `
    <rag-button [variant]="'outline'">
      <rag-icon [img]="PlusIcon" size="sm"></rag-icon>
      Add Item
    </rag-button>
  `
})
export class ButtonExampleComponent {
  readonly PlusIcon = PlusIcon;
}
```

---

### RagInput

A flexible input component with support for icons, validation, and form integration.

**Selector:** `rag-input`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `placeholder` | `string` | `''` | Placeholder text |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'search'` | `'text'` | Input type |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the input |
| `disabled` | `boolean` | `false` | Disabled state |
| `readonly` | `boolean` | `false` | Read-only state |
| `error` | `boolean` | `false` | Error state styling |
| `leftIcon` | `string \| undefined` | `undefined` | Left side icon name |
| `rightIcon` | `string \| undefined` | `undefined` | Right side icon name |
| `maxlength` | `number \| undefined` | `undefined` | Maximum character length |
| `value` | `string` | `''` | Current value |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `valueChange` | `EventEmitter<string>` | Emitted when value changes |
| `onFocus` | `EventEmitter<FocusEvent>` | Emitted on focus |
| `onBlur` | `EventEmitter<FocusEvent>` | Emitted on blur |
| `onRightIconClick` | `EventEmitter<void>` | Emitted when right icon is clicked |

#### Usage Examples

```html
<!-- Basic input -->
<rag-input 
  [placeholder]="'Enter your name'"
  (valueChange)="onNameChange($event)">
</rag-input>

<!-- Input with icons -->
<rag-input 
  [type]="'search'"
  [leftIcon]="'search'"
  [rightIcon]="'x'"
  [placeholder]="'Search...'"
  (onRightIconClick)="clearSearch()">
</rag-input>

<!-- Form control integration -->
<rag-input 
  [formControl]="emailControl"
  [type]="'email'"
  [error]="emailControl.invalid && emailControl.touched">
</rag-input>
```

---

### RagSelect

A customizable select dropdown component with search and grouping support.

**Selector:** `rag-select`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `options` | `RagSelectOption<T>[]` | `[]` | Array of options |
| `placeholder` | `string` | `'Select an option...'` | Placeholder text |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the select |
| `disabled` | `boolean` | `false` | Disabled state |
| `error` | `boolean` | `false` | Error state styling |
| `searchable` | `boolean` | `false` | Enable search functionality |
| `clearable` | `boolean` | `false` | Allow clearing selection |
| `value` | `T \| null` | `null` | Current selected value |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `valueChange` | `EventEmitter<T \| null>` | Emitted when selection changes |
| `onSearch` | `EventEmitter<string>` | Emitted when search term changes |

#### Types

```typescript
interface RagSelectOption<T = any> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}
```

#### Usage Examples

```html
<!-- Basic select -->
<rag-select 
  [options]="statusOptions"
  [placeholder]="'Select status'"
  (valueChange)="onStatusChange($event)">
</rag-select>

<!-- Searchable select -->
<rag-select 
  [options]="userOptions"
  [searchable]="true"
  [clearable]="true"
  [placeholder]="'Search users...'"
  (onSearch)="filterUsers($event)">
</rag-select>
```

---

### RagSpinner

A loading spinner component with customizable size and color.

**Selector:** `rag-spinner`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the spinner |
| `color` | `string \| undefined` | `undefined` | Custom color (CSS color value) |

#### Usage Examples

```html
<!-- Basic spinner -->
<rag-spinner></rag-spinner>

<!-- Large spinner with custom color -->
<rag-spinner [size]="'lg'" [color]="'#3b82f6'"></rag-spinner>

<!-- Inline with text -->
<div class="loading-state">
  <rag-spinner [size]="'sm'"></rag-spinner>
  <span>Loading...</span>
</div>
```

---

### RagIcon

Icon component using Lucide icons.

**Selector:** `rag-icon`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `img` | `any` | - | Lucide icon component (required) |
| `size` | `number \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Icon size |
| `variant` | `'default' \| 'subtle' \| 'muted' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | Semantic color variant |
| `color` | `string \| undefined` | `undefined` | Custom icon color (overrides variant) |
| `strokeWidth` | `number` | `2` | Icon stroke width |

#### Usage Examples

```html
<!-- Basic icon -->
<rag-icon [img]="HomeIcon"></rag-icon>

<!-- Icon with semantic color -->
<rag-icon [img]="CheckCircleIcon" variant="success"></rag-icon>
<rag-icon [img]="AlertTriangleIcon" variant="warning"></rag-icon>
<rag-icon [img]="XCircleIcon" variant="danger"></rag-icon>

<!-- Icon with custom size -->
<rag-icon [img]="StarIcon" [size]="24"></rag-icon>

<!-- Semantic sizes using archetype system -->
<rag-icon [img]="UserIcon" size="xs"></rag-icon>
<rag-icon [img]="SettingsIcon" size="lg"></rag-icon>
<rag-icon [img]="UserIcon" size="lg"></rag-icon>
```

```typescript
// Component must import specific icons needed
import { 
  HomeIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon,
  StarIcon, UserIcon, SettingsIcon
} from 'lucide-angular';

@Component({
  selector: 'app-icon-example',
  imports: [RagIcon],
  template: `<!-- icon usage above -->`
})
export class IconExampleComponent {
  readonly HomeIcon = HomeIcon;
  readonly CheckCircleIcon = CheckCircleIcon;
  readonly AlertTriangleIcon = AlertTriangleIcon;
  readonly XCircleIcon = XCircleIcon;
  readonly StarIcon = StarIcon;
  readonly UserIcon = UserIcon;
  readonly SettingsIcon = SettingsIcon;
}
```

> **Note:** Other components like `RagChip`, `RagInput`, and `RagAlert` that have `icon` properties still use string icon names internally (e.g., `[icon]="'star'"`, `[leftIcon]="'search'"`). The new `[img]` pattern is specifically for direct usage of the `<rag-icon>` component.

---

### RagCheckbox

Checkbox input component with form integration.

**Selector:** `rag-checkbox`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `checked` | `boolean` | `false` | Checked state |
| `disabled` | `boolean` | `false` | Disabled state |
| `indeterminate` | `boolean` | `false` | Indeterminate state |
| `label` | `string \| undefined` | `undefined` | Label text |

#### Usage Examples

```html
<!-- Basic checkbox -->
<rag-checkbox [label]="'Accept terms'" (valueChange)="onTermsChange($event)"></rag-checkbox>

<!-- Indeterminate state -->
<rag-checkbox [indeterminate]="true" [label]="'Select all'"></rag-checkbox>
```

---

### RagRadio

Radio button component for single selection from a group.

**Selector:** `rag-radio`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `any` | - | Radio button value |
| `name` | `string` | - | Radio group name |
| `checked` | `boolean` | `false` | Checked state |
| `disabled` | `boolean` | `false` | Disabled state |
| `label` | `string \| undefined` | `undefined` | Label text |

---

### RagSwitch

Toggle switch component for boolean values.

**Selector:** `rag-switch`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `checked` | `boolean` | `false` | Switch state |
| `disabled` | `boolean` | `false` | Disabled state |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Switch size |
| `label` | `string \| undefined` | `undefined` | Label text |

---

### RagTextarea

Multi-line text input component.

**Selector:** `rag-textarea`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `placeholder` | `string` | `''` | Placeholder text |
| `rows` | `number` | `3` | Number of visible rows |
| `disabled` | `boolean` | `false` | Disabled state |
| `readonly` | `boolean` | `false` | Read-only state |
| `error` | `boolean` | `false` | Error state styling |
| `maxlength` | `number \| undefined` | `undefined` | Maximum character length |
| `resize` | `'none' \| 'both' \| 'horizontal' \| 'vertical'` | `'vertical'` | Resize behavior |

---

### RagProgress

Progress bar component for showing completion status with semantic meaning.

**Selector:** `rag-progress`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `number` | `0` | Progress value (0-max) |
| `max` | `number` | `100` | Maximum value |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Progress bar size |
| `variant` | `'primary' \| 'success' \| 'warning' \| 'danger'` | `'primary'` | Semantic color variant |
| `indeterminate` | `boolean` | `false` | Show indeterminate animation |
| `showLabel` | `boolean` | `false` | Show percentage label |

#### Usage Examples

```html
<!-- Basic progress bar -->
<rag-progress [value]="75"></rag-progress>

<!-- Success progress with label -->
<rag-progress [value]="100" variant="success" [showLabel]="true"></rag-progress>

<!-- Warning progress -->
<rag-progress [value]="25" variant="warning"></rag-progress>

<!-- Indeterminate loading -->
<rag-progress [indeterminate]="true"></rag-progress>
```

---

### RagSkeleton

Skeleton loading component for content placeholders with consistent styling.

**Selector:** `rag-skeleton`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `string \| number` | `'100%'` | Skeleton width |
| `height` | `string \| number` | `'1rem'` | Skeleton height |
| `variant` | `'text' \| 'circular' \| 'rectangular'` | `'text'` | Skeleton shape archetype |
| `count` | `number` | `1` | Number of skeleton elements |

#### Usage Examples

```html
<!-- Text line skeleton -->
<rag-skeleton></rag-skeleton>

<!-- Circular avatar skeleton -->
<rag-skeleton variant="circular" [width]="40" [height]="40"></rag-skeleton>

<!-- Rectangular card skeleton -->
<rag-skeleton variant="rectangular" height="120px"></rag-skeleton>

<!-- Multiple skeletons -->
<rag-skeleton [count]="3"></rag-skeleton>
```

---

## Feedback Components

### RagAlert

Alert component for displaying important messages to users.

**Selector:** `rag-alert`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Alert type |
| `title` | `string \| undefined` | `undefined` | Alert title |
| `closable` | `boolean` | `false` | Show close button |
| `icon` | `string \| undefined` | `undefined` | Custom icon (overrides default) |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `onClose` | `EventEmitter<void>` | Emitted when alert is closed |

#### Usage Examples

```html
<!-- Basic alert -->
<rag-alert [variant]="'success'">
  Operation completed successfully!
</rag-alert>

<!-- Alert with title and close button -->
<rag-alert 
  [variant]="'warning'" 
  [title]="'Warning'" 
  [closable]="true"
  (onClose)="dismissAlert()">
  Please check your input and try again.
</rag-alert>

<!-- Custom icon -->
<rag-alert [variant]="'info'" [icon]="'lightbulb'">
  Pro tip: Use keyboard shortcuts to work faster!
</rag-alert>
```

---

### RagStatusIndicator

Visual indicator for system or component status.

**Selector:** `rag-status-indicator`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `status` | `'online' \| 'offline' \| 'busy' \| 'away'` | `'offline'` | Current status |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Indicator size |
| `pulse` | `boolean` | `false` | Animated pulse effect |

---

### RagToast

**Angular CDK Overlay-based toast notification component managed via ToastService for temporary messages with stacking, actions, and auto-dismiss functionality.**

**Selector:** `rag-toast`

> **Important:** Toasts are typically not used directly in templates. Instead, use the `ToastService` for programmatic toast management with proper overlay positioning and stacking.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Toast semantic variant |
| `title` | `string \| undefined` | `undefined` | Toast title |
| `message` | `string \| undefined` | `undefined` | Toast message content |
| `duration` | `number` | `5000` | Auto-dismiss duration in milliseconds |
| `persistent` | `boolean` | `false` | If true, toast won't auto-dismiss |
| `dismissible` | `boolean` | `true` | Show close button for manual dismiss |
| `icon` | `string \| undefined` | `undefined` | Custom Lucide icon name (overrides default) |
| `actions` | `RagToastAction[]` | `[]` | Array of action buttons |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `onDismiss` | `EventEmitter<void>` | Emitted when toast is dismissed |
| `onAction` | `EventEmitter<string>` | Emitted when action button is clicked |

#### Types

```typescript
interface RagToastAction {
  label: string;
  handler: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
}
```

#### ToastService Integration

The recommended way to use toasts is through the `ToastService`:

```typescript
import { inject } from '@angular/core';
import { ToastService } from './shared/services/toast.service';

@Component({
  // ...
})
export class MyComponent {
  private toastService = inject(ToastService);

  // Convenience methods
  showSuccess() {
    this.toastService.success(
      'Your changes have been saved successfully!', 
      'Success'
    );
  }

  showError() {
    this.toastService.error(
      'Failed to save changes. Please try again.', 
      'Error'
    );
  }

  showInfo() {
    this.toastService.info(
      'New features are available in the latest update.', 
      'Info'
    );
  }

  showWarning() {
    this.toastService.warning(
      'Your session will expire in 5 minutes.', 
      'Warning'
    );
  }

  // Advanced usage with actions
  showConfirmationToast() {
    this.toastService.show({
      variant: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. What would you like to do?',
      persistent: true, // Won't auto-dismiss
      actions: [
        {
          label: 'Save',
          handler: () => this.saveChanges(),
          variant: 'solid'
        },
        {
          label: 'Discard',
          handler: () => this.discardChanges(),
          variant: 'outline'
        },
        {
          label: 'Cancel',
          handler: () => console.log('Cancelled'),
          variant: 'ghost'
        }
      ]
    });
  }

  // Multiple toasts (will stack)
  showMultipleToasts() {
    this.toastService.info('First notification');
    
    setTimeout(() => {
      this.toastService.success('Second notification');
    }, 1000);
    
    setTimeout(() => {
      this.toastService.warning('Third notification');
    }, 2000);
  }

  // Dismiss all toasts
  clearAllToasts() {
    this.toastService.dismissAll();
  }
}
```

#### Service Methods

```typescript
export class ToastService {
  // Convenience methods
  info(message: string, title?: string, config?: Partial<ToastConfig>): string;
  success(message: string, title?: string, config?: Partial<ToastConfig>): string;
  warning(message: string, title?: string, config?: Partial<ToastConfig>): string;
  error(message: string, title?: string, config?: Partial<ToastConfig>): string;
  
  // Full configuration
  show(config: ToastConfig): string;
  
  // Management
  dismiss(id: string): void;
  dismissAll(): void;
}

interface ToastConfig {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message?: string;
  duration?: number;        // Auto-dismiss time (default: 5000ms)
  persistent?: boolean;     // If true, won't auto-dismiss (default: false)
  dismissible?: boolean;    // Show close button (default: true)
  actions?: RagToastAction[]; // Action buttons
}
```

#### Key Features

1. **Angular CDK Overlay Integration**: Proper z-index management and positioning
2. **Stacking**: Multiple toasts stack vertically with proper spacing
3. **Auto-dismiss**: Configurable duration with hover-to-pause functionality
4. **Persistent Mode**: Toasts that remain until manually dismissed
5. **Action Buttons**: Custom action buttons with different variants
6. **Service-based**: Centralized management like Angular Material's SnackBar
7. **Repositioning**: Remaining toasts smoothly reposition when others are dismissed

#### Usage Examples

```html
<!-- Direct usage (rare) - typically managed by service -->
<rag-toast 
  [variant]="'success'"
  [title]="'Success!'"
  [message]="'Operation completed'"
  [duration]="3000"
  [dismissible]="true"
  (onDismiss)="handleDismiss()">
</rag-toast>
```

```typescript
// Service usage (recommended)
@Component({
  selector: 'app-user-actions',
  template: `
    <rag-button (onClick)="saveUser()" [loading]="isSaving()">
      Save User
    </rag-button>
    <rag-button (onClick)="deleteUser()" variant="outline" color="red">
      Delete User
    </rag-button>
  `
})
export class UserActionsComponent {
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  
  isSaving = signal(false);

  async saveUser() {
    this.isSaving.set(true);
    
    try {
      await this.userService.save(this.user);
      this.toastService.success('User saved successfully!', 'Success');
    } catch (error) {
      this.toastService.error(
        'Failed to save user. Please try again.', 
        'Save Error'
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  deleteUser() {
    const toastId = this.toastService.show({
      variant: 'warning',
      title: 'Confirm Deletion',
      message: `Delete user "${this.user.name}"? This cannot be undone.`,
      persistent: true,
      actions: [
        {
          label: 'Delete',
          handler: () => {
            this.toastService.dismiss(toastId);
            this.performDelete();
          },
          variant: 'solid'
        },
        {
          label: 'Cancel',
          handler: () => this.toastService.dismiss(toastId),
          variant: 'ghost'
        }
      ]
    });
  }

  private async performDelete() {
    try {
      await this.userService.delete(this.user.id);
      this.toastService.success('User deleted successfully');
      // Navigate away or refresh list
    } catch (error) {
      this.toastService.error('Failed to delete user', 'Delete Error');
    }
  }
}
```

#### Styling Integration

Toasts use the design token system and automatically adapt to light/dark themes:

```scss
// Toast styles use semantic color tokens
.rt-Toast {
  // Variant-based border colors
  &.rt-variant-success {
    border-left: 4px solid var(--rag-semantic-color-success-800);
  }
  
  &.rt-variant-warning {
    border-left: 4px solid var(--rag-semantic-color-warning-700);
  }
  
  &.rt-variant-error {
    border-left: 4px solid var(--rag-semantic-color-danger-700);
  }
}

// Dark mode support included
:global(.dark) .rt-Toast {
  background-color: var(--rag-semantic-color-background-default);
  border-color: var(--rag-semantic-color-border-muted);
}
```

---

### RagTooltip

Tooltip component for providing additional context on hover.

**Selector:** `rag-tooltip`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `content` | `string` | - | Tooltip content |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip position |
| `delay` | `number` | `500` | Show delay (ms) |

#### Usage Examples

```html
<!-- Basic tooltip -->
<button rag-tooltip="Click to save">Save</button>

<!-- Custom position -->
<span rag-tooltip="This is important" [tooltipPosition]="'bottom'">
  Important info
</span>
```

---

## Design System Integration

All atomic components are designed to work seamlessly with the RAG Studio design system:

- **Design Tokens**: Components use CSS custom properties from `_design-tokens.scss`
- **Consistent Sizing**: Standardized size scales (xs, sm, md, lg, xl)
- **Color System**: Semantic color tokens for theming
- **Typography**: Consistent font sizes and line heights
- **Spacing**: Standardized spacing scale
- **Accessibility**: ARIA attributes and keyboard navigation support

## Form Integration

Form components (`RagInput`, `RagSelect`, `RagCheckbox`, etc.) implement Angular's `ControlValueAccessor` interface for seamless integration with:

- **Reactive Forms**: `FormControl`, `FormGroup`
- **Template-driven Forms**: `ngModel`
- **Validation**: Built-in and custom validators
- **Error States**: Visual feedback for validation errors

## Best Practices

1. **Use semantic variants**: Choose variants that convey meaning (e.g., `error` for destructive actions)
2. **Consistent sizing**: Use the same size scale across related components
3. **Accessibility**: Always provide appropriate labels and ARIA attributes
4. **Performance**: Components use Angular signals for optimal reactivity
5. **Customization**: Prefer design tokens over custom CSS for theming

## Browser Support

All components are tested and supported in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When adding new atomic components:

1. Follow the established patterns and naming conventions
2. Use Angular 20 signals and modern APIs
3. Implement proper TypeScript types
4. Add comprehensive tests
5. Update this documentation
6. Ensure accessibility compliance
