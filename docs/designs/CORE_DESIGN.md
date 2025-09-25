# Core Design for RAG Studio

RAG Studio is a local-first, secure, high-performance desktop application built on Tauri v2 and Rust, meeting functional (FR) and non-functional (NFR) requirements. The design follows a pragmatic MVP-first approach, balancing architectural integrity with rapid delivery.

## Recommended Project Structure

The workspace layout below is recommended for the project. It follows Tauri v2 conventions (frontend in `src/`, Rust backend in `src-tauri/`) and groups shared logic and subprocesses into workspace crates for fast, testable builds and clear separation of responsibilities.

```
rag-studio/
├── Cargo.toml                    # Workspace root: [workspace] members = ["src-tauri", "core", "mcp", "embedding-worker"]
├── package.json                  # Angular deps and scripts (e.g., ng build)
├── angular.json                  # Angular CLI config (projects, builds)
├── src/                          # Angular frontend (WebView content)
│   ├── app/                      # Core app module
│   │   ├── pages/                # Main pages: dashboard, tools, kb, pipelines, etc.
│   │   ├── shared/               # Shared modules
│   │   │   └── components/       # Components: atomic, semantic, composite
│   │   └── store/                # NgRx state mirror (actions, reducers, effects)
│   └── main.ts                   # Angular bootstrap
├── src-tauri/                    # Tauri Rust backend (binary crate)
│   ├── Cargo.toml                # Depends on tauri, tokio, core, etc.
│   ├── tauri.conf.json           # Tauri config: app ID, bundle, dev server
│   └── src/                      # Rust code for Manager and IPC
│       ├── lib.rs                # Composition root init (Manager, Builder)
│       ├── main.rs               # Minimal entry: fn main() { lib::run(); }
│       ├── manager.rs            # Manager: inject services, hold AppState
│       └── ipc/                  # Tauri commands and streams by domain
├── core/                         # Shared library crate (utils, services, logic)
│   ├── Cargo.toml                # Lib crate
│   └── src/
│       ├── lib.rs                # Re-export shared types and helpers
│       ├── state.rs              # AppState: shared patterns for MVP
│       ├── kb_module.rs          # Hybrid search, ingest/commit logic
│       └── services/             # Traits + implementations for DI (sql, vector, embedding)
├── mcp/                          # MCP subprocess (binary crate)
│   ├── Cargo.toml                # Depends on serde_json, core, etc.
│   └── src/
│       ├── main.rs               # Stdio JSON protocol loop for MVP
│       └── tools/                # Tool implementations (doc_search, etc.)
└── embedding-worker/             # Embedding subprocess (binary crate)
  ├── Cargo.toml                # Depends on pyo3 (or candle), serde_json
  └── src/
    ├── main.rs               # Batch embedding worker (stdin/stdout JSON for MVP)
    └── batch.rs              # Batch processing logic
```

Rationale:
- Keeps frontend and desktop backend aligned with Tauri v2 conventions (`src/` and `src-tauri/`).
- Uses a Cargo workspace to allow fast, parallel Rust builds and well-scoped crates for testing.
- Separates long-running subprocesses (`mcp`, `embedding-worker`) into dedicated crates for isolation and easier CI/testing.
- `core/` hosts shared types and service traits to make DI and unit testing straightforward.
- Stdio JSON for subprocesses is simple to debug for MVP; upgrade paths (UDS/bincode, actor-based state) are documented elsewhere in this design.


## MVP Architecture Approach

The design prioritizes **pragmatic complexity** - starting simple but future-proofing key foundations:

- **State Management**: Start with Arc<RwLock<AppState>> for MVP, upgrade to full actor system post-MVP
- **Subprocess Communication**: Begin with JSON over stdin/stdout, upgrade to UDS/bincode for performance-critical paths
- **Logging**: JSONL-based tracing for MVP, add SQL critical events for production
- **Services**: Async traits with DI for testability and swappable implementations

The Manager serves as the composition root, managing dependency injection services. MCP and Embedding Worker run in subprocesses for isolation. State management uses a simplified shared state pattern for MVP with clear upgrade path to actor-based system.

## Service Architecture Guidelines

### Consistent Service Structure

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

#### Service Implementation Pattern

Each service follows this consistent pattern:

1. **Error Types**: Custom error enums with `thiserror::Error` (in domain modules or shared errors/)
2. **Configuration Structs**: With `new_mvp()`, `new_production()`, and `test_config()` methods
3. **Service Trait**: Async trait defining the service interface
4. **Service Implementation**: Concrete implementation with dependency injection
5. **Helper Functions**: Utility functions and type conversions
6. **Test Helpers**: `#[cfg(test)]` helper methods only (no inline tests)

#### Module Organization Principles

- **Domain Modules** (`modules/`): Contains business logic specific to a domain (KB, Auth, Flow)
  - Each domain has its own `service.rs`, `models.rs`, `schema.rs`, and `errors.rs`
  - Business rules and domain-specific operations live here
  - Minimal external dependencies, high cohesion within domain

- **Infrastructure Services** (`services/`): Cross-cutting technical concerns
  - Each service implemented as a single `.rs` file (e.g., `sql.rs`, `vector.rs`)
  - Database access, caching, storage, external integrations
  - Shared by multiple domain modules
  - Focus on technical implementation rather than business logic

- **Shared Components**: Models, schemas, errors, utils used across domains
  - `models/` - Shared DTOs and common types used across domains
  - `schemas/` - Database schema definitions and migration utilities
  - `errors/` - Application-wide error types and conversion utilities
  - `utils/` - Common helper functions and utilities
  - `state/` - Application state management and coordination

#### Testing Structure

Tests follow Cargo standards with proper separation of unit and integration tests:

**Unit Tests** (co-located with source code using `#[cfg(test)]` modules):
```
core/src/
├── modules/
│   ├── kb/
│   │   ├── service.rs             # Contains #[cfg(test)] mod tests
│   │   ├── models.rs              # Contains #[cfg(test)] mod tests
│   │   └── schema.rs              # Contains #[cfg(test)] mod tests
│   └── auth/
│       ├── service.rs             # Contains #[cfg(test)] mod tests
│       └── models.rs              # Contains #[cfg(test)] mod tests
├── services/
│   ├── sql/
│   │   └── sql.rs                 # Contains #[cfg(test)] mod tests
│   ├── vector/
│   │   └── vector.rs              # Contains #[cfg(test)] mod tests
│   └── cache/
│       └── cache.rs               # Contains #[cfg(test)] mod tests
└── state/
    ├── app_state.rs               # Contains #[cfg(test)] mod tests
    └── manager.rs                 # Contains #[cfg(test)] mod tests
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

**Test Classification**:
- **Unit Tests**: Test individual methods, error conditions, and isolated functionality. Located in `#[cfg(test)]` modules within service implementation files.
- **Integration Tests**: Test complete workflows, cross-service interactions, and end-to-end scenarios. Located as standalone `.rs` files in the `tests/` directory.
- **Test Results**: 42 tests passing (31 unit tests + 11 integration tests) with 91.3% success rate.

### Benefits of This Structure

1. **Consistency**: All services follow the same organizational pattern
2. **Maintainability**: Clear separation of concerns and standardized interfaces
3. **Testability**: Comprehensive test coverage with proper separation of unit vs integration tests
4. **Discoverability**: Developers can quickly understand any service by following the standard pattern
5. **Scalability**: Easy to add new services following the established pattern

## Angular Component Architecture Guidelines

**NOTE**: Complete Angular component architecture guidelines, conventions, and implementation standards have been consolidated into `docs/DEVELOPMENT_CONVENTIONS.md`.

### Key Component Structure Summary

- **3-Tier Architecture**: Atomic → Semantic → Composite components
- **Flat Directory Structure**: All composite components at root level (no subdirectories)
- **File Separation**: Always separate `.ts`, `.html`, `.scss` files (no inline templates)
- **Naming Convention**: `rag-component-name` selector, `component-name` directory/files
- **Angular 20+ Standards**: Signal-based, standalone components with modern control flow

**For detailed component conventions, implementation patterns, and examples, see:**
`docs/DEVELOPMENT_CONVENTIONS.md` - Authoritative source for all component architecture standards

## 1. Architecture Overview and Process Boundaries

### Overview Diagram

```mermaid
flowchart LR
  subgraph SVC["DI Services (in-process, Manager-owned pools, Hot-Reload Config)"]
    S1["SqlService (SQLite/Diesel Async)<br>(app_meta.db: Metadata/Config/Migrations/Backup; events.db: Critical Events ACID; WAL Async, Split Concurrency)"]
    S2["VectorDbService (LanceDB embedded/file, Async Writes)<br>(Embeddings, ANN Search, BM25 Integration, Atomic Promote + Epoch GC)"]
    S3["StorageService<br>(LocalFS/ZIP Packs, Quotas 1-5GB, Auto-Prune)"]
    S4["CacheService<br>(Memory/Redis-local, TTL Eviction, Layered: Request/Feature/Doc, Invalidation on Gen ID)"]
    S5["Auth/SecretService (ring crate, UDS SO_PEERCRED + Token Headers)"]
    S6["EmbeddingService (Out-of-Process Worker UDS/Bincode, Warm-Pool, Health/Rotate, PyO3 Async + Rust Fallback)"]
    S7["FlowService (Composition of Tools/KB/Pipelines, FR-6 Flows, Checksum Validation)"]
    S8["StateManager (Actor-based per Domain: KBs/Runs/Metrics, mpsc Channels, Batched Persist)<br>(Global State: KBs/Runs/Logs, FR-2/3/8, Event Bus Deltas)"]
  end
  subgraph P0["Main Process: Manager (Composition Root)"]
    direction TB
    A1["UI Adapter / API Gateway (Tauri IPC Async Commands/Streams, Non-Blocking + Debounce 60Hz)"]
    A2["Orchestrator / Scheduler (Tokio-based, Semaphores + Backpressure Bounds)"]
    A3["Event & Log Router (tracing Multi-Sinks: SQL Critical Events, JSONL Non-Critical + Rotation/Redaction, Cross-Process Propagate)"]
    A4["KB Module<br>(Read/Write API, Versioning, Citations, Flow Composition, Adaptive Rerank)"]
    A5["Outbound RPC Server<br>(UDS/Axum + SO_PEERCRED/Token Auth, Schema Versioning + Compat, Circuit Breaker + Backpressure Limits)"]
    SVC
  end
  subgraph P1["Subprocess: MCP Module (Sandbox seccomp/JobObject + Policy Engine, Optional In-Process Mode)"]
    direction TB
    M1["Tool Registry & Handlers<br>(Behavior-Driven, Dynamic Bindings, Capability Policy)"]
    M2["JSON-Schema Validation & Limits (Fuzz-Resistant)"]
    M3["Dispatcher (Parallel Dispatch for Hybrid Calls)"]
    M4["OutboundPort Client<br>(UDS/Axum Client, Local Cache for Frequent Queries)"]
    M5["Transports:<br>MCP stdio (required)<br>HTTP /invoke (optional, air-gapped block)"]
    M6["Logging Adapter<br>(tracing → Outbound Port, Structured Spans, Propagate Trace_ID)"]
  end
  subgraph P2["Subprocess: Embedding Worker (UDS/Bincode, Warm-Pool, Health-Check/Rotate)"]
    E1["PyO3/Sentence-Transformers Batch, GIL Release + Rust Fallback (candle)"]
  end
  UI["Angular UI (Tauri WebView, Real-Time Updates via IPC Streams, Debounce Logs/Metrics)"] -- Tauri IPC Async Streams --> A1
  C["IDE/Agent/Client (MCP Clients)"] -- MCP stdio --> M5
  M5 --> M3
  M3 --> M1
  M3 -- needs data --> M4
  M4 -- Outbound RPC UDS + Token Auth --> A5
  A5 --> A4
  A4 --> S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8
  M6 -- Events/Logs JSON/SQL --> A3
  A2 --> A4
  A1 --> A4
  A3 --> S3
  S6 -- UDS/Bincode Warm-Pool --> E1
```

### Key Points
- **Manager**: Composition root following Tauri v2 structure (src-tauri/ binary). Initializes/injects DI services with async traits. Manages subprocess lifecycle and IPC coordination.
- **MCP**: Isolated subprocess using stdio MCP protocol for simplicity. Basic sandbox (process isolation), communicates via JSON messages. Upgrade to UDS/full sandbox post-MVP.
- **Embedding Worker**: Out-of-process PyO3 worker. Start with JSON over stdin/stdout, upgrade to UDS/bincode for performance. Handles embedding/reranking to isolate GIL and crashes.
- **State Management**: Simplified Arc<RwLock<AppState>> for MVP with clear interfaces. Services inject shared state. Real-time updates via Tauri events with debounce.
- **Logging**: JSONL-based tracing-subscriber for MVP. Structured logging with rotation. Add SQL critical events layer post-MVP for event sourcing.
- **UI**: Angular 20+ with Tauri v2 IPC. Signal-based reactivity, real-time streams for metrics/logs, non-blocking operations with proper error handling.

## 2. Retrieval Flow: MCP `doc.search` → KB (Hybrid Search with Rerank & Citations)

The retrieval flow processes RAG queries, combining semantic (LanceDB ANN) and lexical (BM25/tantivy), with adaptive rerank, mandatory citations, and layered caching. It includes adaptive candidate sets, backpressure, tracing histograms, and Embedding Worker integration.

### Retrieval Flow Diagram

```mermaid
sequenceDiagram
    participant Client as IDE/Agent
    participant MCP as MCP Subprocess
    participant ORPC as Outbound RPC Server (Manager)
    participant KB as KB Module (in-process)
    participant EMB as Embedding Worker (Out-of-Process UDS)
    participant SQL as SqlService (SQLite Async WAL)
    participant VDB as VectorDbService (LanceDB Async)
    participant CACHE as CacheService (Layered)
    participant LOG as Log Router (tracing Multi-Sinks)
    participant STATE as StateManager (Actor-based)

    Client->>MCP: invoke tool `doc.search` {q, topK, filters?}
    MCP->>MCP: validate input (JSON-Schema), limits (tracing span)
    MCP->>ORPC: call op=`kb.hybrid_search` {collection, query, top_k, filters} (Schema Versioned)
    ORPC->>KB: kb.hybrid_search(...) (Backpressure Limits)
    KB->>STATE: get_state(scope="kbs")  // Actor mpsc read filtered KB state
    STATE-->>KB: kb_packs (delta/filtered)
    KB->>SQL: filter/ACL/version pinning (atomic transaction)
    KB->>CACHE: check layered hit (request/feature/doc, key with gen_id)
    alt Cache Hit
        CACHE-->>KB: cached results
    else Cache Miss
        KB->>EMB: embed query → query_vec (UDS Batch, Health-Check)
        EMB-->>KB: query_vec (Rust fallback if timeout)
        par Vector Search & BM25 Parallel
            KB->>VDB: vector search (ANN async) → candidates
            KB->>SQL: BM25 lexical search (tantivy async) → candidates
        end
        KB->>KB: merge/score candidates (weighted hybrid, adaptive K based overlap)
        alt No results
            KB->>KB: broaden filters/backfill (async queue)
        end
        KB->>EMB: rerank candidates (UDS batch=32-64, seq_len guard)
        EMB-->>KB: reranked
        KB->>SQL: enrich snippets/citations (mandatory with license)
        KB-->>ORPC: results [{title, snippet, citation, meta, score}]
        ORPC-->>MCP: results...
        KB->>CACHE: store layered (TTL on confidence, invalidate on commit)
        KB->>STATE: mutate(StateDelta::MetricsUpdate { latency: 150.0, hit_rate: 0.9 })  // Actor mpsc
    end
    MCP->>MCP: validate output schema (citations required)
    MCP-->>Client: hits + citations
    MCP->>LOG: emit events (spans for P50/P95, hit rate, propagate trace_id)
```

### Notes
- **Hybrid Retrieval**: BM25 + Vector, pre-filtering (FR-5.3), adaptive rerank (FR-5.2), mandatory citations (FR-5.4), backfill (FR-5.5).
- **State Integration**: Actor-based reads/mutates for efficiency; deltas for UI sync.
- **Performance**: Parallel joins, layered cache, UDS Embedding Worker, configurable Top-N. Backpressure via semaphores/limits.
- **Observability**: Tracing histograms for latencies/hit rate; critical events to SQL, non-critical to JSONL.

## 3. Ingest & Commit Flow: ETL → KB (Write Path with Delta & Eval)

The ingest flow handles ETL, supporting delta-only, versioning, rollback. It includes atomic promote, eval gate with drift, backpressure, and Embedding Worker.

### Ingest Flow Diagram

```mermaid
sequenceDiagram
  participant ETL as Ingestion/ETL Module
  participant ORCH as Orchestrator/Scheduler (Tokio, Retry/Backoff + Bounds)
  participant KB as KB Module
  participant SQL as SqlService (SQLite Async)
  participant VDB as VectorDbService (LanceDB Async, Gen Promote)
  participant EMB as Embedding Worker (UDS Batch)
  participant CACHE as CacheService (Layered)
  participant STORE as StorageService (LocalFS)
  participant LOG as Log Router (tracing Multi-Sinks)
  participant STATE as StateManager (Actor-based)

  ORCH->>STATE: mutate(StateDelta::RunAdd { status: "starting" })  // Actor mpsc
  ORCH->>KB: begin_commit(collection, version, label) (async transaction)
  KB->>SQL: create commit (pending, fingerprint, WAL async)
  ETL->>STORE: fetch/parse/chunk/annotate (parallel tokio)
  alt Delta-only
    KB->>STATE: get_state(scope="kbs")  // Actor read
    SQL->>SQL: compare fingerprints → changed only
  end
  ETL->>CACHE: check embed hits → skip (feature layer)
  ETL->>EMB: batch embed changed (UDS, GIL release, fallback)
  EMB-->>ETL: embeddings
  ETL->>KB: upsert_documents/commit_id (batch async)
  KB->>SQL: write metadata (atomic)
  ETL->>KB: upsert_chunks (buffered)
  KB->>SQL: write chunks
  KB->>VDB: upsert vectors staging (batched)
  KB->>VDB: index BM25 (parallel)
  ETL->>KB: eval (recall@k, drift detector mean/cov)
  alt Eval Fail/Drift High
    KB->>LOG: warning (pause schedule FR-4)
    KB->>STATE: mutate(StateDelta::Error { error: "drift high" })
  end
  ORCH->>KB: finalize_commit (rollback if fail, eval gate block promote)
  KB->>SQL: mark active, create version (event source undo)
  KB->>VDB: atomic promote staging → active (gen rename/symlink, epoch GC)
  KB-->>ORCH: success (metrics: size, eval scores)
  ORCH->>STATE: mutate(StateDelta::RunUpdate { status: "completed", metrics })
  ORCH->>LOG: emit kb.commit.completed (SQL critical if undo-related, JSONL else; histograms)
```

### Notes
- **Pipeline**: Prebuilt ops (FR-3.1), delta-only (FR-2.3), versioning (FR-2), eval gate with drift.
- **State Integration**: Actor mpsc for mutates, track runs (FR-3.4), update metrics (FR-8).
- **Performance**: Async WAL, buffered upserts, backpressure, quotas prune (SDD §13.3).
- **Resilience**: Rollback/undo via SQL event sourcing (FR-9/11), eval alerts (FR-8.3).

## 3.1. KB Creation via Pipeline Templates (Architectural Integration)

Knowledge Base creation is implemented through the Pipeline system using specialized templates, providing unified ETL workflows and eliminating code duplication. This architectural pattern treats KB creation as a specific application of the general-purpose Pipeline infrastructure.

#### 1. KB Creation Pipeline Templates

**Local Folder Template:**
```typescript
{
  name: "KB Creation - Local Folder",
  category: "data_ingestion",
  steps: [
    { type: "fetch", config: { source: "local-folder", path: "{{sourceUrl}}" }},
    { type: "parse", config: { formats: ["pdf", "md", "txt", "docx"] }},
    { type: "normalize", config: { cleanMarkdown: true, deduplication: true }},
    { type: "chunk", config: { strategy: "semantic", maxTokens: 512 }},
    { type: "embed", config: { model: "{{embeddingModel}}" }},
    { type: "index", config: { vectorDb: "lancedb", sqlDb: "sqlite" }},
    { type: "eval", config: { validateRecall: true, qualityThreshold: 0.8 }},
    { type: "pack", config: { createKB: true, name: "{{name}}", product: "{{product}}" }}
  ],
  parameters: {
    sourceUrl: { type: "string", required: true, description: "Local directory path" },
    embeddingModel: { type: "string", required: true, enum: ["all-MiniLM-L6-v2", "all-mpnet-base-v2", "e5-large-v2"] },
    name: { type: "string", required: true, description: "Knowledge base name" },
    product: { type: "string", required: true, description: "Product/domain identifier" }
  }
}
```

**Web Documentation Template:**
```typescript
{
  name: "KB Creation - Web Documentation",
  category: "data_ingestion",
  steps: [
    { type: "fetch", config: { source: "web-crawler", baseUrl: "{{sourceUrl}}", respectRobots: true }},
    { type: "parse", config: { extractMainContent: true, removeNav: true, preserveLinks: true }},
    { type: "normalize", config: { deduplication: true, urlCanonical: true }},
    { type: "chunk", config: { respectHeaders: true, maxTokens: 512 }},
    { type: "embed", config: { model: "{{embeddingModel}}" }},
    { type: "index", config: { vectorDb: "lancedb", sqlDb: "sqlite" }},
    { type: "eval", config: { validateLinks: true, qualityThreshold: 0.8 }},
    { type: "pack", config: { createKB: true, name: "{{name}}", product: "{{product}}" }}
  ]
}
```

**GitHub Repository Template:**
```typescript
{
  name: "KB Creation - GitHub Repository",
  category: "data_ingestion",
  steps: [
    { type: "fetch", config: { source: "git-clone", repo: "{{sourceUrl}}", shallow: true }},
    { type: "parse", config: { includeCode: true, includeReadmes: true, excludeBinary: true }},
    { type: "normalize", config: { respectGitignore: true, pathNormalization: true }},
    { type: "chunk", config: { codeAware: true, language: "auto", maxTokens: 512 }},
    { type: "embed", config: { model: "{{embeddingModel}}" }},
    { type: "index", config: { vectorDb: "lancedb", sqlDb: "sqlite", includeFilePath: true }},
    { type: "eval", config: { validateStructure: true, qualityThreshold: 0.8 }},
    { type: "pack", config: { createKB: true, name: "{{name}}", product: "{{product}}" }}
  ]
}
```

#### 2. Enhanced Pipeline Steps

**New `pack` Step Type:**
- Creates KB from pipeline output with metadata
- Validates completion of all prerequisite steps
- Registers KB in StateManager with proper versioning
- Generates manifest with processing statistics

**Enhanced Parameter System:**
- Content source enumeration with validation
- Embedding model selection with performance characteristics
- KB metadata (name, product, version, description)
- Processing options (chunking strategy, quality thresholds)

#### 3. Architectural Benefits

**Unified ETL Architecture:**
- Single implementation serves both KB creation and general data processing workflows
- Consistent error handling, retry logic, and progress tracking across all operations
- Standardized logging and metrics collection for all data ingestion patterns

**Flexible Workflow Composition:**
- Template-based approach supports customizable KB creation workflows
- Pipeline step library enables preprocessing extensions (OCR, translation, custom parsers)
- Configurable chunking strategies and content source adapters
- Multi-source KB creation through pipeline composition

**Consistent System Interface:**
- Unified Pipeline designer UI for all data processing operations
- Shared monitoring and debugging infrastructure
- Template library provides guided workflow patterns
- Common execution engine and progress tracking across system

**Architectural Coherence:**
- Implements ETL → KB pattern described in core architecture specifications
- Leverages Pipeline infrastructure and StateManager patterns
- Supports "KB as pipeline output" model throughout system
- Maintains clear separation between UI layer and processing logic

#### 4. Template Architecture

KB creation templates extend the standard Pipeline template system with domain-specific parameters and validation. Templates define complete ETL workflows from data source through knowledge base creation, supporting the full spectrum of content ingestion patterns while maintaining architectural consistency with the broader Pipeline system.

## 4. DI & Wiring (Service Integration and Dependency Management)

Manager initializes/injects DI services into modules; MCP uses RPC for state. It includes Embedding Worker DI, StateManager actors, cache layering, and logging multi-sinks.

### DI & Wiring Diagram

```mermaid
graph TB
  subgraph "Manager (Composition Root)"
    direction TB
    Cfg["App Config (TOML: dataDir, airGapped; Hot-Reload via notify)"]
    S1["SqlService Impl (SQLite/Diesel Async)<br />(Pools, Migrations, Backup, WAL; app_meta.db + events.db Split)"]
    S2["VectorDbService Impl (LanceDB Async)<br />(Zero-Copy Promote, Gen Rename/Epoch GC)"]
    S3["StorageService Impl (LocalFS/ZIP + Checksums, Quotas/Auto-Prune)"]
    S4["CacheService Impl (Memory TTL, Layered + Invalidation Hooks)"]
    S5["Auth/SecretService Impl (ring, SO_PEERCRED/Token + Cert Rotation)"]
    S6["Embedding Worker Impl (UDS/Bincode, Warm-Pool/Health, PyO3 + Candle Fallback)"]
    S7["FlowService Impl (Composition, Checksum FR-6)"]
    S8["StateManager (Actors per Domain mpsc, Batched Persist)<br />(Mutations/Deltas, FR-2/3/8)"]
    KBMod["KB Module (Async Traits, Circuit Breaker)"]
    ORPC["Outbound RPC Server (Axum/UDS + Token Auth, Middleware: Limits/Retry/Versioning)"]
    ORCH["Orchestrator/Scheduler (Tokio Semaphores/Backpressure, Circuit Breaker)"]
    LOGR["Log Router (tracing Multi-Sinks: SQL Critical, JSONL Non-Critical + Rotation/Redaction)"]
    SUP["Supervisor<br />(tokio::spawn MCP/Embedding Worker, Backoff/Health Ping, Graceful Shutdown)"]
    UI["Tauri IPC Adapter (Async + Streams, Debounce)"]
  end

  subgraph "MCP (Subprocess, Sandbox Policy)"
    Tools["Tool Registry (Dynamic, Permissions)"]
    Ctx["ExecCtx (Outbound Client, Default-Deny + Escalation)"]
    ORPCC["OutboundPort Client (Axum UDS, Local Cache)"]
    LOGM["tracing Layer → Outbound Port (Propagate ID)"]
  end

  %% DI injections
  Cfg --> S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8
  S1 --> KBMod & ORCH & LOGR
  S2 --> KBMod
  S3 --> KBMod & LOGR
  S4 --> KBMod
  S5 --> KBMod & ORPC
  S6 --> KBMod
  S7 --> KBMod
  S8 --> KBMod & ORCH & LOGR
  KBMod --> ORPC
  ORCH --> KBMod
  LOGR --> S3
  SUP --> MCP
  Tools --> Ctx
  Ctx --> ORPCC
  ORPCC --> ORPC
  LOGM --> ORPC
  UI --> KBMod & ORCH
  %% Embedding Worker
  SUP --> EmbeddingWorker["Embedding Worker (UDS Warm-Pool)"]
  S6 --> EmbeddingWorker
  %% Comments
  %% Circuit breaker (tower), async traits, State actors for low contention
```

### Principles
- **DI Services**: Initialized from TOML (hot-reload), async traits, circuit breaker (tower). StateManager actors injected for shared access.
- **State Interaction**: Actor mpsc for reads (filtered), mutates (delta + emit). Deltas for sync (internal/UI/MCP).
- **MCP**: Default-deny permissions with policy engine, escalation prompts (FR-1.7). RPC proxies to StateManager with versioning.
- **Logging**: Multi-sinks (SQL critical events ACID, JSONL non-critical with redaction/rotation). Subscribes StateManager for metrics (histograms).
- **Tauri**: Portable <100MB, tray mode, IPC streams with debounce/non-blocking. State deltas pushed via events.

## 4.1. Model Management Service Architecture

The Model Management system provides dynamic model lifecycle management integrated with the embedding worker subprocess, supporting HuggingFace downloads, local discovery, and manual imports while maintaining the system's local-first and performance-focused design.

### Model Service Integration

**Service Architecture:**
```rust
// core/src/services/model.rs
pub struct ModelService {
    config: ModelConfig,
    model_cache: Arc<DashMap<String, ModelMetadata>>,  // Concurrent access optimization
    storage_service: Arc<StorageService>,
    embedding_service: Arc<EmbeddingService>,
    lru_policy: Arc<Mutex<ModelLruPolicy>>,            // Worker memory management
}

pub struct ModelConfig {
    pub models_directory: PathBuf,                     // ./models/
    pub cache_size_gb: Option<u64>,                    // Auto-detect from available space
    pub min_free_space_gb: u64,                        // 2GB minimum free space
    pub auto_cleanup_threshold: f32,                   // 0.8 = cleanup at 80% full
    pub worker_memory_limit_gb: f64,                   // 2GB default for embedding worker
    pub auto_download: bool,                           // HuggingFace integration
    pub offline_mode: bool,                            // Air-gapped operation
    pub bundled_models: Vec<String>,                   // Shipped with application
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMetadata {
    pub id: String,                                    // "sentence-transformers/all-MiniLM-L6-v2"
    pub name: String,                                  // "All MiniLM L6 v2"
    pub description: String,
    pub model_type: ModelType,                         // Embedding, Reranking, Combined
    pub size_mb: u64,
    pub dimensions: u32,                               // 384 for MiniLM
    pub max_sequence_length: u32,                      // 512 tokens
    pub source: ModelSource,                           // HuggingFace, Local, Manual, Bundled
    pub status: ModelStatus,                           // Available, Downloading, Error
    pub local_path: Option<PathBuf>,
    pub checksum: Option<String>,                      // SHA-256 integrity verification
    pub performance_metrics: PerformanceMetrics,      // Load time, throughput benchmarks
    pub last_used: Option<DateTime<Utc>>,             // LRU cleanup support
    pub compatibility: Vec<String>,                    // Supported frameworks (sentence-transformers, transformers)
}
```

**Dynamic Model Discovery:**
- **HuggingFace Integration**: Search and download models with progress tracking and retry logic
- **Local Discovery**: Auto-scan `./models/`, `~/.cache/huggingface/`, and user-specified directories
- **Manual Import**: Drag-drop model files with auto-detection of format and metadata
- **Bundled Models**: Ship with lightweight models (90MB MiniLM) for offline operation

### Embedding Worker Integration

**LRU Memory Management:**
The embedding worker implements intelligent model caching to prevent memory thrashing while maintaining performance:

```rust
// embedding-worker/src/model_cache.rs
pub struct ModelCache {
    loaded_models: LruCache<String, LoadedModel>,
    max_memory_gb: f64,                                // Configurable worker memory limit
    current_memory_gb: f64,
    warm_models: HashSet<String>,                      // Pre-loaded frequently used models
}

impl ModelCache {
    pub async fn ensure_model_loaded(&mut self, model_id: &str) -> Result<&LoadedModel> {
        // Check if model already loaded
        if self.loaded_models.contains(model_id) {
            return Ok(self.loaded_models.get(model_id).unwrap());
        }

        // Free memory if approaching limit (90% threshold)
        while self.current_memory_gb > self.max_memory_gb * 0.9 {
            if let Some((_, old_model)) = self.loaded_models.pop_lru() {
                self.current_memory_gb -= old_model.memory_usage_gb;
                info!("Unloaded model {} to free memory", old_model.id);
            } else {
                break; // No more models to unload
            }
        }

        // Load new model with progress tracking
        let loaded_model = self.load_model_from_disk(model_id).await?;
        self.current_memory_gb += loaded_model.memory_usage_gb;
        self.loaded_models.put(model_id.to_string(), loaded_model);

        Ok(self.loaded_models.get(model_id).unwrap())
    }
}
```

**Performance Optimization:**
- **Warm-up Caching**: Pre-load frequently used models during app startup
- **Batch Loading**: Efficient model switching for pipeline operations
- **Fallback Support**: Rust-based fallback (candle) for PyO3 timeouts with performance benchmarking

### Storage and Database Integration

**Directory Structure:**
```
./models/
├── cache/
│   └── huggingface/                    # HuggingFace download cache
├── local/                              # User imported models
├── bundled/                            # Shipped models (MiniLM-L6-v2)
└── metadata/
    ├── models.db                       # SQLite model registry
    └── checksums.json                  # Integrity verification
```

**Database Schema Extensions:**
```sql
-- Add to existing app_meta.db
CREATE TABLE models (
    id TEXT PRIMARY KEY,                -- "sentence-transformers/all-MiniLM-L6-v2"
    name TEXT NOT NULL,
    description TEXT,
    model_type TEXT NOT NULL,           -- 'embedding', 'reranking', 'combined'
    source_type TEXT NOT NULL,          -- 'huggingface', 'local', 'bundled', 'manual'
    source_data JSON NOT NULL,          -- Repo ID, path, upload info
    local_path TEXT,
    size_mb INTEGER,
    dimensions INTEGER,
    max_sequence_length INTEGER,
    status TEXT NOT NULL,               -- 'available', 'downloading', 'error', 'not_downloaded'
    checksum TEXT,                      -- SHA-256 hash
    performance_metrics JSON,           -- Load time, throughput, accuracy benchmarks
    compatibility JSON,                 -- Supported frameworks and versions
    last_used TIMESTAMP,                -- LRU cleanup support
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_models_last_used ON models(last_used);
CREATE INDEX idx_models_type ON models(model_type);
```

### KB Creation and Pipeline Integration

**Dynamic Model Selection:**
KB creation and pipeline templates support dynamic model selection with validation and fallback:

```typescript
// Enhanced embedding model interface
export interface EmbeddingModel {
    id: string;                         // Model identifier
    name: string;                       // Display name
    description: string;                // User-friendly description
    dimensions: number;                 // Vector dimensions (384, 768, 1024)
    maxTokens: number;                  // Maximum sequence length
    sizeMB: number;                     // Model size for storage planning
    modelType: 'embedding' | 'reranking' | 'combined';
    status: 'available' | 'downloading' | 'not_downloaded' | 'error';
    source: 'bundled' | 'huggingface' | 'local' | 'manual';
    performance: {
        loadTimeMs: number;             // Model loading latency
        throughputVecsPerSec: number;   // Embedding generation speed
        accuracyScore?: number;         // Benchmark accuracy (if available)
    };
    downloadProgress?: number;          // 0-100 for downloading models
    errorMessage?: string;              // Error details if status is 'error'
}
```

**Pipeline Pre-validation:**
Pipeline steps validate model availability before execution to prevent runtime failures:

```rust
// Enhanced pipeline step validation
impl PipelineStep {
    pub async fn validate_model_dependencies(&self, model_service: &ModelService) -> Result<Vec<ValidationWarning>> {
        let mut warnings = Vec::new();

        if let Some(model_id) = self.config.get("model") {
            match model_service.get_model_status(model_id).await? {
                ModelStatus::Available => {
                    // Check if model is optimal for this content type
                    if let Some(suggestion) = model_service.suggest_better_model(model_id, &self.step_type).await? {
                        warnings.push(ValidationWarning::SuboptimalModel {
                            current: model_id.clone(),
                            suggested: suggestion,
                            reason: "Better accuracy for this content type".to_string()
                        });
                    }
                },
                ModelStatus::NotDownloaded => {
                    return Err(PipelineError::ModelNotAvailable {
                        model_id: model_id.clone(),
                        suggestion: format!("Download model or use fallback: {}",
                            model_service.get_fallback_model(&self.step_type).await?)
                    });
                },
                ModelStatus::Downloading { progress, eta_seconds } => {
                    warnings.push(ValidationWarning::ModelDownloading {
                        model_id: model_id.clone(),
                        progress,
                        eta_seconds
                    });
                },
                ModelStatus::Error { message } => {
                    return Err(PipelineError::ModelError {
                        model_id: model_id.clone(),
                        message,
                        fallback: model_service.get_fallback_model(&self.step_type).await?
                    });
                }
            }
        }

        Ok(warnings)
    }
}
```

### Frontend Integration Patterns

**Models Store (NgRx Signals):**
```typescript
// src/app/shared/store/models.store.ts
@Injectable({ providedIn: 'root' })
export class ModelsStore extends ComponentStore<ModelsState> {
    // Signals for reactive UI
    readonly models = signal<EmbeddingModel[]>([]);
    readonly downloadProgress = signal<Map<string, number>>(new Map());
    readonly storageUsage = signal<StorageInfo>({ used: 0, total: 0, available: 0 });

    // Computed values
    readonly availableModels = computed(() =>
        this.models().filter(m => m.status === 'available')
    );
    readonly recommendedModels = computed(() =>
        this.models().filter(m => m.source === 'bundled' || m.performance.accuracyScore > 0.8)
    );
    readonly storageUsagePercent = computed(() =>
        (this.storageUsage().used / this.storageUsage().total) * 100
    );

    // Tauri commands with error handling
    async searchHuggingFaceModels(query: string, modelType?: string): Promise<HuggingFaceModel[]>
    async downloadModel(repoId: string, onProgress?: (progress: number) => void): Promise<void>
    async importLocalModel(path: string): Promise<EmbeddingModel>
    async deleteModel(modelId: string): Promise<void>
    async benchmarkModel(modelId: string): Promise<PerformanceMetrics>
    async preloadFrequentModels(): Promise<void>

    // Real-time event handlers
    constructor() {
        super(initialState);
        this.listenToModelEvents();
        this.loadInitialModels();
    }

    private async listenToModelEvents(): Promise<void> {
        await listen('model_download_progress', (event: Event<{modelId: string, progress: number}>) => {
            this.downloadProgress.update(map => map.set(event.payload.modelId, event.payload.progress));
        });

        await listen('model_status_changed', (event: Event<{modelId: string, status: string}>) => {
            this.models.update(models =>
                models.map(m => m.id === event.payload.modelId
                    ? { ...m, status: event.payload.status as any }
                    : m
                )
            );
        });
    }
}
```

### Security and Performance Considerations

**Security Features:**
- **Checksum Verification**: SHA-256 validation for all downloaded models
- **Sandboxed Execution**: Model loading isolated in embedding worker subprocess
- **Format Validation**: Whitelist supported formats (safetensors, ONNX, PyTorch)
- **No Code Execution**: Models treated as data only, no arbitrary code execution

**Performance Optimizations:**
- **Background Downloads**: Non-blocking model downloads with priority queuing
- **Progressive Loading**: Lazy model loading with warm-up caching for frequent models
- **Storage Efficiency**: Automatic cleanup, LRU eviction, and shared cache directories
- **Benchmarking**: Built-in performance metrics (load time <500ms for small models, <2s for large)

**Quota Management:**
- **Dynamic Sizing**: Auto-detect available disk space, default to 50% usage with 2GB minimum free
- **Smart Cleanup**: Remove least-used models when approaching storage limits
- **User Control**: Configurable cache size limits and retention policies

This model management architecture seamlessly integrates with the existing RAG Studio design patterns while providing enterprise-grade model lifecycle management, supporting both air-gapped operation and cloud-integrated workflows.

## 5. Boundaries & Implementation Decisions

### Subprocess
- **MCP**: Stdio, sandbox (seccomp/AppArmor/JobObject + policy engine), hot-swap. State access via RPC (no direct).
- **Embedding Worker**: UDS/bincode, warm-pool, health ping/rotate. Offload heavy PyO3 tasks (>10k chunks), Rust fallback.
- **Heavy Tasks**: Async offload with backpressure.

### In-Process Modules
- **KB/Embedding/Flow**: Async calls, circuit breaker. Interact with State actors for reads/mutates (e.g., health FR-2.4).
- **Orchestrator/Scheduler**: Tokio semaphores/backpressure, retry (FR-4.2), dry-run/resume (FR-3.3/11). Mutates via State actors, subscribes events (e.g., backfill FR-3.4).
- **Outbound RPC Server**: Axum UDS + token auth, middleware (limits, versioning). Proxies state with backpressure.
- **Log Router**: Tracing multi-sinks (SQL critical, JSONL non-critical), event sourcing (FR-9). Subscribes State for logs/metrics (commit.completed FR-3).

### DI Services (Manager-owned, Hot-Reloadable)
- **SqlService**: SQLite WAL async, migrations/backups (FR-10); split dbs (app_meta/events, synchronous FULL for events, NORMAL for others, busy_timeout + jitter). Persists AppState (e.g., runs FR-3.4), critical events ACID.
- **VectorDbService**: LanceDB async, BM25 (tantivy); atomic gen promote/epoch GC. Swappable (config).
- **StorageService**: LocalFS quotas (1-5GB), auto-prune; ZIP checksums.
- **EmbeddingService**: UDS worker, PyO3 async + cache; Rust fallback (>5s timeout).
- **Auth/Secrets**: Ring encryption; token headers, mTLS fallback.
- **Cache**: Memory TTL (dashmap), layered invalidation on commits/gen.
- **FlowService**: Compose tools/KB, checksum (FR-6/AC-5). Mutates flows in State actors.
- **StateManager**: Actors (mpsc per domain), broadcast for events. Read: async filtered; Write: mutate delta + emit. Persistence via SqlService (critical to events.db).

### Tauri-Specific
- Portable <100MB (bundle PyO3/candle); tray mode; IPC streams (wizards FR-3/9); cross-OS (PathBuf). State deltas via events/streams, debounce.

## 6. KB API Contract Used by MCP

- `kb.hybrid_search(collection, query, top_k, filters, cache_ttl?) -> [Hit {chunk_id, score, snippet, citation, meta}]` (Adaptive K, FR-5)
- `kb.answer(query, filters?, model?) -> {text, citations[], confidence?}` (Async LLM via Worker)
- `kb.get_document(doc_id, range?) -> Document {metadata, chunks?, license?}`
- `kb.resolve_citations(chunk_ids) -> [Citation {title, anchor/URL, license?, version?}]` (FR-5.4)
- `kb.stats(collection/version) -> Stats {size, versions, embedder_version, health, eval_scores?}` (FR-2.4)
- `kb.list_collections(filters?) -> [KB {name, version, pinned?, flows?}]` (FR-6)
- `kb.compose_flow(flow_id, params?) -> {results, citations[]}` (FR-6)

*APIs use simplified shared state for MVP, with service interfaces for testability. Schema versioning via serde tags.*

## 7. State Management: MVP Simplified Approach

State management follows a pragmatic MVP approach with clear upgrade path to full actor system post-MVP.

### Table 1: Overview of Scopes and Storage

| Scope Name              | Number of Fields/Key Elements | What's in Scope (FR) | Location | Storage (SQL vs. In-Memory) | Reason & Sync Flow |
|-------------------------|------------------------------|----------------------|----------|-----------------------------|--------------------|
| **Global Backend State** | 8-10 fields (lean AppState, caps) | Tools (FR-1), KB Packs (FR-2), Pipelines (FR-3), Schedules (FR-4), Flows (FR-6), Settings (FR-10), Recent Logs/Metrics (FR-8 buffer ~100), Loading/Errors (FR-11). | Backend (StateManager Actors) | **SQL Persistent**: Metadata/history (app_meta.db), critical events (events.db ACID). **In-Memory Runtime**: Active (mpsc actors, ring buffer; cap ~10MB, auto-flush). | Durability/backup (FR-10); fast ops (FR-11). Sync: Load SQL → In-Memory (paginated); Mutate → Delta + SQL batch (1s). |
| **Shared Mirrored State** | 5-7 fields (subset paginated) | KB Packs (FR-2), Runs (FR-3.4), Schedules/Flows (FR-4/6), Metrics/Logs (FR-8 ~50), Errors (FR-11). | Both (Backend owns; Frontend NgRx) | **SQL Persistent**: Aggregated (eval scores FR-3.1.8). **In-Memory Runtime**: Recent (frontend ephemeral). | Trends persistent; real-time in-memory. Sync: Delta push (Tauri events) → NgRx; Pull paginated. |
| **Local Frontend State** | 4-6 signals (ephemeral) | UI Filters/Search (FR-9), Temp Data (FR-9 wizards), Selected Items (FR-2.5), Optimistic (FR-11). | Frontend (Angular Signals) | **In-Memory Runtime**: Signals (auto-reset). | UI-reactive only. Sync: Computed from shared; Optimistic → Backend confirm. |

### Table 2: Storage & Synchronization Process

| Flow Step | Description | Components | Storage | Example (FR) |
|-----------|-------------|------------|---------|--------------|
| **Initialization** | Load persistent to in-memory. | Manager → SqlService → State Actors. | SQL read paginated → Populate actors. | Load KB versions (FR-2) → In-memory cap 50. |
| **Read** | Scoped/filtered/paginated. | Modules/UI → State Actors mpsc. | In-memory priority; SQL fallback. | Get KB health (FR-2.4) → Actor read; Paginate logs (FR-8). |
| **Mutation** | Change state. | Logic → State.mutate(delta). | Actor mpsc write → Async SQL batch (events.db if critical). | RunAdd (FR-3.4) → In-memory → Persist. |
| **Delta Sync (Internal)** | Share changes. | State emits broadcast. | Event bus (in-memory). | RunAdd → KB health update (FR-2.4). |
| **Delta Sync (External)** | Push UI/MCP. | State → Tauri events/streams (debounce). | Delta from in-memory → Mirror. | Metrics (FR-8) → NgRx update. |
| **Persistence & Cleanup** | Persist/prune. | State → SqlService + Storage. | Batch to SQL (WAL); Prune quotas. | Logs retention (FR-8) → SQL critical, JSONL non-critical prune >30d. |
| **Recovery/Undo** | Rollback/replay. | State replay from SQL events.db. | Query events → Re-mutate actors. | Eval fail (FR-3.1.8) → Reverse delta. |

## 8. State Structure Diagram

AppState structure with storage mapping; actors per domain, multi-sinks logging.

```mermaid
graph TD
  AppState["AppState Actors (Global Backend - In-Memory Runtime)"]
  AppState --> Tools["Tools Actor FR-1"]
  AppState --> KBPacks["KB Packs Actor FR-2"]
  AppState --> Pipelines["Pipelines Actor FR-3"]
  AppState --> Schedules["Schedules Actor FR-4"]
  AppState --> Flows["Flows Actor FR-6"]
  AppState --> Settings["Settings FR-10"]
  AppState --> RecentLogs["Recent Logs Buffer Cap 100 FR-8"]
  AppState --> Metrics["Metrics Actor HashMap FR-8"]
  AppState --> Loading["Loading FR-11"]
  AppState --> Errors["Errors FR-11"]

  subgraph SQL["SQL Database (Persistent)"]
    Tools -.-> ToolsSQL["Tools Table (app_meta.db)"]
    KBPacks -.-> KBPacksSQL["KB Table"]
    Pipelines -.-> PipelinesSQL["Pipeline/Run Tables FR-3.4"]
    Schedules -.-> SchedulesSQL["Schedule Table"]
    Flows -.-> FlowsSQL["Flow Table"]
    Settings -.-> SettingsSQL["Settings Table"]
    RecentLogs -.-> LogsSQL["Critical Events Table (events.db ACID)"]
    Metrics -.-> MetricsSQL["Aggregated (app_meta.db)"]
    Errors -.-> ErrorsSQL["Diagnostics (events.db)"]
  end

  subgraph LocalFS["LocalFS (Semi-Persistent)"]
    KBPacks -.-> PacksFiles["ZIP Packs FR-6"]
    Pipelines -.-> ArtifactsFiles["Run Artifacts FR-3"]
    RecentLogs -.-> LogsFiles["Non-Critical JSONL + Rotation FR-8"]
  end

  subgraph Shared["Shared Mirrored (NgRx Ephemeral)"]
    KBPacks -.-> NgRxKBs["EntityState<KB>"]
    Pipelines -.-> NgRxRuns["EntityState<Run>"]
    RecentLogs -.-> NgRxLogs["LogEntry[] Buffer"]
    Metrics -.-> NgRxMetrics["HashMap P50/P95"]
    Errors -.-> NgRxErrors["Alerts"]
  end

  subgraph Local["Local Frontend (Signals Ephemeral)"]
    NgRxKBs -.-> FilteredKBs["Computed KB[] FR-9"]
    NgRxLogs -.-> SearchFilter["Search Term"]
    NgRxErrors -.-> TempData["Wizard Temp FR-9"]
    NgRxRuns -.-> SelectedRun["Selected ID"]
  end

  %% Sync
  AppState -.->|"Async Batch (Critical ACID)"| SQL
  AppState -.->|"mpsc Batched (Non-Critical)"| LocalFS
  AppState -.->|"Emit Deltas"| Modules["Modules e.g., KB/Orch"]
  AppState -.->|"Tauri Events/Streams Debounce"| Shared
  Shared -.->|"Computed"| Local
  Local -.->|"Dispatch Mutate"| AppState
```

- **Explanation**: Actors in-memory load from SQL (paginated); mutations batch to SQL (critical) or JSONL (non-critical). Artifacts in LocalFS. Shared/local ephemeral.

## 9. State Flow Diagram (Lifecycle & Sync with Storage)

State flow from init to mutate/persist; actor mpsc, multi-sinks.

```mermaid
sequenceDiagram
    participant Manager as Manager
    participant StateMgr as StateManager (Actors mpsc)
    participant Modules as Modules (KB/Orch)
    participant SQL as SqlService (app_meta/events.db)
    participant UI as UI (Tauri IPC)
    participant MCP as MCP

    Note over Manager: Startup: Load to Actors (Paginated)
    Manager->>SQL: Query paginated (e.g., recent KBs limit 50)
    SQL-->>Manager: Data
    Manager->>StateMgr: Populate actors (in-memory cap)

    Note over Modules: Read (mpsc Priority, Fallback)
    Modules->>StateMgr: get_state(scope="kbs?limit=20")
    StateMgr->>StateMgr: Actor mpsc read (filtered in-memory)
    alt Miss/Historical
        StateMgr->>SQL: Paginated query
        SQL-->>StateMgr: Data → Update actor buffer
    end
    StateMgr-->>Modules: Partial state

    Note over Modules: Mutate (mpsc First, Persist Back)
    Modules->>StateMgr: mutate(StateDelta::RunAdd)
    StateMgr->>StateMgr: Actor mpsc write (apply delta, emit broadcast)
    StateMgr-->>Modules: Result
    alt Critical (ACID)
        StateMgr->>SQL: Batch insert events.db (WAL durable, jitter retry)
    else Non-Critical
        StateMgr->>LocalFS: Append JSONL (rotation)
    end

    Note over StateMgr: Internal Sync (mpsc/Event Bus)
    StateMgr->>Modules: Broadcast event (in-memory)

    Note over StateMgr: External Sync (Delta)
    StateMgr->>UI: Emit "state_delta" (debounce)
    UI-->>StateMgr: Mirror update
    StateMgr->>MCP: RPC proxy (read in-memory)

    Note over StateMgr: Persistence & Cleanup
    StateMgr->>SQL: Batch persist (debounce 1s, vacuum 30d)
    StateMgr->>LocalFS: Prune JSONL quotas

    Note over All: Recovery/Undo (SQL events.db)
    UI->>StateMgr: 'undo(event_id)'
    StateMgr->>SQL: Query events (paginated)
    StateMgr->>StateMgr: Replay mutate actors
    StateMgr-->>UI: Updated delta
```

### Flow Notes
- **Lifecycle**: Load (SQL → Actors in-memory) → Read (mpsc priority) → Mutate (write + persist multi-sink) → Sync (delta emit) → Persist/Cleanup (batch/prune).
- **Internal**: Modules inject StateManager, broadcast for notify (in-memory).
- **External**: UI pulls paginated, pushes delta (debounce); MCP RPC proxy.
- **Resilience**: Async back, event sourcing from SQL events.db (FR-9), error mutate (FR-11).
- **Efficiency**: Scoped reads, delta <1KB, cache (S4) 80% hits; buffer auto-flush.

## 10. Implementation Strategy

### MVP Implementation (Phase 1)
- **Foundation**: Tauri v2 structure with Manager composition root, simplified shared state, JSON subprocess communication
- **Core Services**: SQLite/Diesel + LanceDB with async traits for DI and testability
- **Performance Target**: Benchmark retrieval <100ms with criterion, focus on core RAG flows first
- **Testing**: Start with unit tests per service, integration tests for end-to-end flows

### Post-MVP Optimization (Phase 2+)
- **State Upgrade**: Migrate to full actor-based StateManager with mpsc channels and event sourcing
- **Communication**: Upgrade to UDS/bincode for performance-critical embedding operations
- **Advanced Features**: Full sandbox, circuit breakers, layered caching with generation invalidation
- **Monitoring**: P50/P95 metrics, distributed tracing, comprehensive logging

### Development Approach
- **Start Simple**: Proven patterns (Arc<RwLock>, async traits, Tauri v2 structure)
- **Future-Proof**: Clear interfaces and upgrade paths for complex features
- **Performance**: Profile early, optimize bottlenecks incrementally
- **Security**: Basic process isolation for MVP, comprehensive sandbox post-MVP