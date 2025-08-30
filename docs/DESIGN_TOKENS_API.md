# Design Tokens API Reference

Quick API reference for the simplified RAG Studio design token system.

## 🚀 Core Imports

```typescript
// Essential imports
import { 
  RagTokens,                    // Complete token system
  ComponentArchetypes,          // Component patterns
  $dt,                          // Token accessor
  cssVarValue,                 // CSS variable helper
  combineArchetypes,           // Style combiner
  injectDesignTokens,          // Runtime injection (legacy)
  
  // New service-based approach
  DesignTokenService,          // Token management service
  provideDesignTokens          // Provider function
} from '@shared/tokens';

// Types
import type { 
  Size, 
  ButtonVariant, 
  InputState,
  CardVariant,
  BadgeVariant,
  
  // New service types
  DesignTokenOverrides,
  DesignTokenConfig
} from '@shared/tokens';
```

## 📋 Token Structure

### Core Token System
```typescript
RagTokens = {
  primitive: {
    color: { gray, blue, green, red, amber, white, black, transparent },
    spacing: { xs, sm, md, lg, xl },
    fontSize: { xs, sm, md, lg, xl },
    lineHeight: { xs, sm, md, lg, xl },
    radius: { xs, sm, md, lg, xl },
    shadow: { xs, sm, md, lg, xl }
  },
  
  semantic: {
    color: {
      primary, success, warning, danger, neutral,
      background: { default, subtle, muted },
      border: { default, subtle, muted },
      text: { default, subtle, muted, disabled, inverse }
    }
  },
  
  archetypes: {
    button: { solid, outline, ghost, soft },
    input: { default, focus, error, disabled },
    card: { flat, elevated, floating },
    badge: { primary, success, warning, danger, neutral },
    size: { xs, sm, md, lg, xl }
  }
}
```

## 🛠️ API Functions

### `$dt(path: string)`
Get token value and CSS variable name.

```typescript
const token = $dt('semantic.color.primary.500');
// Returns: { value: "hsl(206, 100%, 50.0%)", cssVar: "--rag-semantic-color-primary-500" }

// Usage
const styles = {
  color: token.value,
  backgroundColor: `var(${token.cssVar})`
};
```

### `cssVarValue(path: string)`
Get CSS variable reference for a token.

```typescript
const color = cssVarValue('semantic.color.text.default');
// Returns: "var(--rag-semantic-color-text-default)"

// Usage in styles
const styles = {
  color: cssVarValue('semantic.color.text.default'),
  padding: cssVarValue('primitive.spacing.md')
};
```

### `combineArchetypes(...archetypes)`
Merge multiple archetype style objects.

```typescript
const styles = combineArchetypes(
  ComponentArchetypes.button.solid,
  ComponentArchetypes.size.md,
  { fontWeight: '600' }  // Custom overrides
);

// Returns merged style object with all properties
```

### `provideDesignTokens(config?)`
Setup design tokens with Angular's provider system.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    // Basic setup
    provideDesignTokens(),
    
    // With overrides
    provideDesignTokens({
      overrides: {
        primitive: {
          color: { blue: { 500: 'hsl(220, 100%, 50%)' } }
        },
        semantic: {
          color: {
            background: { default: '#f8f9fa' },
            text: { default: '#212529' }
          }
        }
      }
    })
  ]
};
```

### `DesignTokenService` - Angular Service
Reactive token management with dynamic updates.

```typescript
@Injectable()
export class DesignTokenService {
  // Properties
  readonly overrides: Signal<DesignTokenOverrides>;
  readonly effectiveTokens: Signal<typeof RagTokens>;
  readonly cssVariables: Signal<string>;
  
  // Methods
  updateTokens(overrides: DesignTokenOverrides): void;
  resetTokens(): void;
  getToken(path: string): string;
  getCSSVariable(path: string): string;
}

// Usage in components
@Component({...})
export class MyComponent {
  constructor(private tokenService: DesignTokenService) {}
  
  // Reactive token access
  primaryColor = computed(() => 
    this.tokenService.getToken('semantic.color.primary.500')
  );
  
  // Dynamic updates
  toggleTheme() {
    this.tokenService.updateTokens({
      semantic: {
        color: {
          background: { default: '#000000' },
          text: { default: '#ffffff' }
        }
      }
    });
  }
  
  resetTheme() {
    this.tokenService.resetTokens();
  }
}
```

### `injectDesignTokens(tokens?, selector?)` (Legacy)
Direct injection of CSS variables into DOM.

```typescript
// Default injection to :root
injectDesignTokens();

// Custom tokens
injectDesignTokens(customTokens, '.theme-dark');

// Custom selector
injectDesignTokens(RagTokens, '[data-theme="custom"]');
```

## 🧩 Component Archetypes

### Button Archetypes
```typescript
ComponentArchetypes.button = {
  solid: {
    background: 'var(--rag-semantic-color-text-default)',
    color: 'var(--rag-semantic-color-text-inverse)',
    border: 'none'
  },
  
  outline: {
    background: 'var(--rag-semantic-color-background-default)', 
    color: 'var(--rag-semantic-color-text-default)',
    border: '1px solid var(--rag-semantic-color-border-default)'
  },
  
  ghost: {
    background: 'transparent',
    color: 'var(--rag-semantic-color-text-default)',
    border: 'none'
  },
  
  soft: {
    background: 'var(--rag-semantic-color-background-muted)',
    color: 'var(--rag-semantic-color-text-default)',
    border: 'none'
  }
}
```

### Input Archetypes
```typescript
ComponentArchetypes.input = {
  default: {
    background: 'var(--rag-semantic-color-background-default)',
    border: '1px solid var(--rag-semantic-color-border-default)',
    color: 'var(--rag-semantic-color-text-default)'
  },
  
  focus: {
    background: 'var(--rag-semantic-color-background-default)',
    border: '1px solid var(--rag-semantic-color-primary-500)',
    boxShadow: '0 0 0 3px var(--rag-semantic-color-primary-100)',
    color: 'var(--rag-semantic-color-text-default)'
  },
  
  error: {
    background: 'var(--rag-semantic-color-background-default)',
    border: '1px solid var(--rag-semantic-color-danger-500)',
    boxShadow: '0 0 0 3px var(--rag-semantic-color-danger-100)',
    color: 'var(--rag-semantic-color-text-default)'
  },
  
  disabled: {
    background: 'var(--rag-semantic-color-background-muted)',
    border: '1px solid var(--rag-semantic-color-border-subtle)',
    color: 'var(--rag-semantic-color-text-disabled)',
    cursor: 'not-allowed'
  }
}
```

### Size Archetype
```typescript
ComponentArchetypes.size = {
  xs: { 
    height: '24px', 
    padding: '0 var(--rag-primitive-spacing-xs)', 
    fontSize: 'var(--rag-primitive-fontSize-xs)', 
    borderRadius: 'var(--rag-primitive-radius-xs)' 
  },
  sm: { 
    height: '28px', 
    padding: '0 var(--rag-primitive-spacing-sm)', 
    fontSize: 'var(--rag-primitive-fontSize-sm)', 
    borderRadius: 'var(--rag-primitive-radius-sm)' 
  },
  md: { 
    height: '32px', 
    padding: '0 var(--rag-primitive-spacing-md)', 
    fontSize: 'var(--rag-primitive-fontSize-md)', 
    borderRadius: 'var(--rag-primitive-radius-md)' 
  },
  lg: { 
    height: '40px', 
    padding: '0 var(--rag-primitive-spacing-lg)', 
    fontSize: 'var(--rag-primitive-fontSize-lg)', 
    borderRadius: 'var(--rag-primitive-radius-md)' 
  },
  xl: { 
    height: '48px', 
    padding: '0 var(--rag-primitive-spacing-xl)', 
    fontSize: 'var(--rag-primitive-fontSize-xl)', 
    borderRadius: 'var(--rag-primitive-radius-lg)' 
  }
}
```

## 🎨 Color Scale Reference

### Available Colors
| Color | Purpose | Example Values |
|-------|---------|----------------|
| `gray` | UI elements, text, borders | 50: #fcfcfc, 500: #737373, 1000: #171717 |
| `blue` | Primary brand, info | 50: #eff6ff, 500: #3b82f6, 1000: #1e3a8a |
| `green` | Success states | 50: #f0fdf4, 500: #22c55e, 1000: #14532d |
| `red` | Error/danger states | 50: #fef2f2, 500: #ef4444, 1000: #7f1d1d |
| `amber` | Warning states | 50: #fffbeb, 500: #f59e0b, 1000: #78350f |

### Color Scale Steps
- **50-200**: Subtle backgrounds, hover states
- **300-400**: Borders, disabled states
- **500-700**: Primary UI elements
- **800-1000**: Text, high contrast

## 📏 Size Scale Reference

| Size | Height | Padding | Font Size | Border Radius | Usage |
|------|--------|---------|-----------|---------------|-------|
| `xs` | 24px | 4px | 11px | 2px | Compact, dense |
| `sm` | 28px | 8px | 12px | 4px | Small actions |
| `md` | 32px | 12px | 14px | 6px | Default size |
| `lg` | 40px | 16px | 16px | 8px | Primary actions |
| `xl` | 48px | 24px | 18px | 12px | Hero elements |

## 🔧 TypeScript Types

### Core Types
```typescript
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ColorName = 'gray' | 'blue' | 'green' | 'red' | 'amber';
```

### Component Types
```typescript
type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft';
type InputState = 'default' | 'focus' | 'error' | 'disabled';
type CardVariant = 'flat' | 'elevated' | 'floating';
type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
```

### Service Types
```typescript
interface DesignTokenOverrides {
  primitive?: Partial<typeof RagTokens.primitive>;
  semantic?: Partial<typeof RagTokens.semantic>;
  archetypes?: Partial<typeof RagTokens.archetypes>;
}

interface DesignTokenConfig {
  overrides?: DesignTokenOverrides;
}
```

### Component Props
```typescript
interface ButtonProps {
  variant?: ButtonVariant;
  size?: Size;
  disabled?: boolean;
}

interface InputProps {
  state?: InputState;
  size?: Size;
  disabled?: boolean;
}

interface CardProps {
  variant?: CardVariant;
  size?: Size;
}
```

## 💻 Common Usage Patterns

### Angular Component Integration

```typescript
// Using service-based approach (recommended)
@Component({
  selector: 'rag-button',
  template: `<button [style]="styles()"><ng-content></ng-content></button>`
})
export class RagButtonComponent {
  readonly variant = input<ButtonVariant>('solid');
  readonly size = input<Size>('md');
  readonly disabled = input(false);
  
  constructor(private tokenService: DesignTokenService) {}
  
  // Reactive styles that update with token changes
  styles = computed(() => {
    const tokens = this.tokenService.effectiveTokens();
    return combineArchetypes(
      tokens.archetypes.button[this.variant()],
      tokens.archetypes.size[this.size()],
      this.disabled() ? { opacity: '0.5', cursor: 'not-allowed' } : {}
    );
  });
  
  // Alternative: Direct token access
  buttonColor = computed(() => 
    this.tokenService.getToken('semantic.color.primary.500')
  );
}

// Legacy approach (still works)
@Component({
  selector: 'rag-button-legacy',
  template: `<button [style]="styles()"><ng-content></ng-content></button>`
})
export class RagButtonLegacyComponent {
  readonly variant = input<ButtonVariant>('solid');
  readonly size = input<Size>('md');
  readonly disabled = input(false);
  
  styles = computed(() => 
    combineArchetypes(
      ComponentArchetypes.button[this.variant()],
      ComponentArchetypes.size[this.size()],
      this.disabled() ? { opacity: '0.5', cursor: 'not-allowed' } : {}
    )
  );
}
```

### SCSS Integration

```scss
.component {
  // Direct token usage
  color: var(--rag-semantic-color-text-default);
  background: var(--rag-semantic-color-background-default);
  padding: var(--rag-primitive-spacing-md);
  border-radius: var(--rag-primitive-radius-md);
  
  // Size variants
  &.size-sm { height: var(--rag-primitive-spacing-sm); }
  &.size-md { height: var(--rag-primitive-spacing-md); }
  &.size-lg { height: var(--rag-primitive-spacing-lg); }
  
  // State variations
  &:hover {
    background: var(--rag-semantic-color-background-subtle);
    box-shadow: var(--rag-primitive-shadow-sm);
  }
  
  &:focus {
    outline: 2px solid var(--rag-semantic-color-primary-500);
    outline-offset: 2px;
  }
}
```

### Dynamic Styling

```typescript
// Build styles dynamically based on conditions
function getComponentStyles(
  variant: ButtonVariant, 
  size: Size, 
  disabled: boolean,
  loading: boolean
) {
  const baseStyles = ComponentArchetypes.button[variant];
  const sizeStyles = ComponentArchetypes.size[size];
  
  const conditionalStyles = {
    ...(disabled && { opacity: '0.5', cursor: 'not-allowed' }),
    ...(loading && { cursor: 'wait' })
  };
  
  return combineArchetypes(baseStyles, sizeStyles, conditionalStyles);
}
```

## 🎯 CSS Variable Names

### Pattern
All CSS variables follow the pattern:
```
--rag-{tier}-{category}-{subcategory}-{property}-{variant}
```

### Examples
```css
/* Primitive tokens */
--rag-primitive-color-blue-500
--rag-primitive-spacing-md
--rag-primitive-fontSize-lg

/* Semantic tokens */
--rag-semantic-color-primary-500
--rag-semantic-color-text-default
--rag-semantic-color-background-subtle

/* Generated from archetypes */
--rag-archetypes-button-solid-background
--rag-archetypes-size-md-height
```

---

**Version**: 3.0.0 - Simplified & Practical  
**Last Updated**: August 30, 2025