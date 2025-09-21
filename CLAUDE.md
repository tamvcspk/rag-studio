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

RAG Studio is a local-first, secure, high-performance desktop application built on Tauri v2 and Rust, designed with a pragmatic MVP-first approach that balances rapid development with architectural integrity. The MVP features simplified shared state management, JSON-based subprocess communication, and essential RAG functionality, with clear upgrade paths to production features like actor-based state management, UDS communication, and advanced security sandboxing.

### Core Architecture Overview

The Manager acts as the composition root, managing DI services (SQLite, LanceDB, PyO3). For MVP, the MCP runs in a subprocess with basic isolation, communicating via JSON over stdin/stdout for simplicity, with upgrade path to UDS/Axum. State management uses Arc<RwLock<AppState>> shared state pattern for MVP, with clear upgrade path to actor-based StateManager. Centralized logging employs tracing with structured output, preparing for multi-sink architecture (SQL + JSONL) in production.

#### Process Boundaries

- **Main Process (Manager)**: Composition root containing UI Adapter, Orchestrator, Event Router, KB Module, and all DI services
- **Subprocess (MCP Module)**: Basic subprocess isolation with JSON over stdin/stdout for MVP, upgrade path to full sandbox (seccomp/AppArmor/JobObject)
- **Subprocess (Embedding Worker)**: Out-of-process PyO3/Sentence-Transformers with JSON communication for MVP, upgrade path to UDS/bincode
- **Communication**: JSON over stdin/stdout for MVP simplicity, with clear upgrade path to UDS/Axum + SO_PEERCRED auth

#### Key Architectural Patterns

- **Simplified State Management (MVP)**: Arc<RwLock<AppState>> shared state pattern with clear upgrade path to actor-based StateManager
- **Structured Logging**: Tracing-based logging with upgrade preparation for multi-sink architecture (SQL + JSONL)
- **Hybrid Search Architecture**: Parallel vector (LanceDB) and lexical (BM25/tantivy) search with reranking
- **Event Sourcing Preparation**: Schema ready for event replay, with upgrade path to full undo/redo support
- **Basic Caching**: Simple memory caching with dashmap TTL, upgrade path to layered caching architecture

### Frontend (Angular)
- Located in `src/` directory
- Angular 20+ with standalone components
- Radix-inspired design system for UI consistency
- Lucide Icons for consistent iconography (3,300+ icons, MIT license, tree-shakeable)
- Uses SCSS for styling with CSS custom properties for theming
- Served on port 1420 during development
- Real-time updates via Tauri IPC streams

### Backend (Rust/Tauri)
- Located in `src-tauri/` directory  
- Tauri v2 application with Rust backend
- Integration with Python AI components via PyO3
- Manager-owned DI services with hot-reload configuration support
- Single MCP server for external integrations with subprocess isolation

### DI Services Architecture

The Manager initializes and manages all core services with hot-reload configuration support:

1. **SqlService**: SQLite/Diesel with async WAL mode, split databases (app_meta.db + events.db), migrations, backup, atomic transactions
2. **VectorDbService**: LanceDB embedded/file with async writes, ANN search, BM25 integration, atomic promote + epoch GC
3. **StorageService**: LocalFS/ZIP packs with quotas (1-5GB), auto-prune functionality, checksums
4. **CacheService**: Memory TTL (dashmap), layered caching (Request/Feature/Doc), invalidation hooks on commits
5. **Auth/SecretService**: ring crate encryption, UDS SO_PEERCRED + token headers, cert rotation
6. **EmbeddingService**: Out-of-process worker via UDS/bincode, warm-pool, health/rotate, PyO3 async + Rust fallback
7. **FlowService**: Composition of Tools/KB/Pipelines, checksum validation for end-to-end workflows
8. **StateManager (MVP)**: Arc<RwLock<AppState>> shared state with service injection, clear upgrade path to actor-based system post-MVP

### MCP Module (Subprocess)

- **Basic Subprocess Isolation (MVP)**: Process isolation with JSON over stdin/stdout, upgrade path to full sandbox security
- **Tool Registry & Handlers**: Basic tool registration and validation, with upgrade path to capability policy enforcement
- **Input Validation**: Basic JSON-Schema validation with clear upgrade path to fuzz-resistant validation
- **Simple Dispatcher**: Sequential tool dispatch for MVP, upgrade path to parallel dispatch with backpressure
- **JSON Communication**: stdin/stdout based MCP protocol for MVP, upgrade path to UDS/Axum with caching
- **Transport Support**: MCP stdio (MVP focus), with upgrade path to HTTP /invoke and UDS transport
- **Logging Integration**: Basic structured logging with upgrade path to span forwarding and trace_id propagation

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

### Production Setup
- `scripts/setup-production.bat` - Setup PyOxidizer artifacts for production build
- `scripts/clean-production.bat` - Clean production build artifacts  
- Production builds use embedded Python via PyOxidizer for portability
- Development uses system Python for faster iteration

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
    - `atomic/`: Basic UI primitives (buttons, inputs, icons, chips, etc.)
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

## Key Operational Flows

### Retrieval Flow: MCP `doc.search` → KB (Hybrid Search with Rerank & Citations)

The retrieval process combines semantic (LanceDB ANN) and lexical (BM25/tantivy) search with adaptive rerank, mandatory citations, and layered caching:

1. **Input Validation**: JSON-Schema validation with limits and tracing spans in MCP subprocess
2. **State Access**: Read from shared AppState via RwLock for filtered KB state (MVP), upgrade path to actor-based access
3. **Cache Check**: Layered cache hit check (request/feature/doc levels) with generation IDs
4. **Embedding**: Async PyO3 query embedding via out-of-process worker (JSON batch for MVP), Rust fallback on timeout
5. **Hybrid Search**: Parallel vector (LanceDB ANN) and BM25 (tantivy) search with merge/scoring, adaptive candidate sets
6. **Reranking**: PyO3 cross-encoder async batch processing (32-64 batch size) with sequence length guards
7. **Citation Enrichment**: Mandatory citations with license information from SQLite, enriched snippets
8. **Caching**: Store results in layered cache with TTL based on confidence, invalidate on commits
9. **Metrics**: Update performance metrics (latency, hit rate) via shared AppState mutations (MVP)
10. **Performance**: <100ms target with P50/P95 monitoring, backpressure via semaphores

### Ingest & Commit Flow: ETL → KB (Write Path with Delta & Eval)

The ingest pipeline handles ETL with delta-only updates, versioning, rollback, and evaluation gates:

1. **Transaction Begin**: Atomic commit with fingerprint-based delta detection, AppState mutation (RunAdd) for MVP
2. **ETL Processing**: Parallel fetch/parse/chunk/annotate operations via Tokio with retry/backoff
3. **Delta Detection**: Compare fingerprints from AppState → process only changed content
4. **Cache Check**: Feature-layer embedding cache hits → skip unchanged embeddings
5. **Embedding**: Batch async embedding via out-of-process worker (JSON for MVP), GIL release, fallback support
6. **Indexing**: Buffered upserts to SQLite metadata and LanceDB vectors with staging indexes
7. **BM25 Indexing**: Parallel BM25 index building via tantivy
8. **Evaluation**: Smoke tests for recall@k, drift detector (mean/covariance), quality alerts
9. **Eval Gate**: Block promotion on eval failure or high drift, emit warnings
10. **Atomic Promotion**: Promote staging → active index with zero-copy (generation rename/symlink), epoch garbage collection
11. **Event Sourcing**: Store critical events in events.db for undo/redo support, emit completion events
12. **State Updates**: Update AppState with run completion, metrics, and emit events for UI sync (MVP)

## State Management Architecture

### State Scopes and Storage Strategy

The application uses a three-tier state management approach:

1. **Global Backend State (Shared AppState - MVP)**
   - 8-10 fields with lean AppState using Arc<RwLock<AppState>> pattern
   - Tools (FR-1), KB Packs (FR-2), Pipelines (FR-3), Schedules (FR-4), Flows (FR-6), Settings (FR-10)
   - Recent Logs/Metrics buffer (~100 entries), Loading/Errors state
   - **Storage**: Single app_meta.db for MVP (split to events.db post-MVP), in-memory runtime with periodic saves
   - **Sync Flow**: Load SQL → In-Memory; Mutate → Direct SQL update, upgrade path to batched operations

2. **Shared Mirrored State (Frontend NgRx)**
   - 5-7 fields subset with pagination
   - KB Packs, Runs, Schedules/Flows, Metrics/Logs (~50 entries), Errors
   - **Storage**: SQL persistent (aggregated), in-memory runtime (frontend ephemeral)
   - **Sync Flow**: Delta push via Tauri events → NgRx; Pull paginated from backend

3. **Local Frontend State (Angular Signals)**
   - 4-6 signals (ephemeral)
   - UI Filters/Search, Temp Data (wizards), Selected Items, Optimistic updates
   - **Storage**: In-memory runtime with signals (auto-reset)
   - **Sync Flow**: Computed from shared state; Optimistic → Backend confirmation

### State Management (MVP)

- **Shared State Pattern**: Arc<RwLock<AppState>> for simple MVP state management
- **Direct Persistence**: SQL writes with periodic saves and load-on-startup pattern
- **Event Broadcasting**: Tauri events for frontend state sync with debounced updates
- **Event Sourcing Preparation**: Schema ready for event sourcing, upgrade path to full undo/redo support

## Development Notes

- The application is designed to run air-gapped with no internet dependency after setup
- Focus on local-first operation with strong data security
- All citations are required in RAG responses
- The backend migrated from Python/FastAPI to Rust/Axum for 4-10x performance improvement while retaining Python for AI components via PyO3
- Expected performance gains: MCP Server (4-10x resource efficiency), Orchestrator (3-4x faster), Scheduler (2-100x faster), BM25 (200-500x faster)
- Air-gapped operation supported with no internet dependency post-setup
- Headless mode via system tray icon (show/hide UI, background operation)
- One-click portable startup with bundled dependencies
- **Config Hot-Reload**: TOML configuration via notify crate for development efficiency
- **Backpressure**: End-to-end backpressure with Tokio semaphores and bounds

## Python Integration Architecture

The application uses PyO3 for seamless Rust-Python integration:

- **Python Context**: Located in `src-tauri/src/python_integration.rs`
- **Python Functions**: Located in `src-tauri/python/rag_functions.py`
- **Caching**: Uses `OnceLock` for thread-safe lazy initialization with `CachedPythonData`
- **Module Loading**: Cached Python code compilation for performance, avoiding repeated I/O
- **Error Handling**: Comprehensive error propagation from Python to Rust
- **Memory Management**: Thread-safe caching using static `OnceLock` instances

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

### KB API Contract

The Knowledge Base module exposes these key operations via MCP with StateManager actor integration:

- `kb.hybrid_search(collection, query, top_k, filters, cache_ttl?)` → Hit[{chunk_id, score, snippet, citation, meta}]
  - Combines vector and lexical search with adaptive reranking
  - Supports filtering by product/version/semverRange with pre-filtering
  - Returns chunks with scores, snippets, citations, and metadata
  - Adaptive candidate sets, backfill on no results, configurable Top-N

- `kb.answer(query, filters?, model?)` → {text, citations[], confidence?}
  - Full RAG answer generation with LLM integration via async Embedding Worker
  - Mandatory citation requirement with configurable "no citation → no answer" policies

- `kb.get_document(doc_id, range?)` → Document {metadata, chunks?, license?}
  - Document retrieval with optional range selection

- `kb.resolve_citations(chunk_ids)` → Citation[{title, anchor/URL, license?, version?}]
  - Citation resolution with title, anchor/URL, license, version info

- `kb.stats(collection/version)` → Stats {size, versions, embedder_version, health, eval_scores?}
  - Collection statistics and health metrics from StateManager actors

- `kb.list_collections(filters?)` → KB[{name, version, pinned?, flows?}]
  - Collection enumeration with metadata from StateManager

- `kb.compose_flow(flow_id, params?)` → {results, citations[]}
  - Flow composition for complex multi-step operations

*All APIs proxy StateManager actors with schema versioning in RPC, enriched errors, and evaluation gates for write/maintenance operations.*

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

## Security Features

- **Air-gapped Mode**: Block outbound network connections via Axum hooks when enabled
- **Default-deny Permissions**: Filesystem, network, and process access controls with escalation prompts
- **Subprocess Isolation**: MCP runs in sandboxed subprocess with seccomp/AppArmor protection
- **Local-first**: All operations work without internet connectivity post-setup
- **Data Privacy**: No external data transmission in air-gapped mode
- **Mandatory Citations**: All RAG responses include citations with configurable "no citation → no answer" policy
- **Secrets Management**: Encrypted at rest using Rust `ring` crate with mTLS cert rotation
- **Log Redaction**: Comprehensive redaction of sensitive information in logs
- **Input Validation**: Fuzz-resistant JSON-Schema validation for all MCP inputs
- **mTLS Communication**: Secure inter-process communication with certificate rotation

## Testing

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

## Implementation Recommendations

Based on the core design architecture, these are key implementation guidelines:

### MVP Implementation Path
- **Core Components**: Manager + KB + MCP subprocess (AC-1-3) 
- **Database Stack**: SQLite/Diesel + LanceDB + PyO3/candle integration
- **Performance Target**: Benchmark retrieval to achieve <100ms with criterion
- **Tauri Integration**: Async commands, tray mode, cross-OS path normalization

### Technical Stack Recommendations
- **Concurrency**: Tokio semaphores for controlled concurrency
- **Communication**: JSON over stdin/stdout for MVP simplicity, upgrade path to bincode over UDS
- **Caching**: dashmap for TTL-based memory caching
- **Python Integration**: async PyO3 with pyo3-async crate
- **Security Testing**: cargo-fuzz for RPC fuzzing, audit PyO3 bindings
- **Air-gapped Mode**: Block outbound reqwest calls when enabled

### Development Priorities
1. **Prototype Core Flows**: Implement and benchmark retrieval/ingest flows
2. **Validation Metrics**: Implement eval metrics (recall@k) validation
3. **Flow Service**: Implement FR-6 flow composition functionality
4. **Performance Validation**: Use cargo bench for critical path optimization
5. **Security Hardening**: Implement comprehensive input validation and sandboxing

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
  - Atomic: RagButton, RagChip, RagSpinner, RagIcon, etc.
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

### Service Structure Guidelines

**IMPORTANT: All services must follow the consistent service structure pattern defined in CORE_DESIGN.md.**

#### Service Organization

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

#### Service Implementation Requirements

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

#### Module Organization Guidelines

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

#### Testing Structure Requirements

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

#### Test Classification Rules

- **Unit Tests**: Test individual methods, error conditions, configuration validation, and isolated functionality. Located in `#[cfg(test)]` modules within service implementation files.
- **Integration Tests**: Test complete workflows, cross-service interactions, database operations, and end-to-end scenarios. Located as standalone `.rs` files in the `tests/` directory.
- **Current Status**: 42 tests passing (31 unit + 11 integration) with 91.3% success rate
- **Test Helpers**: Service files may contain `#[cfg(test)]` helper functions for test configuration

#### Benefits and Enforcement

This structure provides:
- **Consistency**: All services follow identical patterns
- **Maintainability**: Clear separation of concerns
- **Testability**: Comprehensive coverage with proper test separation
- **Discoverability**: Developers can navigate any service using the same mental model

When creating or modifying services, you MUST follow this structure. Any deviation from this pattern should be explicitly justified and documented.

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

#### Architecture-Specific Patterns
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
- to