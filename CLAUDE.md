# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference Guide

### Project Information Sources
For detailed project information, refer to the `docs/` folder:
- **System Requirements**: `docs/designs/SRS_RAG_Studio.md` - Complete functional and non-functional requirements
- **System Design**: `docs/designs/SDD_RAG_Studio.md` - Architectural design and implementation details
- **Core Architecture**: `docs/designs/CORE_DESIGN.md` - Detailed architectural patterns and project structure
- **MVP Implementation**: `docs/MVP_PLAN.md` - Implementation roadmap and current state
- **Component Documentation**: `docs/docs/ATOMIC_COMPONENTS.md`, `docs/docs/SEMANTIC_COMPONENTS.md` - Component library guides
- **Design Tokens**: `docs/docs/DESIGN_TOKENS_GUIDE.md`, `docs/docs/DESIGN_TOKENS_API.md` - Design system documentation
- **Installation Guides**: `docs/installation/` - Setup and installation documentation

### Development Best Practices
- **Development Conventions**: `docs/DEVELOPMENT_CONVENTIONS.md` - **AUTHORITATIVE** source for all coding standards, component architecture, naming conventions, and project structure patterns
- **Development Guidelines**: `docs/DEVELOPMENT_GUIDELINES.md` - Comprehensive Angular 20+, Rust, testing, and performance guidelines
- **Command Reference**: `docs/COMMAND_REFERENCE.md` - All development commands, Tauri commands, and operational procedures
- **Angular Best Practices**: Use the Angular CLI MCP tool (`mcp__angular-cli__get_best_practices`) for current Angular 20+ guidelines

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

For comprehensive command reference including development, testing, Tauri commands, and troubleshooting, see `docs/COMMAND_REFERENCE.md`.

### Quick Start
- `npm run tauri dev` - Start development mode (frontend + backend)
- `cargo test` - Run Rust tests from `core/` or `src-tauri/` directory
- `npm run build` - Build Angular application for production

## Key Technologies

- **Tauri v2**: Desktop application framework with tray icon support
- **Angular 20+**: Frontend framework with standalone components and Angular CDK (DragDrop, Overlay, Dialog)
- **NgRx Signals**: Modern reactive state management with signal-based stores
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
  - `src/app/shared/store/`: NgRx Signal Stores for centralized state management
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

2. **Shared Mirrored State (NgRx Signals)**
   - 5-7 fields subset with pagination using NgRx Signal Stores
   - KB Packs, Runs, Schedules/Flows, Metrics/Logs (~50 entries), Errors
   - **Storage**: SQL persistent (aggregated), in-memory reactive signals (frontend ephemeral)
   - **Sync Flow**: Delta push via Tauri events → NgRx Signal Store; Direct async store methods for backend calls

3. **Local Frontend State (Angular Signals)**
   - 4-6 signals (ephemeral)
   - UI Filters/Search, Temp Data (wizards), Selected Items, Optimistic updates
   - **Storage**: In-memory runtime with signals (auto-reset)
   - **Sync Flow**: Computed from shared state; Optimistic → Backend confirmation

### State Management (MVP)

- **Backend State Pattern**: Arc<RwLock<AppState>> for simple MVP backend state management
- **Frontend State Management**: NgRx Signal Stores for reactive, centralized state management
- **Direct Persistence**: SQL writes with periodic saves and load-on-startup pattern
- **Event Broadcasting**: Tauri events for backend-to-frontend state sync with real-time updates
- **Real-time Synchronization**: Event listeners in NgRx Signal Store for automatic state updates
- **Event Sourcing Preparation**: Schema ready for event sourcing, upgrade path to full undo/redo support

### NgRx Signals Architecture

- **Signal Stores**: Centralized reactive state management using `@ngrx/signals`
- **Computed Values**: Derived state calculations using computed signals
- **Event Integration**: Real-time Tauri event listeners within store methods
- **Async Operations**: Direct Tauri command integration with proper error handling
- **Type Safety**: Full TypeScript integration with shared type definitions

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

## Tauri Commands & API Reference

For detailed Tauri commands, MCP server endpoints, and KB API contract, see `docs/COMMAND_REFERENCE.md`.

### Key API Sets
- **Core System Commands**: Basic Rust/Python integration commands
- **MCP Server Management**: Start/stop/status/health check commands
- **KB API Contract**: Knowledge base operations (search, document management, flow composition)
- **Tool Sets**: `rag.*`, `kb.*`, and `admin.*` MCP endpoints

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

For comprehensive testing guidelines, structure, and commands, see `docs/DEVELOPMENT_GUIDELINES.md`.

### Test Overview
- **42 total tests** (91.3% success rate): 31 unit tests (all passing) + 11 integration tests
- **Cargo Compliant**: Unit tests co-located with source, integration tests in dedicated files
- **Core Services**: SQL, Vector, State Manager testing with comprehensive coverage
- **Frontend**: Angular component tests using modern testing patterns

### Quick Test Commands
- `cargo test --lib` - Run unit tests from `core/` directory
- `cargo test test_python_integration` - Run Python integration tests
- `cargo test --test sql_integration` - Run specific integration tests

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

For comprehensive development guidelines including Angular 20+, Rust, service structure, testing, performance, and security guidelines, see `docs/DEVELOPMENT_GUIDELINES.md`.

### Core Principles
- Follow established Angular and Rust project structure conventions
- Maintain separation of concerns between frontend (Angular) and backend (Rust/Python)
- Use responsive layouts with CSS Grid and Flexbox, avoid absolute positioning
- Handle errors gracefully with proper error propagation across all layers

### Key Framework Guidelines
- **Angular 20+**: Use standalone components, signals, modern control flow (`@if`, `@for`, `@switch`)
- **Rust Best Practices**: Follow comprehensive Rust idioms, error handling, and async patterns
- **Service Structure**: Enforce standardized service patterns as defined in CORE_DESIGN.md

### Development Conventions

**IMPORTANT**: Follow all development conventions documented in `docs/DEVELOPMENT_CONVENTIONS.md`:

- **Angular Component Architecture**: Flat directory structure, separate HTML/TS files, rag-prefixed naming
- **Angular 20+ Standards**: Signal-based components, modern control flow, standalone architecture
- **Rust Service Patterns**: Standardized service structure, async traits, proper error handling
- **Testing Standards**: Unit tests co-located, integration tests in tests/ directory
- **File Naming**: Consistent naming patterns across Angular, Rust, and documentation files

Key rules to remember:
- Components: Flat structure, separate HTML files, no inline templates
- Naming: `rag-component-name` selector, `component-name` directory/files
- Import paths: Relative imports based on component location
- Testing: Maintain 90%+ coverage with proper separation

See `docs/DEVELOPMENT_CONVENTIONS.md` for complete conventions reference.

