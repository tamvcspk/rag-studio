# Design Tokens System

A comprehensive design system for RAG Studio built on Radix-inspired principles with a three-tier token architecture.

## Overview

The design system follows a structured approach with three token layers:

1. **Primitive Tokens** - Raw values with no context (colors, sizes, spacing)
2. **Semantic Tokens** - Contextual naming that maps to primitives (primary, success, etc.)
3. **Component Tokens** - Component-specific values that map to semantic tokens

## Size System

All components now use a standardized size scale:

- `xs` - Extra small
- `sm` - Small  
- `md` - Medium (default)
- `lg` - Large
- `xl` - Extra large

### Migration from Legacy Sizes

- **Buttons**: `'1' | '2' | '3'` → `'xs' | 'sm' | 'md'`
- **Badges**: `'sm' | 'md'` → same names, expanded to full scale
- **Status Indicators**: Already using the new system

## Color System

Built on Radix color scales with semantic naming:

### Available Colors
- `gray` - Neutral colors
- `blue` - Primary brand color
- `green` - Success states
- `red` - Error/danger states  
- `amber` - Warning states
- `orange` - Secondary warning
- `purple` - Info/accent color

### Color Scales
Each color has 12 steps (50, 100, 200...1000) providing fine-grained control.

### Semantic Color Mapping
- `primary` → `blue`
- `success` → `green` 
- `warning` → `amber`
- `danger/error` → `red`
- `info` → `blue`
- `neutral` → `gray`

## Usage

### In TypeScript Components

```typescript
import { Size, ColorName } from '../../tokens';

export class MyComponent {
  readonly size = input<Size>('md');
  readonly color = input<ColorName>('blue');
}
```

### In SCSS Files

```scss
.my-component {
  // Use component tokens
  height: var(--button-md-height);
  padding: var(--button-md-padding);
  
  // Use semantic tokens
  background: var(--bg-default);
  color: var(--text-default);
  border: 1px solid var(--border-default);
  
  // Use primitive tokens
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```

## Component Examples

### Button
```html
<rag-button size="lg" variant="solid">Large Button</rag-button>
```

### Badge  
```html
<rag-badge size="sm" color="green" variant="soft">Success</rag-badge>
```

### Status Indicator
```html
<rag-status-indicator size="md" status="success"></rag-status-indicator>
```

## Files Structure

- `design-tokens.ts` - Core token definitions
- `design-token-css.ts` - CSS custom property generators
- `design-token-generator.ts` - Utility functions and mapping
- `types.ts` - TypeScript type definitions
- `index.ts` - Public exports

## CSS Custom Properties

All tokens are available as CSS custom properties in `:root`:

```css
:root {
  /* Sizes */
  --size-xs: xs;
  --size-sm: sm;
  
  /* Colors */
  --color-blue-500: hsl(206, 100%, 50.0%);
  --color-green-800: hsl(151, 55.0%, 41.5%);
  
  /* Component tokens */
  --button-md-height: 32px;
  --button-md-padding: 0 12px;
  
  /* Semantic tokens */
  --bg-default: hsl(0, 0%, 100%);
  --text-default: hsl(0, 0%, 9.0%);
}
```

## Best Practices

1. **Use semantic tokens** for most styling needs
2. **Use component tokens** for component-specific sizing
3. **Use primitive tokens** only when semantic options aren't suitable
4. **Maintain consistency** by using the standardized size and color scales
5. **Type safety** - import and use the provided TypeScript types

## Legacy Compatibility

The system includes legacy CSS custom properties for gradual migration:

```css
--gray-1: var(--color-gray-50);  /* Legacy compatibility */
--space-2: var(--spacing-sm);    /* Legacy compatibility */
```

This ensures existing components continue to work during the migration process.