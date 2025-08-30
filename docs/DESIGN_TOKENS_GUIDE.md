# RAG Studio Design Tokens - Developer Guide

A practical, simplified design token system for consistent UI development.

## 🏗️ System Overview

### What are Design Tokens?

Design tokens are named entities that store visual design values - colors, spacing, typography, etc. They provide a single source of truth for design decisions.

### Why This System?

- **Simple**: Clean three-tier architecture without over-engineering
- **Practical**: Component archetypes for real-world use cases
- **Type-Safe**: TypeScript integration without excessive validation
- **Flexible**: Easy to customize and extend
- **Performance**: CSS custom properties for efficient runtime theming

## 📐 Architecture (Three-Tier System)

### Simple, Clean Hierarchy

```
Component Archetypes
    ↓ uses
Semantic Tokens
    ↓ uses  
Primitive Tokens
```

### 1. Primitive Tokens (Foundation)
Raw design values with no context:

```typescript
PrimitiveTokens.color.blue[500]    // hsl(206, 100%, 50.0%)
PrimitiveTokens.spacing.md         // 12px
PrimitiveTokens.fontSize.lg        // 16px
```

### 2. Semantic Tokens (Context)
Intent-based mappings:

```typescript
SemanticTokens.color.primary       // → blue scale
SemanticTokens.color.success       // → green scale
SemanticTokens.color.text.default  // → gray-1000
```

### 3. Component Archetypes (Patterns)
Ready-to-use component patterns:

```typescript
ComponentArchetypes.button.solid   // Complete button styling
ComponentArchetypes.input.focus    // Input focus state
ComponentArchetypes.size.md        // Standard medium size
```

## 🎨 Color System

### Available Palettes
- **gray**: UI elements, text, borders
- **blue**: Primary brand, info states  
- **green**: Success states
- **red**: Error/danger states
- **amber**: Warning states

### Color Scale (50-1000)
Each color has 12 steps optimized for UI usage:
- **50-200**: Subtle backgrounds, hover states
- **300-500**: Borders, disabled states
- **600-800**: Primary content
- **900-1000**: High contrast text

## 💻 Usage Examples

### Basic Token Access

```typescript
import { $dt, cssVarValue } from '@shared/tokens';

// Get token value and CSS variable
const primaryColor = $dt('semantic.color.primary.500');
console.log(primaryColor.value);   // "hsl(206, 100%, 50.0%)"
console.log(primaryColor.cssVar);  // "--rag-semantic-color-primary-500"

// Use in CSS-in-JS
const styles = {
  color: cssVarValue('semantic.color.text.default'),
  backgroundColor: cssVarValue('semantic.color.background.default')
};
```

### Component Archetypes

```typescript
import { ComponentArchetypes, combineArchetypes } from '@shared/tokens';

@Component({
  template: `<button [style]="buttonStyles()">Click me</button>`
})
export class MyButton {
  readonly variant = input<ButtonVariant>('solid');
  readonly size = input<Size>('md');
  
  buttonStyles = computed(() => 
    combineArchetypes(
      ComponentArchetypes.button[this.variant()],
      ComponentArchetypes.size[this.size()]
    )
  );
}
```

### Service-Based Token Management

```typescript
import { DesignTokenService, provideDesignTokens } from '@shared/tokens';

// Setup in app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideDesignTokens({
      overrides: {
        primitive: {
          color: { blue: { 500: 'hsl(220, 100%, 50%)' } }
        }
      }
    })
  ]
};

// Use in components
@Component({...})
export class MyComponent {
  constructor(private tokenService: DesignTokenService) {}
  
  // Reactive token access
  primaryColor = computed(() => 
    this.tokenService.getToken('semantic.color.primary.500')
  );
  
  // Dynamic theme switching
  toggleTheme() {
    this.tokenService.updateTokens({
      semantic: {
        color: {
          background: { default: '#0a0a0a' },
          text: { default: '#ffffff' }
        }
      }
    });
  }
}
```

### SCSS Integration

```scss
.my-button {
  // Use tokens directly - automatically updated when service changes tokens
  background: var(--rag-semantic-color-primary-500);
  padding: var(--rag-primitive-spacing-md);
  border-radius: var(--rag-primitive-radius-md);
  
  &:hover {
    background: var(--rag-semantic-color-primary-600);
    box-shadow: var(--rag-primitive-shadow-md);
  }
}
```

## 🧩 Component Archetypes

### Button Archetypes

```typescript
// Available button styles
ComponentArchetypes.button.solid    // Dark background, light text
ComponentArchetypes.button.outline  // Border with transparent background  
ComponentArchetypes.button.ghost    // No background or border
ComponentArchetypes.button.soft     // Subtle background
```

### Input Archetypes

```typescript
// Input states
ComponentArchetypes.input.default   // Normal state
ComponentArchetypes.input.focus     // Focus with ring
ComponentArchetypes.input.error     // Error state with red border
ComponentArchetypes.input.disabled  // Disabled appearance
```

### Card Archetypes

```typescript
// Card elevations  
ComponentArchetypes.card.flat       // Flat with border
ComponentArchetypes.card.elevated   // Medium shadow
ComponentArchetypes.card.floating   // High shadow
```

### Size Archetype

```typescript
// Consistent sizing across all components
ComponentArchetypes.size.xs   // 24px height, compact
ComponentArchetypes.size.sm   // 28px height, small
ComponentArchetypes.size.md   // 32px height, default
ComponentArchetypes.size.lg   // 40px height, large
ComponentArchetypes.size.xl   // 48px height, extra large
```

## 🚀 Practical Examples

### Button Component

```typescript
@Component({
  selector: 'rag-button',
  template: `
    <button 
      [style]="buttonStyles()" 
      [disabled]="disabled()">
      <ng-content></ng-content>
    </button>
  `
})
export class RagButtonComponent {
  readonly variant = input<ButtonVariant>('solid');
  readonly size = input<Size>('md');
  readonly disabled = input(false);
  
  buttonStyles = computed(() => {
    const baseStyles = ComponentArchetypes.button[this.variant()];
    const sizeStyles = ComponentArchetypes.size[this.size()];
    
    return combineArchetypes(baseStyles, sizeStyles);
  });
}
```

### Input Component

```typescript
@Component({
  selector: 'rag-input',
  template: `
    <input 
      [style]="inputStyles()"
      [disabled]="disabled()"
      (focus)="onFocus()" 
      (blur)="onBlur()" />
  `
})
export class RagInputComponent {
  readonly size = input<Size>('md');
  readonly hasError = input(false);
  readonly disabled = input(false);
  
  private focused = signal(false);
  
  inputStyles = computed(() => {
    let state: InputState = 'default';
    
    if (this.disabled()) state = 'disabled';
    else if (this.hasError()) state = 'error'; 
    else if (this.focused()) state = 'focus';
    
    return combineArchetypes(
      ComponentArchetypes.input[state],
      ComponentArchetypes.size[this.size()]
    );
  });
  
  onFocus() { this.focused.set(true); }
  onBlur() { this.focused.set(false); }
}
```

### Card Component

```typescript
@Component({
  selector: 'rag-card',
  template: `
    <div [style]="cardStyles()">
      <ng-content></ng-content>
    </div>
  `
})
export class RagCardComponent {
  readonly variant = input<CardVariant>('elevated');
  readonly size = input<Size>('md');
  
  cardStyles = computed(() => 
    combineArchetypes(
      ComponentArchetypes.card[this.variant()],
      ComponentArchetypes.size[this.size()],
      { padding: cssVarValue(`primitive.spacing.${this.size()}`) }
    )
  );
}
```

## 🎨 Theming

### Custom Theme Creation

```typescript
import { DesignTokenService, provideDesignTokens } from '@shared/tokens';

// Method 1: Provider-based (Static configuration)
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideDesignTokens({
      overrides: {
        semantic: {
          color: {
            background: {
              default: '#0a0a0a',
              subtle: '#111111',
              muted: '#1a1a1a'
            },
            text: {
              default: '#ffffff',
              subtle: '#f0f0f0',
              muted: '#a0a0a0'
            }
          }
        }
      }
    })
  ]
};

// Method 2: Service-based (Dynamic theming)
@Injectable()
export class ThemeService {
  constructor(private tokenService: DesignTokenService) {}
  
  applyDarkTheme() {
    this.tokenService.updateTokens({
      semantic: {
        color: {
          background: { default: '#0a0a0a', subtle: '#111111' },
          text: { default: '#ffffff', subtle: '#f0f0f0' }
        }
      }
    });
  }
  
  applyLightTheme() {
    this.tokenService.resetTokens();
  }
  
  // Access current theme state
  get currentTokens() {
    return this.tokenService.effectiveTokens();
  }
  
  // Listen to token changes
  get tokenChanges() {
    return this.tokenService.overrides;
  }
}

// Method 3: Legacy approach (still supported)
import { RagTokens, injectDesignTokens } from '@shared/tokens';

function applyDarkTheme() {
  injectDesignTokens(darkTheme);
}
```

### Custom Component Archetypes

```typescript
// Extend archetypes for custom components
const CustomArchetypes = {
  ...ComponentArchetypes,
  
  // Add custom sidebar archetype
  sidebar: {
    collapsed: { width: '60px', padding: '8px' },
    expanded: { width: '240px', padding: '16px' }
  },
  
  // Add custom alert archetype
  alert: {
    info: { background: cssVarValue('semantic.color.primary.100'), color: cssVarValue('semantic.color.primary.900') },
    success: { background: cssVarValue('semantic.color.success.100'), color: cssVarValue('semantic.color.success.900') },
    warning: { background: cssVarValue('semantic.color.warning.100'), color: cssVarValue('semantic.color.warning.900') },
    error: { background: cssVarValue('semantic.color.danger.100'), color: cssVarValue('semantic.color.danger.900') }
  }
};
```

## 🛠️ Utilities

### Combine Multiple Archetypes

```typescript
// Combine button style + size + custom overrides
const complexButtonStyles = combineArchetypes(
  ComponentArchetypes.button.outline,
  ComponentArchetypes.size.lg,
  { 
    borderWidth: '2px',
    fontWeight: '600' 
  }
);
```

### Dynamic Token Access

```typescript
// Build dynamic styles based on props
function getButtonStyles(variant: ButtonVariant, size: Size, disabled: boolean) {
  const base = ComponentArchetypes.button[variant];
  const sizing = ComponentArchetypes.size[size];
  const state = disabled ? { opacity: '0.5', cursor: 'not-allowed' } : {};
  
  return combineArchetypes(base, sizing, state);
}
```

## 📏 Migration from Complex Systems

### Before (Over-engineered)
```typescript
// Too many type guards and validations
if (isValidInputState(state) && isValidInputSize(size)) {
  const styles = getInputArchetypeToken(state, size, {
    validateProps: true,
    enableTypeGuards: true,
    strictMode: true
  });
}
```

### After (Simple & Practical)
```typescript
// Clean and direct
const styles = combineArchetypes(
  ComponentArchetypes.input[state],
  ComponentArchetypes.size[size]
);
```

## 🚀 Best Practices

### 1. Use Archetypes First
```typescript
// ✅ Good: Use archetypes for common patterns
const styles = ComponentArchetypes.button.solid;

// ⚠️ Okay: Direct token access for specific needs
const customColor = $dt('primitive.color.blue.500').value;
```

### 2. Combine Thoughtfully
```typescript
// ✅ Good: Logical combinations
combineArchetypes(
  ComponentArchetypes.button.outline,
  ComponentArchetypes.size.md
);

// ❌ Avoid: Conflicting styles
combineArchetypes(
  ComponentArchetypes.button.solid,    // Sets background
  ComponentArchetypes.button.outline   // Also sets background - conflict!
);
```

### 3. Keep It Simple
```typescript
// ✅ Simple and readable
const buttonStyles = computed(() => 
  combineArchetypes(
    ComponentArchetypes.button[this.variant()],
    ComponentArchetypes.size[this.size()]
  )
);

// ❌ Over-engineered
const buttonStyles = computed(() => {
  const validator = new ArchetypeValidator();
  const tokenResolver = new TokenResolver({ strict: true });
  const styleGenerator = new StyleGenerator(validator, tokenResolver);
  return styleGenerator.generate(/* ... complex config ... */);
});
```

---

**Version**: 3.0.0 - Simplified & Practical  
**Last Updated**: August 30, 2025  
**Status**: ✅ Production Ready