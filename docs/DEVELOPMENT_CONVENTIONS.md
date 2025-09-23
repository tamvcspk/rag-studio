# Development Conventions for RAG Studio

This document consolidates all development conventions, coding standards, and architectural patterns used throughout RAG Studio. It serves as the single source of truth for development practices.

## Table of Contents

- [Angular Frontend Conventions](#angular-frontend-conventions)
- [Rust Backend Conventions](#rust-backend-conventions)
- [Component Architecture Conventions](#component-architecture-conventions)
- [Testing Conventions](#testing-conventions)
- [File Naming Conventions](#file-naming-conventions)
- [Project Structure Conventions](#project-structure-conventions)

## Angular Frontend Conventions

### Angular 20+ Modern Patterns

**IMPORTANT: This project uses Angular 20 (latest as of August 2025). Always use Angular 20 syntax and features.**

#### Core Principles
- **Standalone Architecture**: All components, directives, and pipes use `standalone: true` by default
- **Modern Reactivity**: Use `signal()`, `computed()`, and `effect()` instead of RxJS BehaviorSubject where possible
- **Signal-based Inputs/Outputs**: Use `input()`, `input.required()`, and `output()` instead of `@Input()` and `@Output()`
- **Control Flow Syntax**: Use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- **Zoneless Change Detection**: Enabled with `provideZonelessChangeDetection()` for better performance

#### Template Standards
- **Control Flow**: Use `@if (condition) { }`, `@for (item of items; track item.id) { }`, `@switch (value) { }`
- **Deferred Loading**: Use `@defer (on viewport) { } @placeholder { } @loading { } @error { }`
- **Self-Closing Tags**: Supported (`<my-comp />`)
- **Signal Calls**: Always call signals as functions in templates: `{{ mySignal() }}`

#### State Management Integration
- Use NgRx Signal Stores for centralized state management instead of services
- Components should inject stores directly using `inject(StoreClass)`
- Expose store signals and computed values as component properties
- Use async methods for Tauri command operations with proper error handling
- Implement real-time event listeners within store initialization methods
- Follow the pattern: Store → Component, not Service → Component

## Component Architecture Conventions

### Component Structure Principles

**CRITICAL**: All Angular components follow these strict conventions documented in `docs/designs/CORE_DESIGN.md`:

#### 1. Flat Directory Structure
Store all composite components at the root level of their category, **never in subdirectories**:
- ✅ **Correct**: `src/app/shared/components/composite/general-settings-panel/`
- ❌ **Incorrect**: `src/app/shared/components/composite/settings/general-settings-panel/`

#### 2. File Separation Convention (MANDATORY)
Components **must** use separate files for template and logic:
- `component-name.ts` - Component logic (TypeScript)
- `component-name.html` - Template (HTML) - **Always separate file, never inline**
- `component-name.scss` - Styles (SCSS)

#### 3. Naming Conventions

**Atomic and Semantic Components** (use `rag-` prefix):
- **Component Selector**: `rag-component-name` (kebab-case with rag prefix)
- **Class Name**: `RagComponentName` (PascalCase with Rag prefix)
- **Directory Name**: `component-name` (kebab-case **without** rag prefix for directory)
- **File Names**: `component-name.ts/html/scss` (kebab-case without rag prefix)

**Composite Components and Pages** (NO `rag-` prefix):
- **Component Selector**: `component-name` (kebab-case **without** rag prefix)
- **Class Name**: `ComponentName` (PascalCase **without** Rag prefix)
- **Directory Name**: `component-name` (kebab-case without rag prefix for directory)
- **File Names**: `component-name.ts/html/scss` (kebab-case without rag prefix)

#### 4. Component Categories
```
src/app/shared/components/
├── atomic/           # Basic UI primitives (buttons, inputs, icons)
├── semantic/         # Context-aware components (cards, forms, navigation)
└── composite/        # Complex business components (flat structure only)
```

#### 5. Import Path Standards
Use relative imports based on component location:
```typescript
// From composite components:
import { RagButton } from '../../atomic';
import { RagFormField } from '../../semantic';
import { SomeStore } from '../../../store/some.store';
```

#### 6. Component Implementation Standards
```typescript
// Modern Angular 20 component example (Atomic/Semantic component)
import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-example-component',  // rag- prefix for atomic/semantic
  standalone: true,
  imports: [CommonModule],
  templateUrl: './example-component.html',  // Always separate file
  styleUrls: ['./example-component.scss']
})
export class RagExampleComponent {  // Rag prefix for atomic/semantic
  // Signal-based inputs with proper typing
  readonly items = input.required<Item[]>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  // Signal-based outputs
  readonly itemClick = output<Item>();

  // Internal signals for state
  private readonly visible = signal(true);

  // Computed values for derived state
  readonly containerClasses = computed(() => [
    'container',
    `size-${this.size()}`,
    this.disabled() ? 'disabled' : ''
  ].filter(Boolean).join(' '));
}
```

### Export and Index Structure
Components are exported through barrel files at each level:
```typescript
// atomic/index.ts (with rag- prefix)
export { RagButton } from './primitives/rag-button/rag-button';

// semantic/index.ts (with rag- prefix)
export { RagCard } from './rag-card/rag-card';

// composite/index.ts (NO rag- prefix)
export { GeneralSettingsPanel } from './general-settings-panel/general-settings-panel';
```

## Rust Backend Conventions

### Service Architecture Guidelines

All services in RAG Studio follow a standardized structure for maintainability, testability, and clear separation of concerns:

```
core/src/
├── lib.rs                  # Entry point with public exports
├── modules/                # Domain-specific modules (business logic)
│   ├── mod.rs
│   └── kb/                 # Knowledge Base domain module
│       ├── mod.rs
│       ├── service.rs      # KB business logic and operations
│       ├── models.rs       # KB-specific data structures
│       ├── schema.rs       # KB database schema definitions
│       └── errors.rs       # KB-specific error types
├── services/               # Infrastructure services (cross-cutting concerns)
│   ├── mod.rs
│   ├── sql.rs              # SQLite service implementation
│   ├── vector.rs           # LanceDB vector service implementation
│   └── (future services)
├── models/                 # Shared data structures
├── schemas/                # Shared database schemas
├── errors/                 # Application-wide error handling
├── utils/                  # Utility functions and helpers
└── state/                  # Application state management
```

#### Service Implementation Pattern
Each service follows this consistent pattern:
1. **Error Types**: Custom error enums with `thiserror::Error`
2. **Configuration Structs**: With `new_mvp()`, `new_production()`, and `test_config()` methods
3. **Service Trait**: Async trait defining the service interface
4. **Service Implementation**: Concrete implementation with dependency injection
5. **Helper Functions**: Utility functions and type conversions
6. **Test Helpers**: `#[cfg(test)]` helper methods only (no inline tests)

#### Module Organization Principles
- **Domain Modules** (`modules/`): Business logic specific to a domain
- **Infrastructure Services** (`services/`): Cross-cutting technical concerns
- **Shared Components**: Models, schemas, errors, utils used across domains

## Testing Conventions

### Test Structure
Tests follow Cargo standards with proper separation:

#### Unit Tests (co-located with source code using `#[cfg(test)]` modules)
```rust
// Located in the same file as the implementation
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_functionality() {
        // Unit test implementation
    }
}
```

#### Integration Tests (standalone files in tests/ directory)
```
core/tests/
├── kb_module_integration.rs
├── sql_integration.rs
├── vector_integration.rs
├── state_manager_integration.rs
└── end_to_end_integration.rs
```

#### Angular Component Tests
- Test signal-based components with modern testing patterns
- Test files follow `*.spec.ts` naming convention
- Tests located alongside components in their respective directories
- Component tests using Angular Testing Library patterns

### Test Classification
- **Unit Tests**: Test individual methods, error conditions, and isolated functionality
- **Integration Tests**: Test complete workflows, cross-service interactions, and end-to-end scenarios
- **Test Results**: 42 tests passing (31 unit tests + 11 integration tests) with 91.3% success rate

## File Naming Conventions

### Angular Files
- **Components**: `component-name.ts`, `component-name.html`, `component-name.scss`
- **Services/Stores**: `service-name.service.ts`, `store-name.store.ts`
- **Types/Interfaces**: `interface-name.interface.ts`, `types.ts`
- **Tests**: `component-name.spec.ts`, `service-name.spec.ts`

### Rust Files
- **Modules**: `module_name.rs` (snake_case)
- **Services**: `service_name.rs` (snake_case)
- **Tests**: Integration tests in `tests/module_name_integration.rs`
- **Configuration**: Use snake_case for file names

### Documentation Files
- **Technical Docs**: `TITLE_CASE.md` (e.g., `CORE_DESIGN.md`)
- **User Guides**: `Title_Case.md` (e.g., `Quick_Start.md`)
- **Specifications**: `version_spec_name.md` (e.g., `1.1.1_SQLite_Setup_Specification.md`)

## Project Structure Conventions

### Frontend Structure
```
src/app/
├── pages/                  # Main application pages
├── shared/
│   ├── components/         # 3-tier component architecture
│   │   ├── atomic/        # Basic UI primitives
│   │   ├── semantic/      # Context-aware components
│   │   └── composite/     # Complex business components (flat structure)
│   ├── store/             # NgRx Signal Stores
│   ├── tokens/            # Design token system
│   └── layout/            # Layout components
```

### Backend Structure
```
src-tauri/src/
├── lib.rs                 # Composition root
├── main.rs                # Entry point
├── manager.rs             # Dependency injection manager
└── ipc/                   # Tauri commands by domain
```

### Workspace Structure
```
rag-studio/
├── src/                   # Angular frontend
├── src-tauri/            # Tauri Rust backend
├── core/                 # Shared library crate
├── mcp/                  # MCP subprocess
├── embedding-worker/     # Embedding subprocess
└── docs/                 # Documentation
```

## Design System Integration

### Component Development Standards
- Use Radix-inspired design system components consistently
- Use Lucide Icons for all iconography (3,300+ icons, tree-shakeable)
- Implement atomic, semantic, and composite component architecture
- Use SCSS with CSS custom properties for theming (light/dark mode support)
- Implement responsive layouts using CSS Grid and Flexbox

### Design Token Integration
All components leverage the **RAG Studio Design Token System** with three layers:
- **Primitive Tokens**: Raw values (colors, spacing, typography)
- **Semantic Tokens**: Contextual meanings (primary, success, warning, etc.)
- **Component Archetypes**: Ready-to-use patterns for consistent component styling

## Performance and Security Guidelines

### Angular Performance
- Use signals for fine-grained reactivity
- Avoid Zone.js dependencies where possible
- Use `@defer` blocks for performance-critical components
- Import only needed modules/components for tree shaking

### Rust Performance
- Use async traits with proper error handling
- Implement circuit breakers and backpressure
- Use Arc<RwLock<AppState>> for MVP, upgrade to actor-based system post-MVP
- Profile critical paths and optimize incrementally

### Security Best Practices
- Never introduce code that exposes or logs secrets and keys
- Never commit secrets or keys to the repository
- Follow defensive security practices only
- Implement proper input validation and sanitization

## Key Reminders

1. **Component Structure**: Always use flat directory structure and separate HTML files
2. **Angular 20**: Use modern syntax (signals, control flow, standalone components)
3. **Testing**: Maintain 90%+ test coverage with proper unit/integration separation
4. **Documentation**: Update this file when adding new conventions
5. **Performance**: Profile early, optimize incrementally
6. **Security**: Follow defensive practices, never expose sensitive data

---

**Note**: This document is the authoritative source for all development conventions. When in doubt, refer to this file. If conventions conflict between files, this document takes precedence.