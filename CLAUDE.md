# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference Guide

### Project Information Sources
For detailed project information, refer to the `docs/` folder:
- **System Requirements**: `docs/SRS_RAG_Studio.md` - Complete functional and non-functional requirements
- **System Design**: `docs/SDD_RAG_Studio.md` - Architectural design and implementation details
- **Component Documentation**: `docs/ATOMIC_COMPONENTS.md`, `docs/SEMANTIC_COMPONENTS.md` - Component library guides
- **Design Tokens**: `docs/DESIGN_TOKENS_GUIDE.md`, `docs/DESIGN_TOKENS_API.md` - Design system documentation

### Development Best Practices
- **Angular Best Practices**: Use the Angular CLI MCP tool (`mcp__angular-cli__get_best_practices`) for current Angular 20+ guidelines
- **Rust Best Practices**: Follow the comprehensive Rust guidelines detailed in the "Rust Development Guidelines" section below

## Project Overview

RAG Studio is a local-first, no-code/low-code application for building and operating personal Retrieval-Augmented Generation (RAG) systems. It's built using Tauri with an Angular frontend and Rust backend (with PyO3 for Python AI integration), designed to manage knowledge bases, pipelines, tools, and flows while exposing functionality via a single Model Context Protocol (MCP) server.

## Architecture

This is a hybrid Tauri application with two main components:

### Frontend (Angular)
- Located in `src/` directory
- Angular 20+ with standalone components
- Radix-inspired design system for UI consistency
- Lucide Icons for consistent iconography (3,300+ icons, MIT license, tree-shakeable)
- Uses SCSS for styling with CSS custom properties for theming
- Served on port 1420 during development

### Backend (Rust/Tauri)
- Located in `src-tauri/` directory  
- Tauri v2 application with Rust backend
- Integration with Python AI components via PyO3
- SQLite for metadata storage, file-based for indexes/packs
- Single MCP server for external integrations

## Development Commands

### Frontend Development
- `npm run start` - Start Angular development server on port 1420
- `npm run build` - Build Angular application for production
- `npm run watch` - Build with watch mode for development
- `ng` - Angular CLI commands

### Tauri Development  
- `npm run tauri dev` - Start Tauri development mode (builds frontend + backend)
- `npm run tauri build` - Build production Tauri application
- `npm run tauri` - Access Tauri CLI commands

### Full Application
- Development: Run `npm run tauri dev` to start both frontend and backend
- The Tauri config automatically runs `npm run start` before dev and `npm run build` before build

## Key Technologies

- **Tauri v2**: Desktop application framework with tray icon support
- **Angular 20+**: Frontend framework with standalone components and Angular CDK (DragDrop, Overlay, Dialog)
- **Radix-inspired Design System**: Consistent UI components and design tokens
- **Lucide Icons**: Icon system with 3,300+ icons
- **Rust 1.80+**: Backend with Axum (async server), Tokio (concurrency), Diesel ORM
- **PyO3**: Python integration for AI/ML components (embedding, reranking)
- **SQLite with Diesel**: Database for metadata and registry
- **FAISS/Sentence-Transformers**: Vector search and embeddings (Python via PyO3)
- **Custom Rust BM25**: Lexical search implementation (migrated from Python rank_bm25)

## Project Structure

- `src/`: Angular frontend application
  - `src/app/pages/`: Main application pages (dashboard, tools, knowledge-bases, pipelines, flows, settings)
  - `src/app/shared/components/`: Component library with 3-tier architecture:
    - `atomic/`: Basic UI primitives (buttons, inputs, icons, badges, etc.)
    - `semantic/`: Context-aware components (cards, forms, navigation, overlays)
    - `composite/`: Complex business components (wizards, designers, dashboards)
  - `src/app/shared/tokens/`: Design token system with CSS custom properties
  - `src/app/shared/layout/`: Layout components (main-layout with sidebar)
- `src-tauri/`: Rust backend and Tauri configuration
  - `src-tauri/src/lib.rs`: Main library with Tauri commands and Python integration
  - `src-tauri/src/python_integration.rs`: PyO3 integration layer
  - `src-tauri/src/mcp_server.rs`: MCP server management
  - `src-tauri/Cargo.toml`: Rust dependencies including PyO3, Tokio, rmcp
- `docs/`: Technical documentation (SRS, SDD)
- `angular.json`: Angular workspace configuration (port 1420, SCSS support)
- `tauri.conf.json`: Tauri application configuration

## Core Concepts

- **Knowledge Base (KB)**: Versioned content repositories for RAG retrieval that have been ingested, chunked, embedded, and indexed
- **Pipeline**: Automated workflows for data ingestion and indexing (fetch → parse → normalize → chunk → annotate → embed → index → eval → pack)
- **Tools**: Dynamic MCP endpoints for external AI model integration with configurable parameters
- **Flow**: End-to-end RAG processes combining tools, KBs, pipelines, and schedules into complete workflows
- **MCP Server**: Single Axum-based server exposing `rag.*`, `kb.*`, and `admin.*` tool sets (migrated from FastAPI)
- **Scheduler**: Tokio-based background job scheduling with cron/rrule support, retry/backoff, and exclusion rules
- **Pack Management**: ZIP-based export/import system with YAML manifests and checksums for sharing components

## Development Notes

- The application is designed to run air-gapped with no internet dependency after setup
- Focus on local-first operation with strong data security
- All citations are required in RAG responses
- The backend migrated from Python/FastAPI to Rust/Axum for 4-10x performance improvement while retaining Python for AI components via PyO3
- Expected performance gains: MCP Server (4-10x resource efficiency), Orchestrator (3-4x faster), Scheduler (2-100x faster), BM25 (200-500x faster)
- Air-gapped operation supported with no internet dependency post-setup
- Headless mode via system tray icon (show/hide UI, background operation)
- One-click portable startup with bundled dependencies

## Python Integration Architecture

The application uses PyO3 for seamless Rust-Python integration:

- **Python Context**: Located in `src-tauri/src/python_integration.rs`
- **Python Functions**: Located in `src-tauri/python/rag_functions.py`
- **Caching**: Uses `OnceLock` for thread-safe lazy initialization
- **Module Loading**: Cached Python code compilation for performance
- **Error Handling**: Comprehensive error propagation from Python to Rust

Key Python integration patterns:
- Initialize Python context once using `OnceLock`
- Cache compiled Python modules to avoid repeated I/O
- Use `Python::with_gil()` for all Python operations
- Convert Python results to JSON strings for consistent data exchange

## Tauri Commands

The application exposes several Tauri commands for frontend-backend communication:

### Core System Commands
- `greet(name: &str)` - Basic Rust greeting for testing
- `rust_call_python(name: &str)` - Python greeting function via PyO3

### MCP Server Management
- `start_mcp_server()` - Start the MCP server instance
- `stop_mcp_server()` - Stop the MCP server instance
- `get_mcp_status()` - Get current MCP server status
- `get_mcp_healthcheck()` - Health check for MCP server
- `get_mcp_service_info()` - Service information for MCP server

The MCP server exposes tool sets:
- `rag.*` - RAG search and answer operations
- `kb.*` - Knowledge base management
- `admin.*` - Administrative functions

## Performance Considerations

The architecture is designed for optimal performance with significant improvements from migration:

- **Rust Backend**: Core operations migrated from Python for 3-10x performance improvement
  - MCP Server: 4-10x resource efficiency (13% → 3% CPU, 55MB → 3.5MB memory)
  - Orchestrator: 3-4x faster concurrency with Tokio vs Python concurrent.futures
  - Scheduler: 2-100x faster event handling with Tokio timers vs APScheduler
  - BM25: 200-500x faster scoring with native Rust vs Python rank_bm25
- **PyO3 Integration**: AI-specific operations (embedding, reranking) remain in Python but called efficiently
- **Caching**: Module compilation and data caching to reduce overhead
- **Hybrid Search**: Rust BM25 + Python FAISS vector search with reranking
- **Concurrent Processing**: Tokio-based async runtime for scheduling and orchestration
- **Memory Efficiency**: Static caching with `OnceLock` for shared resources

## Security Features

- **Air-gapped Mode**: Block outbound network connections via Axum hooks when enabled
- **Default-deny Permissions**: Filesystem, network, and process access controls with escalation prompts
- **Local-first**: All operations work without internet connectivity post-setup
- **Data Privacy**: No external data transmission in air-gapped mode
- **Mandatory Citations**: All RAG responses include citations with configurable "no citation → no answer" policy
- **Secrets Management**: Encrypted at rest using Rust `ring` crate (optional)
- **Log Redaction**: Comprehensive redaction of sensitive information in logs

## Testing

The project includes comprehensive testing across both frontend and backend:

### Rust Backend Testing
- Python integration tests in `src-tauri/src/lib.rs` (lines 107-129)
- Run tests with `cargo test` from the `src-tauri/` directory
- Tests verify Python context initialization, system info, and library functionality

### Angular Frontend Testing
- Component tests using Angular Testing Library patterns
- Test files follow `*.spec.ts` naming convention
- Tests located alongside components in their respective directories
- Run tests with `ng test` (when test runner is configured)

### Key Test Areas
- Python-Rust integration via PyO3
- MCP server initialization and commands
- Component rendering and interaction
- Design token system functionality

## Development Guidelines

### General Guidelines

- Only use absolute positioning when necessary. Opt for responsive and well-structured layouts using CSS Grid and Flexbox
- Refactor code as you go to keep the codebase clean and maintainable
- Keep file sizes small and organize helper functions and components in their own files
- Follow the established Angular and Rust project structure conventions
- Maintain separation of concerns between frontend (Angular) and backend (Rust/Python)
- Always handle errors gracefully with proper error propagation from Python through Rust to Angular

### Angular Frontend Guidelines

**IMPORTANT: This project uses Angular 20 (latest as of August 2025). Always use Angular 20 syntax and features.**

#### Core Angular 20 Principles
- **Standalone Architecture**: All components, directives, and pipes use `standalone: true` by default
- **Modern Reactivity**: Use `signal()`, `computed()`, and `effect()` instead of RxJS BehaviorSubject where possible
- **Signal-based Inputs/Outputs**: Use `input()`, `input.required()`, and `output()` instead of `@Input()` and `@Output()`
- **Control Flow Syntax**: Use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- **Zoneless Change Detection**: Enabled with `provideZonelessChangeDetection()` for better performance

#### Project Setup Requirements
- TypeScript 5.5+ and Node.js 20.11.1+ required
- Bootstrap with `bootstrapApplication(AppComponent, {providers: []})` instead of `bootstrapModule`
- Use Vite and esbuild as default build tools via Angular CLI
- Enable zoneless change detection where Zone.js isn't required

#### Component Development
```typescript
// Modern Angular 20 component example
import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-example',
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
export class ExampleComponent {
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

#### Template Syntax
- **Control Flow**: Use `@if (condition) { }`, `@for (item of items; track item.id) { }`, `@switch (value) { }`
- **Deferred Loading**: Use `@defer (on viewport) { } @placeholder { } @loading { } @error { }`
- **Self-Closing Tags**: Supported (`<my-comp />`)
- **Signal Calls**: Always call signals as functions in templates: `{{ mySignal() }}`

#### Forms and Validation
- Use signal-based form controls with improved typed forms
- Integrate signals with form state management
- Leverage `toSignal()` and `toObservable()` for RxJS interop

#### Performance Optimization
- **Signals**: Use `signal()`, `computed()`, `effect()` for fine-grained reactivity
- **Zoneless**: Avoid Zone.js dependencies where possible
- **Lazy Loading**: Use `@defer` blocks for performance-critical components
- **Tree Shaking**: Import only needed modules/components

#### Design System Integration
- Use Radix-inspired design system components consistently
- Use Lucide Icons for all iconography (3,300+ icons, tree-shakeable)
- Implement atomic, semantic, and composite component architecture:
  - Atomic: RagButton, RagBadge, RagSpinner, RagIcon, etc.
  - Semantic: RagCard, RagFormField, RagSearchInput, etc.
  - Composite: ToolCard, PipelineDesigner, CreateToolWizard, etc.
- Use SCSS with CSS custom properties for theming (light/dark mode support)
- Implement responsive layouts using CSS Grid and Flexbox

#### Migration from Older Angular Versions
- Replace `@Input()` with `input()` or `input.required()`
- Replace `@Output()` with `output()`
- Replace `*ngIf/*ngFor/*ngSwitch` with `@if/@for/@switch`
- Replace `BehaviorSubject` with `signal()` where appropriate
- Use `TestBed.inject()` instead of deprecated `TestBed.get()`
- Remove `InjectFlags` usage, use object options: `{optional: true, skipSelf: true}`

#### Breaking Changes to Avoid
- No HammerJS support (removed in Angular 21)
- No `ng-reflect-*` attributes by default
- `ApplicationRef.tick()` throws errors instead of catching them
- TypeScript <5.5 not supported

#### Testing and Debugging
- Use `provideCheckNoChangesConfig()` for zoneless debugging
- Deep integration with Chrome DevTools for performance profiling
- Test signal-based components with modern testing patterns

### Rust Development Guidelines

**IMPORTANT: Follow these comprehensive Rust best practices for all backend development.**

#### Core Principles
Generate high-quality, idiomatic Rust code adhering to Rust's best practices as per the Rust Book, Rust API Guidelines, and community standards.

#### Key Guidelines

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

#### Project-Specific Guidelines
- Use `OnceLock` for thread-safe lazy initialization of shared resources
- Cache Python modules to avoid repeated compilation overhead
- Always use `Python::with_gil()` for Python operations in PyO3 integration
- Convert Python results to JSON strings for consistent data exchange
- Implement comprehensive error handling with proper error propagation
- Use Tokio async runtime efficiently for concurrent operations
- Follow Rust ownership and borrowing principles strictly

#### Code Generation Standards
Generate complete, compilable code with a main function or lib entry point. If the code is a snippet, wrap it in a minimal example. Ensure it's modular, readable, and efficient. Respond with code only unless explanations are specifically requested.

### Security Guidelines

- Never log or expose sensitive data, especially in air-gapped mode
- Implement proper input validation for all user inputs
- Follow the principle of least privilege for filesystem and network access
- Ensure all citations are included in RAG responses for transparency
- Validate all data exchanges between frontend, Rust backend, and Python components

### Performance Guidelines

- Cache frequently accessed data appropriately
- Use lazy loading for heavy operations
- Implement efficient vector search with proper indexing
- Minimize Python-Rust boundary crossings where possible
- Use appropriate data structures for different use cases (SQLite for metadata, file-based for large data)
- Profile and optimize critical paths in the RAG pipeline