# Core Design for RAG Studio

## 1. Architecture Overview & Process Boundaries

RAG Studio is a local-first, secure, high-performance desktop application built on Tauri and Rust, designed to meet both functional (FR) and non-functional (NFR) requirements in SRS/SDD. The Manager acts as the composition root, managing DI services (SQLite, LanceDB, PyO3, StateManager). MCP (Multi-tool Control Plane) runs in a subprocess for sandboxing and hot-swap, communicating via Outbound RPC (UDS/Axum with mTLS). Centralized logging uses tracing, supporting real-time UI and event sourcing. State management is handled by a dedicated StateManager service, serving as the single source of truth for global state (e.g., KB packs, pipelines, runs), injected into modules for read/write access and delta-based synchronization.

### Overview Diagram

```mermaid
flowchart LR
  subgraph SVC["DI Services (in-process, Manager-owned pools, Hot-Reload Config)"]
    S1["SqlService (SQLite/Diesel)<br>(Metadata, Config, Migrations, Backup, WAL Mode Async)"]
    S2["VectorDbService (LanceDB embedded/file, Async Writes)<br>(Embeddings, ANN Search, BM25 Integration)"]
    S3["StorageService<br>(LocalFS/ZIP Packs, Quotas 1-5GB, Auto-Prune)"]
    S4["CacheService<br>(Memory/Redis-local, TTL Eviction, Query Caching)"]
    S5["Auth/SecretService (ring crate, mTLS for RPC)"]
    S6["EmbeddingService (PyO3/Sentence-Transformers, Async FFI + Rust Fallback)"]
    S7["FlowService (Composition of Tools/KB/Pipelines, FR-6 Flows)"]
    S8["StateManager (Arc<RwLock<AppState>>, Event Bus for Deltas)<br>(Global State: KBs/Runs/Logs, FR-2/3/8)"]
  end
  subgraph P0["Main Process: Manager (Composition Root)"]
    direction TB
    A1["UI Adapter / API Gateway (Tauri IPC, Async Commands)"]
    A2["Orchestrator / Scheduler (Tokio-based, Semaphores for Concurrency)"]
    A3["Event & Log Router (tracing + JSONL sink, Event Sourcing for Undo/Redo)"]
    A4["KB Module<br>(Read/Write API, Versioning, Citations, Flow Composition)"]
    A5["Outbound RPC Server<br>(UDS/Axum with mTLS, Circuit Breaker for Resilience)"]
    SVC
  end
  subgraph P1["Subprocess: MCP Module (Optional In-Process Mode for Low-Latency)"]
    direction TB
    M1["Tool Registry & Handlers<br>(behavior-driven, Dynamic Bindings)"]
    M2["JSON-Schema Validation & Limits (Fuzz-Resistant)"]
    M3["Dispatcher (Parallel Dispatch for Hybrid Calls)"]
    M4["OutboundPort Client<br>(UDS/Axum Client, Local Cache for Frequent Queries)"]
    M5["Transports:<br>MCP stdio (required)<br>HTTP /invoke (optional, air-gapped block)"]
    M6["Logging Adapter<br>(tracing → Outbound Port, Structured Spans)"]
  end
  UI["Angular UI (Tauri WebView, Real-Time Updates via IPC Streams)"] -- Tauri IPC Async Streams --> A1
  C["IDE/Agent/Client (MCP Clients)"] -- MCP stdio --> M5
  M5 --> M3
  M3 --> M1
  M3 -- needs data --> M4
  M4 -- Outbound RPC UDS and mTLS --> A5
  A5 --> A4
  A4 --> S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8
  M6 -- Events and Logs Structured JSON --> A3
  A2 --> A4
  A1 --> A4
  A3 --> S3
```

### Key Points
- **Manager:** Composition root, initializes/injects DI services (S1-S8), manages pools (SQLite/LanceDB/PyO3/StateManager), supports config hot-reload (TOML via notify crate).
- **MCP:** Isolated subprocess (stdio, seccomp/AppArmor), hot-swap (AC-1), optional in-process mode (config: low_latency=true). Communicates via UDS/Axum with mTLS; accesses state indirectly via RPC to StateManager.
- **State Management:** StateManager (S8) is the centralized service for global state (AppState struct based on SDD §4.1), using Arc<RwLock<AppState>> for thread-safe access and broadcast channels for internal events. Modules read/write via injected StateManager; deltas are emitted for UI/MCP sync.
- **Logging:** Centralized tracing-subscriber, JSONL sink, redaction filters, event sourcing for undo/redo (FR-9).
- **UI:** Angular WebView, async IPC streams for wizards/drag-drop (FR-3/9), real-time logs/dashboard (FR-8).

## 2. Retrieval Flow: MCP `doc.search` → KB (Hybrid Search with Rerank & Citations)

The retrieval flow processes RAG queries (`doc.search`), combining semantic (LanceDB ANN) and lexical (BM25/tantivy), with rerank, mandatory citations, and caching. StateManager provides filtered KB state (e.g., versions FR-2.2) for pre-retrieval filtering.

### Retrieval Flow Diagram

```mermaid
sequenceDiagram
    participant Client as IDE/Agent
    participant MCP as MCP Subprocess
    participant ORPC as Outbound RPC Server (Manager)
    participant KB as KB Module (in-process)
    participant EMB as EmbeddingService (PyO3 Async)
    participant SQL as SqlService (SQLite Async WAL)
    participant VDB as VectorDbService (LanceDB Async)
    participant CACHE as CacheService
    participant LOG as Log Router (tracing)
    participant STATE as StateManager (S8)

    Client->>MCP: invoke tool `doc.search` {q, topK, filters?}
    MCP->>MCP: validate input (JSON-Schema), limits (tracing span)
    MCP->>ORPC: call op=`kb.hybrid_search` {collection, query, top_k, filters (product/version/semverRange)}
    ORPC->>KB: kb.hybrid_search(...)
    KB->>STATE: get_state(scope="kbs")  // Read filtered KB state (versions/pinning FR-2.2)
    STATE-->>KB: kb_packs (delta/filtered)
    KB->>SQL: filter/ACL/version pinning (semverRange from state, atomic transaction, no cross-version mix)
    KB->>CACHE: check cache hit for query (local TTL cache)
    alt Cache Hit
        CACHE-->>KB: cached results
    else Cache Miss
        KB->>EMB: embed query → query_vec (Async PyO3 FFI, Rust fallback if timeout)
        Note over KB,EMB: In-process EMB preferred, Rust (candle) for speed
        EMB-->>KB: query_vec
        par Vector Search & BM25 Parallel
            KB->>VDB: vector search (LanceDB ANN async) → candidates
            KB->>SQL: BM25 lexical search (tantivy integrated, async) → candidates
        and
            Note over KB,VDB: Parallel tokio::join! for <100ms merge
        end
        KB->>KB: merge/score candidates (weighted hybrid)
        alt No results
            KB->>KB: controlled broaden filters/backfill trigger (async queue, log warning)
        end
        KB->>EMB: rerank candidates (PyO3 cross-encoder async batch) → topN (default 6-8)
        EMB-->>KB: reranked
        KB->>SQL: enrich snippets/citations (join chunk/doc, mandatory citations with license)
        KB-->>ORPC: results [{title, snippet, citation, meta, score, confidence?}]
        ORPC-->>MCP: results...
        KB->>CACHE: store results (TTL based on confidence)
        KB->>STATE: mutate(StateDelta::MetricsUpdate { latency: 150.0, hit_rate: 0.9 })  // Update state metrics FR-8
    end
    MCP->>MCP: validate output schema (citations required, no citation → no answer policy, default on)
    MCP-->>Client: hits + citations (standard rag.search format)
    MCP->>LOG: emit events (invoke.received/completed, spans for P50/P95 latency, hit rate)
```

### Notes
- **Hybrid Retrieval:** Combines BM25 (tantivy) + Vector (LanceDB ANN), pre-filtering (FR-5.3), rerank (FR-5.2), mandatory citations (FR-5.4), backfill on no-results (FR-5.5).
- **State Integration:** KB Module reads from StateManager for KB state (e.g., versions FR-2.2); mutates metrics post-retrieval (FR-8 P50/P95). Delta updates ensure efficiency.
- **Performance:** Parallel vector/BM25 (tokio::join!), local cache (MCP), async PyO3 FFI (pyo3-async) + Rust fallback (candle), atomic transactions, configurable Top-N (SRS §13.2).
- **Observability:** Tracing spans for P50/P95 latency, hit rate (FR-8); state mutations logged via event bus.

## 3. Ingest & Commit Flow: ETL → KB (Write Path with Delta & Eval)

The ingest flow handles the ETL pipeline (fetch/parse/chunk/embed/index/eval/pack), supporting delta-only updates, versioning, and rollback/undo. StateManager tracks runs, metrics, and errors for consistency.

### Ingest Flow Diagram

```mermaid
sequenceDiagram
  participant ETL as Ingestion/ETL Module (Pipeline Orchestrator)
  participant ORCH as Orchestrator/Scheduler (Tokio, Retry/Backoff)
  participant KB as KB Module
  participant SQL as SqlService (SQLite Async)
  participant VDB as VectorDbService (LanceDB Async)
  participant EMB as EmbeddingService (PyO3 Async Batch)
  participant CACHE as CacheService
  participant STORE as StorageService (LocalFS)
  participant LOG as Log Router (tracing)
  participant STATE as StateManager (S8)

  ORCH->>STATE: mutate(StateDelta::RunAdd { status: "starting" })  // Track run FR-3.4
  ORCH->>KB: begin_commit(collection, version, semverRange, label) (async transaction)
  KB->>SQL: create commit (state=pending, fingerprint for delta, WAL async)
  ETL->>STORE: fetch/parse/normalize/chunk/annotate blobs (prebuilt ops: FS/web allow-list/PDF/code, parallel tokio)
  alt Delta-only update
    KB->>STATE: get_state(scope="kbs")  // Read fingerprints for delta FR-2.3
    STATE-->>KB: kb_packs
    SQL->>SQL: compare fingerprints → changed chunks only (cache skip unchanged)
  end
  ETL->>CACHE: check embed cache hits → skip re-embed
  ETL->>EMB: batch embed changed chunks (PyO3 async, Rust fallback, GIL release)
  EMB-->>ETL: embeddings (with timeout fallback)
  ETL->>KB: upsert_documents(commit_id, docs[] metadata) (batch async)
  KB->>SQL: write doc metadata (product/version, atomic)
  ETL->>KB: upsert_chunks(commit_id, doc_id, chunks[] + embeddings) (buffered)
  KB->>SQL: write chunk records
  KB->>VDB: async upsert vectors to staging index (LanceDB, batched writes)
  KB->>VDB: async index BM25 (tantivy, parallel)
  ETL->>KB: eval (async smoke tests: recall@k, size/drift warnings, quality alerts FR-8)
  alt Eval Fail
    KB->>LOG: emit warning (drift > threshold → pause schedule FR-4)
    KB->>STATE: mutate(StateDelta::Error { run_id: "...", error: "drift high" })  // Track FR-11
  end
  ORCH->>KB: finalize_commit(commit_id) (rollback if fail)
  KB->>SQL: mark commit (state=active), create version (pinning support, event source for undo)
  KB->>VDB: promote staging → active index (alias "current", zero-copy)
  KB-->>ORCH: success (health metrics: size, embedder version, eval scores)
  ORCH->>STATE: mutate(StateDelta::RunUpdate { id: "...", status: "completed", metrics: eval_scores })  // Update state FR-3.4/8
  ORCH->>LOG: emit kb.commit.completed (with eval results, retention policy)
  Note over KB,LOG: Backfill on missed runs/config changes (async queue, FR-3.4), undo via event replay (FR-9)
```

### Notes
- **Pipeline:** Prebuilt ops (FR-3.1: fetch/parse/chunk/embed/index/eval/pack), delta-only (FR-2.3), versioning (FR-2).
- **State Integration:** Orchestrator/KB read/write via StateManager (e.g., track run status FR-3.4, update metrics FR-8). Mutations emit deltas for UI sync and internal events (e.g., pause schedule on eval fail FR-4).
- **Performance:** Async WAL (SQLite/VDB), buffered upserts, async EMB + cache skip, parallel fetch/parse (tokio), quotas auto-prune (SDD §13.3).
- **Resilience:** Rollback/undo via event sourcing (FR-9/11), eval alerts (FR-8.3).

## 4. DI & Wiring (Service Integration and Dependency Management)

Manager initializes and injects DI services into KB/Orchestrator, MCP only uses Outbound Client for data access. StateManager (S8) is injected for centralized read/write, ensuring consistency across modules.

### DI & Wiring Diagram

```mermaid
graph TB
  subgraph "Manager (Composition Root)"
    direction TB
    Cfg["App Config (TOML: dataDir, airGapped, defaults; Hot-Reload via notify)"]
    S1["SqlService Impl (SQLite/Diesel Async)<br />(Pools, Migrations, Backup/Restore, WAL)"]
    S2["VectorDbService Impl (LanceDB Async)<br />(Embedded File Indexes, Zero-Copy Promote)"]
    S3["StorageService Impl (LocalFS/ZIP + ring checksums, Quotas/Auto-Prune)"]
    S4["CacheService Impl (Memory, TTL; Air-Gapped Only, Invalidation Hooks)"]
    S5["Auth/SecretService Impl (ring encryption, mTLS Cert Rotation)"]
    S6["EmbeddingService Impl (PyO3 Async Bundle, GIL Release + Rust Fallback)"]
    S7["FlowService Impl (Composition: Tools+KB+Pipelines, Checksum Validation FR-6)"]
    S8["StateManager (Arc<RwLock<AppState>>, Event Bus)<br />(Global State Mutations/Deltas, FR-2/3/8)"]
    KBMod["KB Module (Async Traits: Inject S1-S8, Circuit Breaker for Calls)"]
    ORPC["Outbound RPC Server (Axum/UDS + mTLS, Middleware: Limits/Auth/Retry)"]
    ORCH["Orchestrator/Scheduler (Tokio Timers/Semaphores, Circuit Breaker for ETL)"]
    LOGR["Log Router (tracing-subscriber, JSONL Sink, Event Sourcing for Undo)"]
    SUP["Supervisor<br />(tokio::spawn MCP, Backoff/Health Ping, Graceful Shutdown)"]
    UI["Tauri IPC Adapter (Async Commands + Streams for Angular Real-Time)"]
  end

  subgraph "MCP (Subprocess, Optional In-Process)"
    direction TB
    Tools["Tool Registry + Handlers (Dynamic Register/Activate, Permission Prompts)"]
    Ctx["ExecCtx<br />(Outbound Client, Default-Deny FS/NET/PROCESS + Escalation)"]
    ORPCC["MCP OutboundPort Client (Axum UDS, Local Cache Layer)"]
    LOGM["tracing Layer → Outbound Port (Push Events, Redaction Filters)"]
  end

  %% DI injections
  Cfg --> S1
  Cfg --> S2
  Cfg --> S3
  Cfg --> S4
  Cfg --> S5
  Cfg --> S6
  Cfg --> S7
  Cfg --> S8
  S1 --> KBMod
  S2 --> KBMod
  S3 --> KBMod
  S4 --> KBMod
  S5 --> KBMod
  S6 --> KBMod
  S7 --> KBMod
  S8 --> KBMod
  S8 --> ORCH
  S8 --> LOGR
  KBMod --> ORPC
  ORCH --> KBMod
  LOGR --> S3
  SUP --> MCP
  Tools --> Ctx
  Ctx --> ORPCC
  ORPCC --> ORPC
  LOGM --> ORPC
  UI --> KBMod
  UI --> ORCH
  %% Comments
  %% Hot-reload via notify crate for config updates
  %% Circuit breaker (tower) for resilience
  %% Async traits (async_trait) for non-blocking DI
  %% StateManager injected for shared read/write
```

### Principles
- **DI Services:** Manager initializes S1-S8 from TOML config (hot-reload via notify), async traits (async_trait), circuit breaker (tower) for resilience. StateManager (S8) is injected into modules (e.g., KBMod, ORCH) for centralized access.
- **State Interaction:** Modules read via `state_mgr.get_state(scope)` (async RwLock read, filtered for efficiency); mutate via `state_mgr.mutate(delta)` (write lock, emit internal events/broadcast channel). Deltas ensure delta-only sync (e.g., RunAdd FR-3.4).
- **MCP:** Subprocess or in-process, default-deny permissions (FS/NET/PROCESS), escalation prompts via IPC (FR-1.7). MCP accesses state indirectly via RPC proxy to StateManager (e.g., kb.hybrid_search reads kb_packs).
- **Logging:** Tracing-subscriber, JSONL sink, redaction filters, event sourcing (FR-9). State mutations trigger log emits (e.g., via broadcast subscribe).
- **Tauri:** Async IPC commands/streams, Angular real-time (FR-3/9). State deltas pushed via events (e.g., "state_delta") for UI mirror.

## 5. Boundaries & Implementation Decisions

### Subprocess
- **MCP:** stdio, sandbox (seccomp/AppArmor), hot-swap (AC-1), optional in-process mode (low_latency=true). State access via RPC to StateManager (no direct hold).
- **Heavy Tasks:** Async PyO3 offload (>10k chunks), Rust fallback (candle/rust-bert).

### In-Process Modules
- **KB/Embedding/Flow:** Async calls (SQL/LanceDB/PyO3), circuit breaker (tower). Interact with StateManager for KB state read (e.g., versions FR-2.2) and mutate (e.g., health update FR-2.4).
- **Orchestrator/Scheduler:** Tokio concurrency (semaphores FR-4.5), retry/backoff (FR-4.2), dry-run/resume (FR-3.3/11). Mutate runs/schedules via StateManager (e.g., RunAdd FR-3.4), subscribe events for triggers (e.g., backfill FR-3.4).
- **Outbound RPC Server:** Axum UDS + mTLS (rustls), middleware for auth/limits/air-gapped. Proxies state queries/mutations (e.g., MCP calls → StateManager read/write).
- **Log Router:** Tracing spans (P50/P95/hit rate FR-8), event sourcing (FR-9). Subscribes StateManager events for log/metrics (e.g., commit.completed FR-3).

### DI Services (Manager-owned, Hot-Reloadable)
- **SqlService:** SQLite WAL async (rusqlite async), migrations/backups (FR-10); auto-vacuum for retention (30d/1GB SDD §13.4). Persists AppState components (e.g., runs FR-3.4).
- **VectorDbService:** LanceDB async writes/promote (zero-copy), BM25 (tantivy); swappable (config: vdb=lancedb|qdrant-local). StateManager caches index metadata.
- **StorageService:** LocalFS quotas (1-5GB KB SDD §13.3), auto-prune; ZIP checksums (ring). Stores packs/artifacts; StateManager tracks sizes.
- **EmbeddingService:** PyO3 async (pyo3-async) + cache; Rust fallback (candle) if timeout (>5s). StateManager logs embedder version (FR-2.4).
- **Auth/Secrets:** Ring encryption/redaction; mTLS cert rotation (auto-gen if air-gapped). Secures state mutations (e.g., permissions FR-1.7).
- **Cache:** Memory TTL (dashmap), invalidation on commits. Layers StateManager reads (e.g., frequent KB queries FR-2.5).
- **FlowService:** Compose tools/KB/pipelines, checksum validation (FR-6/AC-5). Mutates flows in StateManager (e.g., FlowAdd).
- **StateManager:** Arc<RwLock<AppState>> for global state (SDD §4.1), broadcast channel for events. Read: async filtered get; Write: mutate delta + emit (internal/UI/MCP). Event sourcing for undo (FR-9), persistence via SqlService.

### Tauri-Specific
- Portable <100MB (bundle PyO3/candle); tray mode with graceful shutdown; IPC streams for wizards (Angular CDK FR-3/9); cross-OS path normalization (PathBuf). State deltas via events/streams for real-time UI sync.

## 6. KB API Contract Used by MCP

- `kb.hybrid_search(collection, query_vec/text, top_k, filters: {product?, version?, semverRange?}, cache_ttl?) -> [Hit {chunk_id, score, snippet, citation, meta, confidence?}]` (FR-5)
- `kb.answer(query, filters?, model?) -> {text, citations[], confidence?}` (rag.answer, async LLM via PyO3/candle)
- `kb.get_document(doc_id, range?) -> Document {metadata, chunks?, license?}`
- `kb.resolve_citations(chunk_ids) -> [Citation {title, anchor/URL, license?, version?}]` (FR-5.4)
- `kb.stats(collection/version) -> Stats {size, versions, embedder_version, health, eval_scores?}` (FR-2.4)
- `kb.list_collections(filters?) -> [KB {name, version, pinned?, flows?}]` (FR-6)
- `kb.compose_flow(flow_id, params?) -> {results, citations[]}` (FR-6, async composition)

*API write/maintenance (begin/finalize_commit async, gc/compact, backfill queue) for ETL/Orchestrator (FR-3/4), enriched error codes (FR-8). APIs proxy through StateManager for state reads/writes (e.g., versions from AppState).*

## 7. Implementation Recommendations
- **MVP:** Manager + KB + MCP subprocess (AC-1-3), SQLite/Diesel + LanceDB + PyO3/candle + StateManager, benchmark retrieval (<100ms) with criterion.
- **Tauri:** Async commands (tauri::command), tray mode (tauri-plugin-system-tray), cross-OS testing (PathBuf).
- **Performance:** Tokio semaphores, bincode UDS, cache TTL (dashmap), async PyO3 (pyo3-async). StateManager deltas for low-overhead sync.
- **Security/Testing:** Fuzz RPC (cargo-fuzz), audit PyO3/StateManager mutations, block outbound reqwest (air-gapped).
- **Next Steps:** Prototype retrieval/ingest flows (cargo bench), validate eval metrics (recall@k), implement FlowService (FR-6), test state consistency (e.g., concurrent mutations).