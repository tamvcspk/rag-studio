# UI Library Mixins & Utilities Reference

This document provides comprehensive reference for the RAG Studio UI Library mixins and utilities, designed for separation into an independent UI library package.

## Overview

The UI library styles are organized into two main categories:
- **Generic UI Library** (`src/app/shared/ui-library/styles/`) - Reusable across any project
- **Project-Specific** (`src/app/shared/styles/`) - RAG Studio specific patterns

## Generic UI Library Components

### Location
```
src/app/shared/ui-library/styles/
├── index.scss          # Main entry point
├── _mixins.scss        # Generic reusable mixins
└── _utilities.scss     # Generic utility classes and animations
```

### Usage
```scss
// Import the complete UI library
@use 'src/app/shared/ui-library/styles/index' as ui-lib;

// Or import specific modules
@use 'src/app/shared/ui-library/styles/mixins' as mixins;
@use 'src/app/shared/ui-library/styles/utilities' as utils;
```

## Generic Mixins Reference

### Card Mixins

#### `@mixin card-base`
Basic card styling with padding, border, and background.
```scss
.my-card {
  @include ui-lib.card-base;
}
```

#### `@mixin card-interactive`
Interactive card with hover effects and cursor pointer.
```scss
.clickable-card {
  @include ui-lib.card-interactive;
}
```

#### `@mixin card-selected`
Selected state styling for cards.
```scss
.selected-card {
  @include ui-lib.card-selected;
}
```

### Wizard Mixins

#### `@mixin wizard-step-item`
Base styling for wizard step navigation items.
```scss
.step {
  @include ui-lib.wizard-step-item;
}
```

#### `@mixin wizard-step-icon`
Circular icon styling for wizard steps.
```scss
.step-icon {
  @include ui-lib.wizard-step-icon;
}
```

#### `@mixin wizard-progress-bar`
Progress bar container for wizards.
```scss
.wizard-progress {
  @include ui-lib.wizard-progress-bar;
}
```

### Grid Layout Mixins

#### `@mixin auto-fit-grid($min-width: 280px)`
Responsive auto-fit grid layout.
```scss
.grid-container {
  @include ui-lib.auto-fit-grid(320px);
}
```

#### `@mixin responsive-two-column($breakpoint: 768px)`
Two-column grid that stacks on mobile.
```scss
.two-col-layout {
  @include ui-lib.responsive-two-column(768px);
}
```

### Form Mixins

#### `@mixin form-group`
Standard form group styling with label and spacing.
```scss
.form-field {
  @include ui-lib.form-group;
}
```

#### `@mixin form-actions`
Action buttons layout for forms.
```scss
.form-buttons {
  @include ui-lib.form-actions;
}
```

### Layout Mixins

#### `@mixin horizontal-scroll-container`
Horizontal scrolling container with proper spacing.
```scss
.scroll-area {
  @include ui-lib.horizontal-scroll-container;
}
```

#### `@mixin centered-icon($size: 3rem)`
Centered circular icon container.
```scss
.icon-circle {
  @include ui-lib.centered-icon(2.5rem);
}
```

### Notification Mixins

#### `@mixin notification-base`
Base notification styling.

#### `@mixin notification-info`
Info notification styling (blue theme).

#### `@mixin notification-success`
Success notification styling (green theme).

#### `@mixin notification-warning`
Warning notification styling (yellow theme).

#### `@mixin notification-error`
Error notification styling (red theme).

```scss
.alert-info {
  @include ui-lib.notification-info;
}
```

### Loading Mixins

#### `@mixin loading-overlay()`
Full overlay loading state.
```scss
.loading-state {
  @include ui-lib.loading-overlay;
}
```

#### `@mixin loading-skeleton()`
Skeleton loading animation.
```scss
.skeleton {
  @include ui-lib.loading-skeleton;
}
```

### Responsive Mixins

#### `@mixin mobile-only`
Mobile-only media query wrapper.
```scss
@include ui-lib.mobile-only {
  .mobile-specific {
    display: block;
  }
}
```

#### `@mixin tablet-and-up`
Tablet and desktop media query wrapper.
```scss
@include ui-lib.tablet-and-up {
  .desktop-layout {
    display: grid;
  }
}
```

#### `@mixin desktop-only`
Desktop-only media query wrapper.

#### `@mixin mobile-wizard-adjustments`
Common mobile adjustments for wizard components.

## Generic Utility Classes

### Animation Classes
- `.animate-spin` - Spinning animation
- `.animate-fadeInUp` - Fade in with upward motion
- `.animate-fadeIn` - Simple fade in
- `.animate-slideDown` - Slide down animation
- `.animate-pulse` - Pulsing animation

### Layout Classes
- `.flex`, `.flex-col`, `.flex-wrap`
- `.items-center`, `.items-start`, `.items-end`
- `.justify-center`, `.justify-between`, `.justify-end`
- `.flex-1`, `.flex-shrink-0`
- `.grid`, `.grid-cols-1`, `.grid-cols-2`, `.grid-cols-3`
- `.gap-sm`, `.gap-md`, `.gap-lg`, `.gap-xl`

### Spacing Classes
- Margin: `.m-0`, `.mb-sm`, `.mb-md`, `.mb-lg`, `.mb-xl`, `.mt-sm`, etc.
- Padding: `.p-0`, `.p-sm`, `.p-md`, `.p-lg`, `.p-xl`

### Text Classes
- `.text-center`, `.text-left`, `.text-right`
- `.font-medium`, `.font-semibold`, `.font-bold`
- `.text-sm`, `.text-md`, `.text-lg`, `.text-xl`

### Generic Component Classes
- `.card-base`, `.card-interactive`, `.card-selected`
- `.notification-info`, `.notification-success`, `.notification-warning`, `.notification-error`
- `.loading-overlay`, `.loading-skeleton`
- `.form-group`, `.form-actions`

## Project-Specific Mixins

### Location
```
src/app/shared/styles/
├── index.scss              # Main entry point (includes UI library + project mixins)
└── _project-mixins.scss    # RAG Studio specific mixins
```

### RAG Studio Specific Patterns

#### Grid Patterns
- `@mixin component-grid($min-width)` - Component selector grids
- `@mixin dashboard-grid` - Dashboard layout grid
- `@mixin settings-grid` - Settings page two-column layout

#### Flow Visualization
- `@mixin flow-visualization` - Pipeline flow container
- `@mixin flow-node` - Flow diagram nodes
- `@mixin flow-connector` - Flow diagram connectors

#### RAG Studio Wizards
- `@mixin rag-wizard-step` - RAG-specific wizard steps
- `@mixin rag-wizard-progress` - RAG-specific progress bars
- `@mixin rag-component-selector-grid` - Component selection grids
- `@mixin rag-pipeline-step-card` - Pipeline step cards
- `@mixin rag-review-section` - Review step sections

## Usage Examples

### Component Using UI Library Mixins
```scss
// Component SCSS file
@use '../../../../../styles/index' as styles;

.my-component {
  @include styles.card-interactive;

  .grid-area {
    @include styles.auto-fit-grid(300px);
  }

  .notification {
    @include styles.notification-info;
  }
}
```

### Component Using Project-Specific Mixins
```scss
// RAG Studio component
@use '../../../../../styles/index' as styles;

.wizard-component {
  .step-navigation {
    .step-item {
      @include styles.rag-wizard-step;
    }
  }

  .flow-diagram {
    @include styles.flow-visualization;

    .node {
      @include styles.flow-node;
    }
  }
}
```

## Migration Benefits

### Bundle Size Optimization
- **Modular imports**: Import only needed mixins
- **Reduced duplication**: Shared patterns across components
- **Tree shaking**: Unused mixins automatically excluded

### UI Library Separation
- **Clean separation**: Generic vs project-specific patterns
- **Reusability**: UI library can be extracted to separate package
- **Maintainability**: Centralized styling patterns

### Developer Experience
- **Consistent patterns**: Standardized mixin usage
- **Modern SCSS**: Uses `@use` instead of deprecated `@import`
- **Documentation**: Clear usage examples and organization

## Future UI Library Package Structure

When extracted to a separate package:
```
@rag-studio/ui-library/
├── styles/
│   ├── index.scss       # Main entry
│   ├── _mixins.scss     # Generic mixins
│   └── _utilities.scss  # Generic utilities
├── components/          # Angular components
└── tokens/             # Design tokens
```

Usage in external projects:
```scss
@use '@rag-studio/ui-library/styles' as ui;

.my-card {
  @include ui.card-interactive;
}
```