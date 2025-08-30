# RAG Studio - Shared Components

This directory contains the shared component library for RAG Studio, organized following atomic design principles.

## Directory Structure

```
src/app/shared/components/
├── atomic/                 # Atomic components (lowest level)
│   ├── primitives/        # Basic UI primitives
│   └── feedback/          # User feedback components
├── semantic/              # Semantic components (molecules)
├── composite/             # Complex composite components (organisms)
└── layout/                # Layout components
```

## Component Categories

### Atomic Components

**Primitives** - Basic UI building blocks:
- `rag-badge` - Status badges and labels
- `rag-button` - Interactive buttons
- `rag-checkbox` - Checkbox inputs
- `rag-icon` - Icon component using Lucide
- `rag-input` - Text input fields
- `rag-progress` - Progress bars
- `rag-radio` - Radio button inputs
- `rag-select` - Dropdown selects
- `rag-skeleton` - Loading skeletons
- `rag-spinner` - Loading spinners
- `rag-switch` - Toggle switches
- `rag-textarea` - Multi-line text inputs

**Feedback** - User feedback and notifications:
- `rag-alert` - Alert messages
- `rag-status-indicator` - Status indicators
- `rag-toast` - Toast notifications
- `rag-tooltip` - Contextual tooltips

### Semantic Components

Components that combine primitives for specific use cases:
- Data display components (cards, tables, metrics)
- Form components (form groups, validators)
- Navigation components (menus, breadcrumbs)
- Overlay components (modals, dropdowns)

### Composite Components

Complex components that combine multiple semantic components:
- Flow designer
- Tool cards
- Pipeline visualizations
- Wizards and multi-step forms

### Layout Components

Structural components for page and section layout:
- Main layout
- Sidebar
- Headers and footers

## Design System

All components follow the RAG Studio design system principles:

- **Consistent API**: Standard props and events across components
- **Design Tokens**: Uses CSS custom properties for theming
- **Accessibility**: WCAG 2.1 AA compliance
- **Modern Angular**: Uses Angular 20+ signals and standalone components
- **TypeScript**: Fully typed with strict type checking
- **Testing**: Comprehensive unit and integration tests

## Usage Guidelines

### Import Pattern

```typescript
// Import individual components
import { RagButton, RagInput } from './shared/components/atomic/primitives';

// Or use the barrel exports
import { RagButton, RagInput } from './shared/components';
```

### Component Props

All components use Angular's modern input/output syntax:

```typescript
// Input properties
readonly variant = input<'solid' | 'outline'>('solid');
readonly disabled = input(false);

// Output events
readonly onClick = output<Event>();
```

### Form Integration

Form components implement `ControlValueAccessor`:

```typescript
// Reactive forms
this.form = this.fb.group({
  email: ['', [Validators.required, Validators.email]]
});

// Template
<rag-input [formControl]="form.controls.email" type="email" />
```

### Styling

Components use design tokens for consistent theming:

```scss
// Component styles use design tokens
.component {
  padding: var(--rag-primitive-spacing-md);
  color: var(--rag-semantic-color-text-default);
  border-radius: var(--rag-primitive-radius-md);
}
```

## Documentation

- [Atomic Components Documentation](../docs/ATOMIC_COMPONENTS.md) - Complete reference for all atomic components
- [Design System Guide](../docs/DESIGN_SYSTEM.md) - Design principles and tokens
- [Contributing Guide](../docs/CONTRIBUTING.md) - How to add new components

## Development

### Adding New Components

1. **Choose the right category**: Atomic, semantic, or composite
2. **Follow naming conventions**: `rag-` prefix for all components
3. **Use the component template**: Copy structure from existing components
4. **Implement proper types**: Use TypeScript for all props and events
5. **Add tests**: Unit tests and accessibility tests
6. **Update documentation**: Add to the appropriate docs

### Testing

```bash
# Run component tests
npm run test

# Run accessibility tests
npm run test:a11y

# Run visual regression tests
npm run test:visual
```

### Building

```bash
# Build the component library
npm run build:components

# Generate component documentation
npm run docs:generate
```

## Browser Support

- Chrome 90+
- Firefox 88+ 
- Safari 14+
- Edge 90+

## Contributing

Please read our [Contributing Guide](../docs/CONTRIBUTING.md) before submitting changes to the component library.
