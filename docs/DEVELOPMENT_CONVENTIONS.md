# Development Conventions for RAG Studio

This document consolidates all development conventions, coding standards, and architectural patterns used throughout RAG Studio. It serves as the single source of truth for development practices.

## Table of Contents

- [Angular Frontend Conventions](#angular-frontend-conventions)
- [Rust Backend Conventions](#rust-backend-conventions)
- [Component Architecture Conventions](#component-architecture-conventions)
- [Testing Conventions](#testing-conventions)
- [File Naming Conventions](#file-naming-conventions)
- [Project Structure Conventions](#project-structure-conventions)
- [Pipeline Template Patterns](#pipeline-template-patterns)

## Angular Frontend Conventions

### Angular 20+ Modern Patterns

**IMPORTANT: This project uses Angular 20 (latest as of August 2025). Always use Angular 20 syntax and features.**

#### Core Principles
- **Standalone Architecture**: All components, directives, and pipes use `standalone: true` by default (set `standalone: true` explicitly in every `@Component` metadata block across atomic, semantic, and composite layers)
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

## Pipeline Template Patterns

### Architectural Integration Convention

**IMPORTANT**: Knowledge Base creation uses Pipeline templates instead of separate wizard system to eliminate code duplication and provide unified ETL workflows.

#### Pipeline Template Structure

All KB creation workflows follow the standardized Pipeline template pattern:

```typescript
interface KBCreationTemplate extends PipelineTemplate {
  name: string;                    // "KB Creation - [Source Type]"
  category: "data_ingestion";      // Always data_ingestion for KB templates
  steps: KBPipelineStep[];         // fetch → parse → normalize → chunk → embed → index → eval → pack
  parameters: KBTemplateParameters;
}

interface KBPipelineStep extends PipelineStep {
  type: ETLStepType;              // One of: fetch, parse, normalize, chunk, annotate, embed, index, eval, pack
  config: Record<string, any>;    // Step-specific configuration
  dependencies: string[];         // Previous step dependencies
}

interface KBTemplateParameters {
  sourceUrl: ParameterDef;        // Content source path/URL
  embeddingModel: ParameterDef;   // Model selection with enum validation
  name: ParameterDef;            // KB name (required)
  product: ParameterDef;         // Product/domain identifier (required)
  version?: ParameterDef;        // KB version (optional, defaults to 1.0.0)
  description?: ParameterDef;    // KB description (optional)
}
```

#### Standard KB Creation Templates

**1. Local Folder Template** (`local-folder-kb-creation`):
```typescript
{
  name: "KB Creation - Local Folder",
  category: "data_ingestion",
  steps: [
    { type: "fetch", config: { source: "local-folder", path: "{{sourceUrl}}" }},
    { type: "parse", config: { formats: ["pdf", "md", "txt", "docx", "html"] }},
    { type: "normalize", config: { cleanMarkdown: true, deduplication: true }},
    { type: "chunk", config: { strategy: "semantic", maxTokens: 512, overlap: 50 }},
    { type: "embed", config: { model: "{{embeddingModel}}", batchSize: 32 }},
    { type: "index", config: { vectorDb: "lancedb", sqlDb: "sqlite", enableBM25: true }},
    { type: "eval", config: { validateRecall: true, qualityThreshold: 0.8 }},
    { type: "pack", config: { createKB: true, name: "{{name}}", product: "{{product}}" }}
  ],
  parameters: {
    sourceUrl: { type: "string", required: true, description: "Local directory path" },
    embeddingModel: { type: "string", required: true, enum: ["all-MiniLM-L6-v2", "all-mpnet-base-v2", "e5-large-v2"] },
    name: { type: "string", required: true, minLength: 2 },
    product: { type: "string", required: true, minLength: 2 }
  }
}
```

**2. Web Documentation Template** (`web-docs-kb-creation`):
```typescript
{
  name: "KB Creation - Web Documentation",
  category: "data_ingestion",
  steps: [
    { type: "fetch", config: { source: "web-crawler", baseUrl: "{{sourceUrl}}", respectRobots: true, maxDepth: 3 }},
    { type: "parse", config: { extractMainContent: true, removeNav: true, preserveLinks: true }},
    { type: "normalize", config: { deduplication: true, urlCanonical: true, removeAds: true }},
    { type: "chunk", config: { respectHeaders: true, maxTokens: 512, preserveStructure: true }},
    { type: "embed", config: { model: "{{embeddingModel}}", batchSize: 32 }},
    { type: "index", config: { vectorDb: "lancedb", sqlDb: "sqlite", enableBM25: true, includeUrl: true }},
    { type: "eval", config: { validateLinks: true, qualityThreshold: 0.8, checkAccessibility: true }},
    { type: "pack", config: { createKB: true, name: "{{name}}", product: "{{product}}" }}
  ]
}
```

**3. GitHub Repository Template** (`github-repo-kb-creation`):
```typescript
{
  name: "KB Creation - GitHub Repository",
  category: "data_ingestion",
  steps: [
    { type: "fetch", config: { source: "git-clone", repo: "{{sourceUrl}}", shallow: true, includeBranch: "main" }},
    { type: "parse", config: { includeCode: true, includeReadmes: true, includeDocs: true, excludeBinary: true }},
    { type: "normalize", config: { respectGitignore: true, pathNormalization: true, removeGenerated: true }},
    { type: "chunk", config: { codeAware: true, language: "auto", maxTokens: 512, preserveContext: true }},
    { type: "embed", config: { model: "{{embeddingModel}}", batchSize: 32 }},
    { type: "index", config: { vectorDb: "lancedb", sqlDb: "sqlite", enableBM25: true, includeFilePath: true }},
    { type: "eval", config: { validateStructure: true, qualityThreshold: 0.8, checkSyntax: true }},
    { type: "pack", config: { createKB: true, name: "{{name}}", product: "{{product}}" }}
  ]
}
```

#### Template Development Guidelines

1. **Step Naming**: Use descriptive step IDs following the pattern `[action]-[target]` (e.g., `fetch-docs`, `parse-code`)
2. **Parameter Validation**: Always include JSON-Schema validation for required parameters
3. **Error Handling**: Each step must define failure modes and recovery strategies
4. **Dependency Management**: Clearly specify step dependencies using step IDs
5. **Configuration Inheritance**: Support template parameter substitution using `{{paramName}}` syntax
6. **Quality Assurance**: Include eval step with appropriate quality thresholds for content type

#### Frontend Integration Patterns

**Template Selection Interface**:
- Replace KB creation wizard with template selection grid
- Group templates by content source type with clear descriptions
- Provide parameter form with validation based on template parameter definitions
- Show preview of pipeline steps before execution

**Pipeline Integration**:
- KB creation templates extend standard Pipeline system
- Use existing Pipeline designer for customization
- Leverage Pipeline execution monitoring for progress tracking
- Reuse Pipeline NgRx Signal Store for state management

#### Backend Implementation Patterns

**Template Registration**:
```typescript
// Template service pattern
interface TemplateService {
  registerKBTemplate(template: KBCreationTemplate): Promise<void>;
  getKBTemplates(): Promise<KBCreationTemplate[]>;
  instantiateTemplate(templateId: string, parameters: Record<string, any>): Promise<Pipeline>;
}
```

**Step Implementation**:
- Extend existing ETL step implementations
- Add `pack` step type specifically for KB creation
- Implement parameter validation and substitution
- Ensure compatibility with Pipeline execution engine

### Benefits and Conventions

1. **Code Deduplication**: Single ETL implementation serves both KB creation and general data processing
2. **Consistent UX**: Same Pipeline designer interface for all data workflows
3. **Enhanced Flexibility**: Users can customize KB creation by modifying template steps
4. **Unified Error Handling**: Consistent error reporting and retry logic across all data ingestion
5. **Template Reusability**: KB creation templates can be shared, exported, and customized
6. **Extensibility**: Easy to add new content source types by creating new templates

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