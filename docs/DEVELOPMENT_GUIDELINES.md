# Development Guidelines

This document provides comprehensive development best practices for RAG Studio, covering Angular frontend, Rust backend, testing, and performance guidelines.

## Angular Frontend Guidelines

**IMPORTANT: This project uses Angular 20 (latest as of August 2025). Always use Angular 20 syntax and features.**

### Core Angular 20 Principles
- **Standalone Architecture**: All components, directives, and pipes use `standalone: true` by default and must declare `standalone: true` explicitly in each `@Component` metadata block
- **Modern Reactivity**: Use `signal()`, `computed()`, and `effect()` instead of RxJS BehaviorSubject where possible
- **Signal-based Inputs/Outputs**: Use `input()`, `input.required()`, and `output()` instead of `@Input()` and `@Output()`
- **Control Flow Syntax**: Use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- **Zoneless Change Detection**: Enabled with `provideZonelessChangeDetection()` for better performance

### Project Setup Requirements
- TypeScript 5.5+ and Node.js 20.11.1+ required
- Bootstrap with `bootstrapApplication(AppComponent, {providers: []})` instead of `bootstrapModule`
- Use Vite and esbuild as default build tools via Angular CLI
- Enable zoneless change detection where Zone.js isn't required

### Component Development
Semantic components follow the same signal-first conventions as atomic primitives: use `readonly` signal inputs/outputs, computed class arrays, and explicit `imports` arrays.
```typescript
// Modern Angular 20 component example (Atomic/Semantic component)
import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rag-example',  // rag- prefix for atomic/semantic components
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div [class]="containerClasses()">
        @for (item of items(); track item.id) {
          <div>{{ item.name }}</div>
        } @empty {
          <div>No items available</div>
        }
      </div>
    }
  `
})
export class RagExampleComponent {  // Rag prefix for atomic/semantic components
  // Signal-based inputs with proper typing
  readonly items = input.required<Item[]>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false, { transform: Boolean });

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

### Template Syntax
- **Control Flow**: Use `@if (condition) { }`, `@for (item of items; track item.id) { }`, `@switch (value) { }`
- **Deferred Loading**: Use `@defer (on viewport) { } @placeholder { } @loading { } @error { }`
- **Self-Closing Tags**: Supported (`<my-comp />`)
- **Signal Calls**: Always call signals as functions in templates: `{{ mySignal() }}`

### Forms and Validation
- Use signal-based form controls with improved typed forms
- Integrate signals with form state management
- Leverage `toSignal()` and `toObservable()` for RxJS interop

### Performance Optimization
- **Signals**: Use `signal()`, `computed()`, `effect()` for fine-grained reactivity
- **Zoneless**: Avoid Zone.js dependencies where possible
- **Lazy Loading**: Use `@defer` blocks for performance-critical components
- **Tree Shaking**: Import only needed modules/components

### State Management Integration
- Use NgRx Signal Stores for centralized state management instead of services
- Components should inject stores directly using `inject(StoreClass)`
- Expose store signals and computed values as component properties
- Use async methods for Tauri command operations with proper error handling
- Implement real-time event listeners within store initialization methods
- Follow the pattern: Store → Component, not Service → Component

### Design System Integration
**NOTE**: Complete design system and component architecture standards are documented in `docs/DEVELOPMENT_CONVENTIONS.md`.

#### **CRITICAL: Always Use Existing Components and Design Tokens**

1. **Use Existing Components First**: Before creating new UI elements, check the existing component library:
   - **Atomic Components**: `rag-button`, `rag-card`, `rag-icon`, `rag-chip`, `rag-input`, etc.
   - **Semantic Components**: `rag-page-header`, `rag-stats-overview`, `rag-dialog`, etc.
   - **Composite Components**: `empty-state-panel`, `create-*-wizard`, etc.
   - Check `docs/docs/ATOMIC_COMPONENTS_REFERENCE.md` for complete component reference

2. **Design Token System**: **MANDATORY** - All styling must use design tokens from `docs/docs/DESIGN_TOKENS_GUIDE.md`:
   - **Primitive Tokens**: `var(--rag-primitive-spacing-md)`, `var(--rag-primitive-color-blue-500)`
   - **Semantic Tokens**: `var(--rag-semantic-color-background-default)`, `var(--rag-semantic-color-text-default)`
   - **Component Archetypes**: Use `ComponentArchetypes.button.solid`, `ComponentArchetypes.size.md`
   - **NO Custom CSS**: Avoid custom spacing, colors, or sizing - use design tokens exclusively

3. **Icon Usage Pattern**: Follow the established pattern from `docs/docs/ATOMIC_COMPONENTS_REFERENCE.md`:
   ```typescript
   // ✅ Correct: Import specific icons and use rag-icon component
   import { CheckIcon, CpuIcon } from 'lucide-angular';

   @Component({
     imports: [RagIcon],
     template: `<rag-icon [img]="CheckIcon" size="md"></rag-icon>`
   })
   export class MyComponent {
     readonly CheckIcon = CheckIcon;
   }
   ```

4. **Component Architecture Guidelines**:
   - Use Radix-inspired design system components consistently
   - Use Lucide Icons for all iconography (3,300+ icons, tree-shakeable)
   - 3-tier component architecture: Atomic → Semantic → Composite
   - **Component Naming**:
     - Atomic and Semantic components use `rag-` prefix (`rag-button`, `rag-card`)
     - Composite components and Pages do NOT use `rag-` prefix (`settings-panel`, `dashboard-page`)
   - SCSS with CSS custom properties for theming (light/dark mode support)
   - Responsive layouts using CSS Grid and Flexbox

### Migration from Older Angular Versions
- Replace `@Input()` with `input()` or `input.required()`
- Replace `@Output()` with `output()`
- Replace `*ngIf/*ngFor/*ngSwitch` with `@if/@for/@switch`
- Replace `BehaviorSubject` with `signal()` where appropriate
- Use `TestBed.inject()` instead of deprecated `TestBed.get()`
- Remove `InjectFlags` usage, use object options: `{optional: true, skipSelf: true}`

### Breaking Changes to Avoid
- No HammerJS support (removed in Angular 21)
- No `ng-reflect-*` attributes by default
- `ApplicationRef.tick()` throws errors instead of catching them
- TypeScript <5.5 not supported

### Testing and Debugging
- Use `provideCheckNoChangesConfig()` for zoneless debugging
- Deep integration with Chrome DevTools for performance profiling
- Test signal-based components with modern testing patterns

## Service Structure Guidelines

**IMPORTANT: All services must follow the consistent service structure pattern defined in `docs/DEVELOPMENT_CONVENTIONS.md` and `docs/designs/CORE_DESIGN.md`.**

### Service Organization

RAG Studio enforces a standardized service structure for maintainability and consistency:

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
│   └── (future services to be added when needed)
├── models/                 # Shared data structures used across modules
│   ├── mod.rs
│   └── common.rs           # Common types, DTOs, and shared models
├── schemas/                # Shared database schemas and migrations
│   ├── mod.rs
│   └── schema.rs           # Database schema definitions
├── errors/                 # Application-wide error handling
│   ├── mod.rs
│   └── core_errors.rs      # Core error types and conversions
├── utils/                  # Utility functions and helpers
│   ├── mod.rs
│   └── helpers.rs          # Common utility functions
└── state/                  # Application state management
    ├── mod.rs
    ├── app_state.rs        # Main application state structure
    └── manager.rs          # State management logic
```

### Service Implementation Requirements

Every service MUST implement this pattern:

1. **Error Types**: Custom error enums with `thiserror::Error` (domain-specific in modules/, shared in errors/)
2. **Configuration Structs**:
   - `new_mvp()` - MVP configuration with simplified setup
   - `new_production()` - Production configuration with full features
   - `test_config()` - Test configuration for unit/integration tests
3. **Service Trait**: Async trait defining the public interface
4. **Service Implementation**: Concrete struct implementing the trait
5. **Helper Functions**: Utility functions and type conversions
6. **Test Helpers**: `#[cfg(test)]` helper methods only (NO inline tests)

### Module Organization Guidelines

- **Domain Modules** (`modules/`): Business logic and domain-specific operations
  - Contains `service.rs` (business logic), `models.rs` (domain types), `schema.rs` (domain schemas), `errors.rs` (domain errors)
  - High cohesion within domain, minimal external dependencies
  - Examples: KB management, Authentication, Flow composition

- **Infrastructure Services** (`services/`): Technical cross-cutting concerns
  - Each service implemented as a single `.rs` file (e.g., `sql.rs`, `vector.rs`)
  - Database access, caching, storage, external service integrations
  - Shared by multiple domain modules
  - Focus on technical implementation rather than business rules

- **Shared Components**: Common types, utilities, and infrastructure
  - `models/` - Shared DTOs and common types used across domains
  - `schemas/` - Database schema definitions and migration utilities
  - `errors/` - Application-wide error types and conversion utilities
  - `utils/` - Common helper functions and utilities
  - `state/` - Application state management and coordination

## Rust Development Guidelines

**IMPORTANT: Follow these comprehensive Rust best practices for all backend development.**

### Core Principles
Generate high-quality, idiomatic Rust code adhering to Rust's best practices as per the Rust Book, Rust API Guidelines, and community standards.

### Key Guidelines

1. **Use Cargo**: Structure projects with Cargo.toml and src/main.rs or lib.rs. Include dependencies only if necessary, preferring standard library features.

2. **Code Formatting**: Use rustfmt-style: snake_case for functions/variables, CamelCase for types/traits/enums, SCREAMING_SNAKE_CASE for constants. Limit lines to 100 characters. Use 4-space indentation.

3. **Memory Management**: Prioritize ownership and borrowing. Use references (&T, &mut T) over cloning. Employ lifetimes ('a) correctly. Use smart pointers (Box, Rc, Arc) judiciously.

4. **Error Handling**: Return Result<T, E> for errors, using ? for propagation. Define custom errors with thiserror or anyhow if needed. Use Option<T> for absence. Avoid unwrap/expect in production code; use them only in examples.

5. **Safety and Idioms**: Write safe code; avoid unsafe unless justified with detailed comments. Use iterators, closures, and functional patterns (e.g., map, filter, collect). Prefer enums over booleans for state.

6. **Concurrency**: For multithreading, use std::thread and sync primitives (Mutex, RwLock, Arc). For async, use async/await with tokio if required.

7. **Performance**: Avoid unnecessary allocations. Use slices over Vec when possible. Profile with tools like cargo flamegraph if performance is mentioned.

8. **Testing**: Include #[cfg(test)] modules with unit tests using assert_eq!, assert!. Add integration tests in tests/ directory.

9. **Documentation**: Use /// doc comments for public items. Include examples in docs with ```rust (disable examples with :disable-run when appropriate).

10. **Dependencies and Security**: Minimize crates; use trusted ones like serde, rand. Sanitize inputs, handle edge cases. Follow semver.

### Project-Specific Guidelines
- Use `OnceLock` for thread-safe lazy initialization of shared resources
- Cache Python modules to avoid repeated compilation overhead
- Always use `Python::with_gil()` for Python operations in PyO3 integration
- Convert Python results to JSON strings for consistent data exchange
- Implement comprehensive error handling with proper error propagation
- Use Tokio async runtime efficiently for concurrent operations
- Follow Rust ownership and borrowing principles strictly

### Architecture-Specific Patterns
- **DI Services**: Use async_trait for service interfaces, implement hot-reload via notify crate, Manager-owned pools
- **Manager Pattern**: Composition root initializes all services from TOML config with hot-reload support
- **Circuit Breaker**: Use tower crate for resilience in service calls, backpressure limits
- **Event Sourcing**: Implement tracing-subscriber with multi-sinks (SQL events.db ACID + JSONL rotation) for event replay
- **RPC Communication**: UDS with Axum server, SO_PEERCRED/token auth, schema versioning + compatibility
- **Caching Layers**: dashmap for memory TTL, layered (Request/Feature/Doc) with invalidation hooks on commits/generation ID
- **Shared State (MVP)**: Arc<RwLock<AppState>> pattern with service injection, upgrade path to actor-based StateManager
- **Performance Optimization**:
  - SQLite split databases (app_meta.db + events.db) with async WAL, busy_timeout + jitter
  - LanceDB async writes with atomic promote (generation rename/symlink) + epoch garbage collection
  - PyO3 async with basic integration, out-of-process Embedding Worker (JSON for MVP), timeout-based Rust fallbacks
  - Parallel operations with tokio::join! for hybrid search, semaphores for backpressure
  - Warm-pool pre-fork for Embedding Worker, health-check/rotate

### Code Generation Standards
Generate complete, compilable code with a main function or lib entry point. If the code is a snippet, wrap it in a minimal example. Ensure it's modular, readable, and efficient. Respond with code only unless explanations are specifically requested.

## Testing Guidelines

The project includes comprehensive testing following Cargo standards across both frontend and backend:

### Core Service Testing (Rust)
The core crate follows Cargo testing conventions with 42 total tests (91.3% success rate):

**Unit Tests** (31 tests - all passing):
- SQL service tests: Configuration, connections, transactions, migrations, health checks
- Vector service tests: Collection management, search operations, generation management
- State manager tests: Mutations, log buffering, knowledge base operations
- Run with: `cargo test --lib` from `core/` directory

**Integration Tests** (11 tests - 7 passing, 4 hanging):
- `tests/sql_integration.rs`: Full setup, production config, transactions, backups
- `tests/vector_integration.rs`: Complete workflows, concurrent operations, health monitoring
- `tests/state_manager_integration.rs`: Cross-service interactions, state synchronization
- Run individual tests: `cargo test --test sql_integration`

### Testing Structure Requirements

Tests follow Cargo standards with proper separation:

**Unit Tests** (co-located with source code using `#[cfg(test)]` modules):
```
core/src/
├── modules/
│   ├── kb/
│   │   ├── service.rs             # Contains #[cfg(test)] mod tests { ... }
│   │   ├── models.rs              # Contains #[cfg(test)] mod tests { ... }
│   │   └── schema.rs              # Contains #[cfg(test)] mod tests { ... }
│   └── auth/
│       ├── service.rs             # Contains #[cfg(test)] mod tests { ... }
│       └── models.rs              # Contains #[cfg(test)] mod tests { ... }
├── services/
│   ├── sql/
│   │   └── sql.rs                 # Contains #[cfg(test)] mod tests { ... }
│   ├── vector/
│   │   └── vector.rs              # Contains #[cfg(test)] mod tests { ... }
│   └── cache/
│       └── cache.rs               # Contains #[cfg(test)] mod tests { ... }
└── state/
    ├── app_state.rs               # Contains #[cfg(test)] mod tests { ... }
    └── manager.rs                 # Contains #[cfg(test)] mod tests { ... }
```

**Integration Tests** (standalone files in tests/ directory):
```
core/tests/
├── kb_module_integration.rs       # KB domain module integration tests
├── auth_integration.rs            # Authentication workflow integration tests
├── sql_integration.rs             # SQL service integration tests
├── vector_integration.rs          # Vector service integration tests
├── state_manager_integration.rs   # State management integration tests
├── end_to_end_integration.rs      # Full workflow integration tests
└── performance_benchmarks.rs      # Performance and benchmark tests
```

### Test Classification Rules

- **Unit Tests**: Test individual methods, error conditions, configuration validation, and isolated functionality. Located in `#[cfg(test)]` modules within service implementation files.
- **Integration Tests**: Test complete workflows, cross-service interactions, database operations, and end-to-end scenarios. Located as standalone `.rs` files in the `tests/` directory.
- **Current Status**: 42 tests passing (31 unit + 11 integration) with 91.3% success rate
- **Test Helpers**: Service files may contain `#[cfg(test)]` helper functions for test configuration

### Tauri Backend Testing
- Python integration tests in `src-tauri/src/lib.rs` (lines 107-129)
- Run tests with `cargo test` from the `src-tauri/` directory
- Run specific test: `cargo test test_python_integration`
- Tests verify Python context initialization, system info, and library functionality
- Tests validate PyO3 integration and MCP server functionality

### Angular Frontend Testing
- Component tests using Angular Testing Library patterns
- Test files follow `*.spec.ts` naming convention
- Tests located alongside components in their respective directories
- Run tests with `ng test` (when test runner is configured)

### Test Organization Benefits
- **Cargo Compliant**: Unit tests co-located with source, integration tests in dedicated files
- **Fast Execution**: Unit tests run in ~0.08s, integration tests run independently
- **Comprehensive Coverage**: Tests individual methods and complete workflows
- **Easy Discovery**: Standard Cargo test structure makes tests easily findable and runnable

## Performance Guidelines

### Performance Targets

- **Retrieval Latency**: <100ms for hybrid search with P50/P95 monitoring
- **Parallel Processing**: Tokio::join! for vector/BM25 search merge
- **Async Operations**: SQLite WAL async, LanceDB async writes, PyO3 async FFI
- **Caching Strategy**:
  - Query result caching with TTL based on confidence scores
  - Python module compilation caching to avoid repeated I/O
  - Embedding cache for unchanged content (skip re-embedding)
- **Zero-Copy Operations**: LanceDB index promotion without data duplication
- **Batch Processing**: Async batch embedding and reranking for efficiency
- **Circuit Breaker**: Tower-based circuit breakers for resilience and performance

### Best Practices

- Cache frequently accessed data appropriately
- Use lazy loading for heavy operations
- Implement efficient vector search with proper indexing
- Minimize Python-Rust boundary crossings where possible
- Use appropriate data structures for different use cases (SQLite for metadata, file-based for large data)
- Profile and optimize critical paths in the RAG pipeline

## Security Guidelines

- Never log or expose sensitive data, especially in air-gapped mode
- Implement proper input validation for all user inputs
- Follow the principle of least privilege for filesystem and network access
- Ensure all citations are included in RAG responses for transparency
- Validate all data exchanges between frontend, Rust backend, and Python components

## General Guidelines

- Only use absolute positioning when necessary. Opt for responsive and well-structured layouts using CSS Grid and Flexbox
- Refactor code as you go to keep the codebase clean and maintainable
- Keep file sizes small and organize helper functions and components in their own files
- Follow the established Angular and Rust project structure conventions
- Maintain separation of concerns between frontend (Angular) and backend (Rust/Python)
- Always handle errors gracefully with proper error propagation from Python through Rust to Angular