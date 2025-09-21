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
  - [RagBadge](#ragbadge)
  - [RagCheckbox](#ragcheckbox)
  - [RagIcon](#ragicon)
  - [RagInput](#raginput)
  - [RagProgress](#ragprogress)
  - [RagRadio](#ragradio)
  - [RagSelect](#ragselect)
  - [RagSkeleton](#ragskeleton)
  - [RagSpinner](#ragspinner)
  - [RagSwitch](#ragswitch)
  - [RagToggle](#ragtoggle)
  - [RagSlider](#ragslider)
  - [RagTextarea](#ragtextarea)
  - [RagOverflowBar](#ragoverflowbar)
  - [RagDivider](#ragdivider)
  - [RagToggleGroup](#ragtogglegroup)
- [Feedback Components](#feedback-components)
  - [RagAlert](#ragalert)
  - [RagStatusIndicator](#ragstatusindicator)
  - [RagToast](#ragtoast)
  - [RagTooltip](#ragtooltip)

---

## Primitive Components

### RagChip

A versatile chip component for displaying status, counts, or labels with interactive functionality including selection and removal.

**Selector:** `rag-chip`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'solid' \| 'soft' \| 'outline'` | `'soft'` | Visual style variant |
| `color` | `'gray' \| 'blue' \| 'green' \| 'amber' \| 'red' \| 'orange' \| 'purple'` | `'gray'` | Color theme |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Size of the chip |
| `icon` | `any \| undefined` | `undefined` | Lucide icon component to display |
| `dot` | `boolean` | `false` | Show as a status dot instead of text |
| `removable` | `boolean` | `false` | Show close button for removal functionality |
| `selectable` | `boolean` | `false` | Enable click selection functionality |
| `disabled` | `boolean` | `false` | Disabled state (affects removable and selectable) |
| `loading` | `boolean` | `false` | Loading state with spinner (disables interactions) |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `removed` | `EventEmitter<void>` | Emitted when chip is removed via close button |
| `selectionChange` | `EventEmitter<boolean>` | Emitted when chip selection state changes |

#### Usage Examples

```html
<!-- Basic chip -->
<rag-chip>New</rag-chip>

<!-- Badge with icon -->
<rag-chip [icon]="StarIcon" [color]="'amber'">Featured</rag-chip>

<!-- Status dot -->
<rag-chip [dot]="true" [color]="'green'"></rag-chip>

<!-- Removable chip -->
<rag-chip [removable]="true" (removed)="onChipRemoved()">
  Remove me
</rag-chip>

<!-- Selectable chip -->
<rag-chip 
  [selectable]="true" 
  [color]="'blue'"
  (selectionChange)="onSelectionChange($event)">
  Click to select
</rag-chip>

<!-- Combined functionality -->
<rag-chip 
  [removable]="true"
  [selectable]="true"
  [color]="'green'"
  [icon]="TagIcon"
  (removed)="removeTag()"
  (selectionChange)="selectTag($event)">
  Interactive Tag
</rag-chip>

<!-- Disabled chip -->
<rag-chip 
  [removable]="true"
  [selectable]="true"
  [disabled]="true">
  Disabled
</rag-chip>

<!-- Loading chip -->
<rag-chip [loading]="true">Loading...</rag-chip>

<!-- Loading with removable (close disabled) -->
<rag-chip 
  [loading]="true"
  [removable]="true"
  [color]="'blue'">
  Processing
</rag-chip>

<!-- Different variants -->
<rag-chip [variant]="'solid'" [color]="'blue'">Solid</rag-chip>
<rag-chip [variant]="'outline'" [color]="'red'">Outline</rag-chip>
```

```typescript
// Component using interactive chips
import { StarIcon, TagIcon } from 'lucide-angular';

@Component({
  selector: 'app-chip-example',
  imports: [RagChip],
  template: `
    <rag-chip 
      [removable]="true"
      [selectable]="true"
      [icon]="TagIcon"
      (removed)="removeChip()"
      (selectionChange)="onChipSelect($event)">
      Interactive Chip
    </rag-chip>
  `
})
export class ChipExampleComponent {
  readonly StarIcon = StarIcon;
  readonly TagIcon = TagIcon;

  removeChip(): void {
    console.log('Chip removed!');
  }

  onChipSelect(selected: boolean): void {
    console.log('Chip selection:', selected);
  }
}
```

#### Interactive Features

- **Removable**: When `removable` is `true`, displays a close button (X icon) that emits `removed` event
- **Selectable**: When `selectable` is `true`, chip becomes clickable and toggles selected state
- **Visual Feedback**: Selected chips have enhanced styling with borders and background changes
- **Disabled State**: When `disabled` is `true`, prevents interaction with both removable and selectable functionality
- **Accessibility**: Includes proper ARIA labels and keyboard navigation support

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

### RagBadge

An attribute directive that adds informational badges to any element, perfect for notification counts, status indicators, and labels.

**Selector:** `[ragBadge]`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `ragBadge` | `string \| number \| TemplateRef<any> \| null` | `null` | Badge content - text, number, or template |
| `badgeVariant` | `'solid' \| 'soft' \| 'outline'` | `'solid'` | Visual style variant |
| `badgeColor` | `'gray' \| 'blue' \| 'green' \| 'amber' \| 'red' \| 'orange' \| 'purple'` | `'red'` | Badge color theme |
| `badgeSize` | `'xs' \| 'sm' \| 'md'` | `'sm'` | Badge size |
| `badgePosition` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | Badge position on element |
| `badgeOffset` | `boolean` | `false` | Offset badge further from element |
| `badgeHidden` | `boolean` | `false` | Hide/show the badge |

#### Usage Examples

```html
<!-- Basic notification badge -->
<rag-button [ragBadge]="notificationCount">
  Messages
</rag-button>

<!-- Custom position and color -->
<rag-icon
  [img]="BellIcon"
  [ragBadge]="5"
  badgePosition="top-right"
  badgeColor="red"
  badgeSize="xs">
</rag-icon>

<!-- Status badge with different variants -->
<div
  class="user-avatar"
  [ragBadge]="'NEW'"
  badgeVariant="soft"
  badgeColor="green"
  badgePosition="bottom-right">
  <img src="avatar.jpg" alt="User">
</div>

<!-- Badge with template content -->
<rag-button
  [ragBadge]="badgeTemplate"
  badgePosition="top-left"
  badgeColor="blue">
  Settings
</rag-button>

<ng-template #badgeTemplate>
  <rag-icon [img]="StarIcon" size="xs"></rag-icon>
</ng-template>

<!-- Conditional badge -->
<rag-chip
  [ragBadge]="hasUpdates ? 'Updated' : null"
  badgeColor="amber"
  badgeVariant="outline">
  Document
</rag-chip>

<!-- Dynamic badge with offset -->
<div
  class="file-item"
  [ragBadge]="fileCount"
  [badgeOffset]="true"
  badgeSize="md"
  badgeColor="purple">
  Folder Name
</div>
```

```typescript
// Component using badges
import { BellIcon, StarIcon } from 'lucide-angular';

@Component({
  selector: 'app-notification-example',
  imports: [RagButton, RagIcon, RagChip, RagBadge],
  template: `
    <rag-button
      [ragBadge]="unreadCount"
      [badgeHidden]="unreadCount === 0"
      badgeColor="red"
      badgeSize="sm">
      Inbox
    </rag-button>
  `
})
export class NotificationExampleComponent {
  readonly BellIcon = BellIcon;
  readonly StarIcon = StarIcon;

  unreadCount = signal(3);
  hasUpdates = signal(true);
}
```

#### Key Features

- **Automatic Positioning**: Badges are positioned absolutely relative to the host element
- **Template Support**: Accepts text, numbers, or Angular templates for custom content
- **Dynamic Content**: Reactive to signal changes and can be shown/hidden conditionally
- **Non-Intrusive**: Uses `pointer-events: none` so badges don't interfere with host element interactions
- **Flexible Positioning**: Four corner positions with optional offset
- **Design Token Integration**: Full integration with the RAG Studio design system
- **Accessibility**: Properly positioned without affecting screen reader navigation

#### Common Use Cases

- **Notification counts** on buttons and icons
- **Status indicators** on avatars and items
- **New/Updated labels** on content cards
- **Counter badges** for shopping carts, messages
- **Feature flags** and promotional labels

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

A loading spinner component with customizable size, color, diameter, stroke width, and mode for both determinate and indeterminate loading states.

**Selector:** `rag-spinner`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Predefined size of the spinner |
| `color` | `string \| undefined` | `undefined` | Custom color (CSS color value) |
| `diameter` | `number \| undefined` | `undefined` | Custom diameter in pixels (overrides size) |
| `mode` | `'determinate' \| 'indeterminate'` | `'indeterminate'` | Loading mode - indeterminate (spinning) or determinate (static) |
| `strokeWidth` | `number` | `2` | Border width in pixels |

#### Usage Examples

```html
<!-- Basic indeterminate spinner -->
<rag-spinner></rag-spinner>

<!-- Large spinner with custom color -->
<rag-spinner [size]="'lg'" [color]="'#3b82f6'"></rag-spinner>

<!-- Custom diameter and stroke width -->
<rag-spinner [diameter]="40" [strokeWidth]="3"></rag-spinner>

<!-- Determinate spinner (static) -->
<rag-spinner [mode]="'determinate'" [color]="'#10b981'"></rag-spinner>

<!-- Inline with text -->
<div class="loading-state">
  <rag-spinner [size]="'sm'"></rag-spinner>
  <span>Loading...</span>
</div>

<!-- Custom sized spinner for specific use case -->
<rag-spinner 
  [diameter]="24" 
  [strokeWidth]="2" 
  [color]="'var(--rag-semantic-color-primary-500)'">
</rag-spinner>
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

### RagToggle

A toggle switch component with customizable text, variants, and states for boolean value controls.

**Selector:** `rag-toggle`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Toggle size |
| `disabled` | `boolean` | `false` | Disabled state |
| `color` | `'blue' \| 'green' \| 'red'` | `'blue'` | Color theme |
| `label` | `string \| undefined` | `undefined` | Label text |
| `description` | `string \| undefined` | `undefined` | Description text |
| `variant` | `'solid' \| 'soft' \| 'outline'` | `'solid'` | Visual style variant |
| `onText` | `string` | `'ON'` | Text displayed when toggle is on |
| `offText` | `string` | `'OFF'` | Text displayed when toggle is off |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `onToggle` | `EventEmitter<boolean>` | Emitted when toggle state changes |
| `valueChange` | `EventEmitter<boolean>` | Emitted when value changes |

#### Usage Examples

```html
<!-- Basic toggle -->
<rag-toggle (onToggle)="handleToggle($event)">Basic Toggle</rag-toggle>

<!-- Toggle with custom text -->
<rag-toggle
  [onText]="'ENABLED'"
  [offText]="'DISABLED'"
  [color]="'green'"
  (valueChange)="onStatusChange($event)">
</rag-toggle>

<!-- Toggle with label and description -->
<rag-toggle
  [label]="'Notifications'"
  [description]="'Receive email notifications'"
  [variant]="'soft'"
  [color]="'blue'">
</rag-toggle>

<!-- Form integration -->
<rag-toggle
  [formControl]="notificationControl"
  [label]="'Enable notifications'"
  [size]="'lg'">
</rag-toggle>

<!-- Disabled toggle -->
<rag-toggle
  [disabled]="true"
  [label]="'Feature unavailable'"
  [variant]="'outline'">
</rag-toggle>
```

```typescript
// Component using toggle
@Component({
  selector: 'app-settings',
  imports: [RagToggle],
  template: `
    <rag-toggle
      [label]="'Dark Mode'"
      [description]="'Use dark theme'"
      [formControl]="darkModeControl"
      (onToggle)="toggleDarkMode($event)">
    </rag-toggle>
  `
})
export class SettingsComponent {
  darkModeControl = new FormControl(false);

  toggleDarkMode(enabled: boolean) {
    console.log('Dark mode:', enabled);
    // Apply theme changes
  }
}
```

#### Features

- **Custom Text**: Configurable ON/OFF text display
- **Form Integration**: Full `ControlValueAccessor` support
- **Visual Variants**: Multiple styling options (solid, soft, outline)
- **Size Options**: Small, medium, and large sizes
- **Accessibility**: Proper ARIA attributes and keyboard navigation
- **State Management**: Tracks checked state with reactive signals

---

### RagSlider

A range slider component for selecting numeric values within a specified range with customizable styling and display options.

**Selector:** `rag-slider`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Slider size |
| `disabled` | `boolean` | `false` | Disabled state |
| `showValue` | `boolean` | `true` | Show current value display |
| `showMinMax` | `boolean` | `true` | Show min/max value labels |
| `label` | `string \| undefined` | `undefined` | Label text |
| `description` | `string \| undefined` | `undefined` | Description text |
| `color` | `'blue' \| 'green' \| 'red'` | `'blue'` | Color theme |
| `unit` | `string` | `''` | Unit suffix for values (e.g., 'px', '%', 'ms') |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `valueChange` | `EventEmitter<number>` | Emitted when value changes |
| `onSliderChange` | `EventEmitter<number>` | Emitted when slider changes |

#### Usage Examples

```html
<!-- Basic slider -->
<rag-slider
  [min]="0"
  [max]="100"
  [step]="5"
  (valueChange)="onVolumeChange($event)">
</rag-slider>

<!-- Slider with label and unit -->
<rag-slider
  [label]="'Font Size'"
  [min]="12"
  [max]="24"
  [step]="1"
  [unit]="'px'"
  [color]="'blue'"
  (valueChange)="onFontSizeChange($event)">
</rag-slider>

<!-- Percentage slider -->
<rag-slider
  [label]="'Opacity'"
  [description]="'Set element transparency'"
  [min]="0"
  [max]="100"
  [step]="10"
  [unit]="'%'"
  [color]="'green'"
  [size]="'lg'">
</rag-slider>

<!-- Form integration -->
<rag-slider
  [formControl]="brightnessControl"
  [label]="'Brightness'"
  [min]="0"
  [max]="200"
  [step]="5"
  [unit]="'%'">
</rag-slider>

<!-- Disabled slider -->
<rag-slider
  [disabled]="true"
  [label]="'Read-only setting'"
  [min]="0"
  [max]="10"
  [showMinMax]="false">
</rag-slider>

<!-- Custom styling options -->
<rag-slider
  [label]="'Custom Range'"
  [min]="-50"
  [max]="50"
  [step]="2.5"
  [color]="'red'"
  [showValue]="true"
  [showMinMax]="true"
  [size]="'sm'">
</rag-slider>
```

```typescript
// Component using slider
@Component({
  selector: 'app-audio-controls',
  imports: [RagSlider],
  template: `
    <rag-slider
      [label]="'Volume'"
      [min]="0"
      [max]="100"
      [step]="5"
      [unit]="'%'"
      [formControl]="volumeControl"
      (valueChange)="onVolumeChange($event)">
    </rag-slider>

    <rag-slider
      [label]="'Bass'"
      [min]="-10"
      [max]="10"
      [step]="1"
      [unit]="'dB'"
      [color]="'green'"
      (valueChange)="onBassChange($event)">
    </rag-slider>
  `
})
export class AudioControlsComponent {
  volumeControl = new FormControl(75);

  onVolumeChange(volume: number) {
    console.log('Volume changed to:', volume);
    // Apply volume changes
  }

  onBassChange(bass: number) {
    console.log('Bass changed to:', bass);
    // Apply bass changes
  }
}
```

#### Features

- **Range Control**: Configurable min, max, and step values
- **Visual Progress**: Shows current position with progress track
- **Value Display**: Optional current value and min/max labels
- **Unit Support**: Display values with custom units (px, %, etc.)
- **Form Integration**: Full `ControlValueAccessor` support
- **Responsive Design**: Multiple size options and color themes
- **Accessibility**: Proper ARIA attributes and keyboard navigation
- **Value Clamping**: Automatically clamps values to valid range

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

### RagOverflowBar

A horizontal scroll container with navigation buttons that appear on hover for managing overflow content.

**Selector:** `rag-overflow-bar`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scrollAmount` | `number` | `200` | Pixels to scroll when navigation buttons are clicked |
| `hideButtons` | `boolean` | `false` | Hide navigation buttons completely |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `onNavigate` | `EventEmitter<'left' \| 'right'>` | Emitted when navigation buttons are clicked |

#### Usage Examples

```html
<!-- Basic overflow bar with chips -->
<rag-overflow-bar>
  <rag-chip>Tag 1</rag-chip>
  <rag-chip>Tag 2</rag-chip>
  <rag-chip>Tag 3</rag-chip>
  <rag-chip>Long tag name that might cause overflow</rag-chip>
  <rag-chip>Tag 5</rag-chip>
  <rag-chip>Tag 6</rag-chip>
</rag-overflow-bar>

<!-- Tab navigation with overflow -->
<rag-overflow-bar [scrollAmount]="150">
  <button class="tab-button active">Dashboard</button>
  <button class="tab-button">Analytics</button>
  <button class="tab-button">Reports</button>
  <button class="tab-button">Settings</button>
  <button class="tab-button">Users</button>
  <button class="tab-button">Billing</button>
</rag-overflow-bar>

<!-- Horizontal list of cards -->
<rag-overflow-bar [scrollAmount]="250" (onNavigate)="onCardNavigation($event)">
  <rag-card class="inline-card">Card 1</rag-card>
  <rag-card class="inline-card">Card 2</rag-card>
  <rag-card class="inline-card">Card 3</rag-card>
  <rag-card class="inline-card">Card 4</rag-card>
</rag-overflow-bar>

<!-- Hide navigation buttons -->
<rag-overflow-bar [hideButtons]="true">
  <div>Content without navigation buttons</div>
</rag-overflow-bar>
```

```typescript
// Component using overflow bar
@Component({
  selector: 'app-tag-filter',
  imports: [RagOverflowBar, RagChip],
  template: `
    <rag-overflow-bar (onNavigate)="onTagNavigate($event)">
      @for (tag of tags; track tag.id) {
        <rag-chip 
          [color]="tag.selected ? 'blue' : 'gray'"
          [selectable]="true"
          (selectionChange)="toggleTag(tag, $event)">
          {{ tag.name }}
        </rag-chip>
      }
    </rag-overflow-bar>
  `
})
export class TagFilterComponent {
  tags = signal([
    { id: 1, name: 'React', selected: false },
    { id: 2, name: 'Angular', selected: true },
    { id: 3, name: 'Vue', selected: false },
    // ... more tags
  ]);

  onTagNavigate(direction: 'left' | 'right') {
    console.log(`Navigated ${direction}`);
  }

  toggleTag(tag: any, selected: boolean) {
    // Update tag selection logic
  }
}
```

#### Features

- **Hover-triggered Navigation**: Navigation buttons only appear when hovering over the container
- **Smooth Scrolling**: Uses smooth scroll behavior for better UX
- **Gradient Overlay**: Navigation buttons have gradient background for visual integration
- **Auto-detection**: Automatically detects when scrolling is possible and shows/hides buttons
- **Flexible Content**: Works with any horizontal content (chips, tabs, cards, etc.)
- **Responsive**: Adapts button size for mobile devices
- **Accessibility**: Includes proper ARIA labels and keyboard navigation

#### Styling Integration

The component uses design tokens for consistent theming:

```scss
.rag-overflow-bar {
  // Uses CSS custom properties from design token system
  .rag-overflow-nav {
    background: var(--color-background);
    color: var(--color-text);
    border-radius: var(--radius-md);
    
    &:hover {
      background: var(--color-surface-hover);
    }
  }
}
```

---

### RagDivider

A visual separator component for dividing sections with customizable orientation, style, and spacing.

**Selector:** `rag-divider`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Divider orientation |
| `variant` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | Line style variant |
| `label` | `string \| undefined` | `undefined` | Optional label text |
| `spacing` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Spacing around divider |

#### Usage Examples

```html
<!-- Basic horizontal divider -->
<rag-divider></rag-divider>

<!-- Divider with label -->
<rag-divider [label]="'Settings'"></rag-divider>

<!-- Vertical divider -->
<rag-divider orientation="vertical"></rag-divider>

<!-- Dashed divider with custom spacing -->
<rag-divider 
  variant="dashed" 
  spacing="lg" 
  [label]="'Advanced Options'">
</rag-divider>

<!-- Section separation -->
<rag-divider variant="dotted" spacing="xl"></rag-divider>
```

#### Accessibility
- Uses proper `role="separator"` for screen readers
- Includes `aria-orientation` attribute for orientation information
- Label text is properly accessible when provided

---

### RagToggleGroup

A multi-option selection component that allows single or multiple selection with support for icons and form integration.

**Selector:** `rag-toggle-group`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `options` | `RagToggleGroupOption<T>[]` | `[]` | Array of options |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `variant` | `'default' \| 'outline' \| 'ghost'` | `'default'` | Visual style variant |
| `disabled` | `boolean` | `false` | Disabled state |
| `multiple` | `boolean` | `false` | Allow multiple selection |
| `value` | `T \| T[] \| null` | `null` | Current value(s) |

#### Events

| Event | Type | Description |
|-------|------|-------------|
| `valueChange` | `EventEmitter<T \| T[] \| null>` | Emitted when selection changes |

#### Types

```typescript
interface RagToggleGroupOption<T = string> {
  value: T;
  label: string;
  icon?: any; // Lucide icon component
  disabled?: boolean;
}
```

#### Usage Examples

```html
<!-- Single selection theme toggle -->
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

<!-- Form integration -->
<rag-toggle-group 
  [formControl]="preferencesControl"
  [options]="preferenceOptions"
  [multiple]="true">
</rag-toggle-group>

<!-- Disabled state -->
<rag-toggle-group 
  [options]="statusOptions"
  [disabled]="isLoading()"
  (valueChange)="onStatusChange($event)">
</rag-toggle-group>
```

```typescript
// Component setup with icon imports
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-angular';

@Component({
  selector: 'app-example',
  imports: [RagToggleGroup],
  template: `
    <rag-toggle-group 
      [options]="themeOptions"
      (valueChange)="onThemeChange($event)">
    </rag-toggle-group>
  `
})
export class ExampleComponent {
  readonly themeOptions = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: MonitorIcon }
  ];

  onThemeChange(theme: string | null) {
    if (theme) {
      this.setTheme(theme);
    }
  }
}
```

#### Form Integration
Implements `ControlValueAccessor` for seamless reactive forms integration:

```typescript
// Reactive form integration
const form = this.fb.group({
  tools: [['search', 'filter']], // Pre-selected multiple values
  theme: ['light'] // Single selection
});
```

```html
<form [formGroup]="form">
  <rag-toggle-group 
    formControlName="tools"
    [options]="toolOptions"
    [multiple]="true">
  </rag-toggle-group>
  
  <rag-toggle-group 
    formControlName="theme"
    [options]="themeOptions">
  </rag-toggle-group>
</form>
```

#### Features
- **Single/Multiple Selection**: Toggle between single and multi-select modes
- **Icon Support**: Display Lucide icons alongside labels
- **Form Integration**: Full `ControlValueAccessor` support
- **Keyboard Navigation**: Arrow keys and Enter/Space selection
- **Accessibility**: Proper ARIA states and screen reader support
- **Disabled States**: Individual options and entire component can be disabled

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
