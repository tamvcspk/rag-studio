# Core Design for RAG Studio

RAG Studio is a local-first, secure, high-performance desktop application built on Tauri and Rust to meet both functional (FR) and non-functional (NFR) requirements in SRS/SDD. The Manager acts as the composition root, managing DI services (SQLite, LanceDB, PyO3, StateManager). MCP (Multi-tool Control Plane) runs in a subprocess for sandboxing and hot-swap, communicating via Outbound RPC (UDS/Axum with mTLS). Centralized logging uses tracing, supporting real-time UI and event sourcing. State management is handled by StateManager (S8), the single source of truth for global state, with in-memory buffer cap and pagination for large data.

## 1. Architecture Overview and Process Boundaries

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

The retrieval flow processes RAG queries (`doc.search`), combining semantic (LanceDB ANN) and lexical (BM25/tantivy), with rerank, mandatory citations, and caching.

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
        KB->>EMB: rerank candidates (PyO3 cross-encoder async batch) → topN (default 6-8, configurable per KB)
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

The ingest flow handles the ETL pipeline (fetch/parse/chunk/embed/index/eval/pack), supporting delta-only updates, versioning, and rollback/undo.

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

Manager initializes and injects DI services into KB/Orchestrator, MCP only uses Outbound Client for data access.

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

## 7. State Scopes: Quantity, Content, Location, and Storage

State is divided into three scopes to balance persistence (backend SQL/in-memory), reactivity (shared), and UX (local). In-memory buffers are capped (e.g., recent logs ~100 entries), with pagination for historical data and automatic pruning.

### Table 1: Overview of Scopes and Storage

| Scope Name              | Number of Fields/Key Elements | What's in Scope (Based on SDD §4.1 & SRS FR) | Location (Backend/Frontend) | Storage (SQL Persistent vs. In-Memory Runtime) | Reason for Division & Sync Flow |
|-------------------------|------------------------------|---------------------------------------------|-----------------------------|------------------------------------------------|-----------------------------|
| **Global Backend State** (Source of Truth) | 8-10 fields (lean AppState struct, capped buffers) | - Tools (FR-1: active endpoints/bindings).<br>- KB Packs (FR-2: current versions/manifests/health; IDs for historical).<br>- Pipelines (FR-3: active specs/templates; IDs for runs history).<br>- Schedules (FR-4: active cron/rrule/status).<br>- Flows (FR-6: active compositions/checksums).<br>- Settings (FR-10: dataDir/airGapped/profiles).<br>- Recent Logs/Metrics (FR-8: buffer ~100 spans/latency/hit rate/recall@k).<br>- Loading/Errors (FR-11: transient status/diagnostics). | Backend (Rust: StateManager S8) | **SQL Persistent**: Metadata/history (e.g., KB versions FR-2, runs IDs FR-3.4, logs aggregated).<br>**In-Memory Runtime**: Active/need-to-know (Arc<RwLock>, ring buffer for logs; cap ~10MB, auto-flush/prune). | Persistent for durability/backup (FR-10); In-memory for fast operations (e.g., loading FR-11). Sync: Load SQL → In-Memory (on-demand pagination); Mutate → Delta emit + SQL write-back (batch 1s). |
| **Shared Mirrored State** (Real-Time Sync) | 5-7 fields (subset normalized, paginated subsets) | - KB Packs (FR-2: active list/versions/pinned, paginated by search FR-9).<br>- Runs/Pipelines (FR-3: active runs/metrics; paginated history).<br>- Schedules/Flows (FR-4/6: status/compositions).<br>- Metrics/Recent Logs (FR-8: P50/P95/hit rate, buffer ~50 recent logs).<br>- Errors (FR-11: recent for UI alerts). | Both (Backend owns; Frontend mirrors via NgRx Store) | **SQL Persistent**: Aggregated/historical (e.g., eval scores FR-3.1.8, paged logs).<br>**In-Memory Runtime**: Recent/active (e.g., current metrics FR-8; frontend mirror ephemeral, paginated loads). | Persistent for trends; In-memory for real-time (e.g., hit rate FR-8). Sync: Backend delta push (Tauri events) → Frontend NgRx update; Pull scoped/paginated (commands e.g., "logs?page=1"). |
| **Local Frontend State** (UI-Reactive) | 4-6 signals/computed (ephemeral) | - UI Filters/Search (FR-9: search term, filtered KBs/runs).<br>- Temp Data (FR-9: wizard steps, drag-drop buffers for pipelines FR-3).<br>- Selected Items (e.g., selected KB ID for detail view FR-2.5).<br>- Optimistic Temp (FR-11: pending mutations before backend confirm). | Frontend Only (Angular 20: Signals for reactivity) | **SQL Persistent**: None (ephemeral).<br>**In-Memory Runtime**: Signals (in-memory, auto-reset). | UI-reactive only (e.g., search FR-9); No persistence required. Sync: Computed from shared (signals); Optimistic mutate → Backend confirm/rollback. |


### Table 2: Storage & Synchronization Process Between Scopes (Flow)

| Flow Step | Description | Involved Components | Storage Mechanism (SQL vs. In-Memory) | Example (SRS/FR) |
|-----------|-------------|---------------------|---------------------------------------|------------------|
| **Initialization (Load)** | Load persistent data into in-memory state on startup. | Manager → SqlService (S1) → StateManager (S8). | SQL read (Diesel query, paginated) → Populate AppState RwLock (in-memory buffer cap). | Load recent KB packs/versions (FR-2) from metadata tables → In-memory global (cap 50 active). |
| **Read Operation** | Modules/UI read state (scoped/filtered/paginated). | Modules/UI → StateManager (read_guard async). | In-memory RwLock read (fast); Cache (S4) layer; Fallback to SQL if miss (with limit/offset). | KB Module get KB health (FR-2.4) → Read kb_packs from in-memory; Paginate logs (FR-8) from SQL. |
| **Mutation/Write** | Change state (e.g., add KB FR-2). | Business logic (e.g., KB Module) → StateManager.mutate(delta). | In-memory RwLock write (exclusive) → Async write-back to SQL (batch/debounce 1s). | Run pipeline (FR-3) → Mutate RunAdd in-memory (buffer cap) → Persist history to SQL. |
| **Delta Sync (Internal)** | Share changes between modules. | StateManager emits broadcast event (tokio::sync). | Event bus (channel subscribe); No immediate persistence (in-memory only). | Orchestrator completes run → Emit RunAdd (in-memory) → KB Module subscribes to update health (FR-2.4). |
| **Delta Sync (External)** | Push to UI/MCP. | StateManager → Tauri IPC (events/streams). | Delta emit (StateDelta enum, serde_json); In-memory source → Shared mirror. | Mutate metrics (FR-8) → Emit "state_delta" (in-memory) → UI NgRx update (ephemeral). |
| **Persistence & Cleanup** | Persist and prune. | StateManager → SqlService (S1) + StorageService (S3). | Async batch write to SQL (WAL); Auto-prune quotas (S3, cap buffer in-memory). | Logs retention (FR-8) → In-memory buffer (cap 100) → SQL persist → Prune old >30d (SDD §13.4). |
| **Recovery/Undo (FR-9/11)** | Rollback or replay. | StateManager event sourcing (replay deltas). | Replay from SQL logs/events → Re-mutate in-memory (with buffer cap). | Eval fail (FR-3.1.8) → Reverse delta (in-memory) → Persist error to SQL. |


## 8. State Structure Diagram

AppState structure diagram (backend global/in-memory), with storage mapping (SQL persistent vs. in-memory runtime) and scopes.

```mermaid
graph TD
  AppState["AppState RwLock (Global Backend S8 - In-Memory Runtime)"]
  AppState --> Tools["Tools Vec<Tool> FR-1"]
  AppState --> KBPacks["KB Packs Vec<KB> FR-2 Active Only"]
  AppState --> Pipelines["Pipelines Vec<Pipeline> FR-3 Active Specs"]
  AppState --> Schedules["Schedules Vec<Schedule> FR-4 Active"]
  AppState --> Flows["Flows Vec<Flow> FR-6 Active"]
  AppState --> Settings["Settings FR-10"]
  AppState --> RecentLogs["Recent Logs VecDeque<LogEntry> FR-8 Buffer Cap 100"]
  AppState --> Metrics["Metrics HashMap FR-8 Current"]
  AppState --> Loading["Loading HashMap FR-11 Transient"]
  AppState --> Errors["Errors Vec FR-11 Recent"]

  subgraph SQL["SQL Database (Persistent S1)"]
    Tools -.->|"Metadata/History"| ToolsSQL["Tools Table"]
    KBPacks -.->|"Manifests/Versions"| KBPacksSQL["KB Table"]
    Pipelines -.->|"Specs/Runs History"| PipelinesSQL["Pipeline/Run Tables FR-3.4 Paginated"]
    Schedules -.->|"Cron/Status"| SchedulesSQL["Schedule Table"]
    Flows -.->|"Compositions"| FlowsSQL["Flow Table FR-6"]
    Settings -.->|"Configs"| SettingsSQL["Settings Table FR-10"]
    RecentLogs -.->|"Historical Full"| LogsSQL["Logs Table Retention/Paginated"]
    Metrics -.->|"Aggregated Trends"| MetricsSQL["Metrics Table FR-8"]
    Errors -.->|"Diagnostics History"| ErrorsSQL["Errors Table FR-11 Paginated"]
  end

  subgraph LocalFS["LocalFS (S3 Artifacts - Semi-Persistent)"]
    KBPacks -.->|"Packs/Index"| PacksFiles["ZIP Packs FR-6"]
    Pipelines -.->|"Artifacts"| ArtifactsFiles["Run Artifacts FR-3"]
    RecentLogs -.->|"JSONL Sink Full"| LogsFiles["Full Logs FR-8 Pruned"]
  end

  subgraph Shared["Shared Mirrored (NgRx Store Frontend - Ephemeral)"]
    KBPacks -.->|"Delta Sync"| NgRxKBs["EntityState<KB> normalized Active"]
    Pipelines -.->|"Delta"| NgRxRuns["EntityState<Run> FR-3.4 Recent"]
    RecentLogs -.->|"Stream"| NgRxLogs["LogEntry[] Recent Buffer"]
    Metrics -.->|"Event"| NgRxMetrics["HashMap P50/P95"]
    Errors -.->|"Push"| NgRxErrors["string[] Alerts"]
  end

  subgraph Local["Local Frontend (Signals - Ephemeral)"]
    NgRxKBs -.->|"Selector"| FilteredKBs["computed signal KB[] filtered FR-9"]
    NgRxLogs -.->|"Subscribe"| SearchFilter["signal string search term"]
    NgRxErrors -.->|"Effect"| TempData["signal any wizard temp FR-9"]
    NgRxRuns -.->|"Optimistic"| SelectedRun["signal Run selected ID"]
  end

  %% Sync Arrows
  AppState -.->|"Async Write-Back Batch"| SQL
  AppState -.->|"Emit Deltas"| Modules["Modules e.g., KB/Orch"]
  AppState -.->|"Tauri Events/Streams"| Shared
  Shared -.->|"Computed/Effects"| Local
  Local -.->|"Dispatch Mutate"| AppState
```

- **Explanation**: AppState in-memory (runtime, cap buffer) loads scoped/paginated from SQL (persistent) on init; Mutations write-back async. Artifacts in LocalFS (semi-persistent, e.g., packs FR-6). Shared/local frontend is ephemeral (in-memory mirror/signals).


## 9. State Flow Diagram (Lifecycle & Sync with Storage)

State flow diagram from init to mutate/persist, emphasizing SQL vs. in-memory transitions.

```mermaid
sequenceDiagram
    participant Manager as Manager (Composition Root)
    participant StateMgr as StateManager (S8 In-Memory Runtime)
    participant Modules as Modules (KB/Orch)
    participant SQL as SqlService (S1 Persistent)
    participant UI as UI (Tauri IPC)
    participant MCP as MCP (Subprocess)

    Note over Manager: Startup: Load Persistent to In-Memory (Scoped/Paginated)
    Manager->>SQL: Query tables paginated (e.g., recent KBs limit 50, migrations FR-10)
    SQL-->>Manager: Raw data (e.g., KB manifests FR-2 persistent)
    Manager->>StateMgr: Populate AppState RwLock (in-memory buffer cap, e.g., recent logs 100)

    Note over Modules: Read Operation (In-Memory Priority, Paginated Fallback)
    Modules->>StateMgr: get_state(scope="kbs?limit=20") (async read_guard)
    StateMgr->>StateMgr: RwLock read (filtered from in-memory buffer)
    alt Buffer Miss or Historical
        StateMgr->>SQL: Paginated query (limit/offset, e.g., old runs FR-3.4)
        SQL-->>StateMgr: Data → Update in-memory buffer (cap/prune old)
    end
    StateMgr-->>Modules: Partial AppState (in-memory or SQL-paged)

    Note over Modules: Mutate Operation (In-Memory First, SQL Write-Back)
    Modules->>StateMgr: mutate(StateDelta::RunAdd FR-3.4) (async write_guard)
    StateMgr->>StateMgr: RwLock write (apply delta in-memory, emit broadcast event)
    StateMgr-->>Modules: Result (success/error FR-11)
    StateMgr->>SQL: Async batch write-back (e.g., insert Run table persistent, debounce 1s)
    SQL-->>StateMgr: Ack (WAL durable)

    Note over StateMgr: Internal Sync (Event Bus - In-Memory)
    StateMgr->>Modules: Broadcast event (e.g., RunAdd → KB update health FR-2.4 in-memory)
    Modules-->>StateMgr: Subscribe/Handle (loose coupling, no SQL touch)

    Note over StateMgr: External Sync (UI/MCP - Delta from In-Memory)
    StateMgr->>UI: Emit Tauri event "state_delta" (delta-only from in-memory)
    UI-->>StateMgr: Mirror update (NgRx action, ephemeral)
    StateMgr->>MCP: RPC proxy mutate (e.g., kb.stats FR-2.4 read in-memory)
    MCP-->>StateMgr: Indirect access (no direct hold)

    Note over StateMgr: Persistence & Cleanup (SQL Focus)
    StateMgr->>SQL: Periodic batch persist (debounce 1s, e.g., logs FR-8 from in-memory buffer)
    SQL->>StateMgr: Retention prune (auto-vacuum 30d SDD §13.4 persistent)
    StateMgr->>StorageService: Prune artifacts (quotas 1-5GB SDD §13.3 semi-persistent)
    Note over StateMgr: Auto-Flush Buffer (e.g., logs >100 → SQL flush + prune in-memory + cap reset)

    Note over All: Recovery/Undo (FR-9/11 - SQL + In-Memory Replay)
    UI->>StateMgr: Command 'undo(event_id)' (replay reverse delta)
    StateMgr->>SQL: Query event log (persistent sourcing, paginated if large)
    StateMgr->>StateMgr: Replay mutate (update in-memory RwLock)
    StateMgr-->>UI: Emit updated delta (sync mirror from in-memory)
```

### Flow Notes
- **Lifecycle**: Load (SQL persistent, paginated → In-Memory runtime buffer) → Read (In-Memory priority, fallback SQL paginated) → Mutate (Write in-memory + SQL async write-back) → Sync (Delta emit from in-memory) → Persist/Cleanup (SQL batch/prune + in-memory auto-flush).
- **Internal**: Modules inject StateManager (DI Diagram 4), broadcast for notify (in-memory only, fast).
- **External**: UI pulls scoped/paginated (commands), pushes delta (events); MCP RPC proxy (read in-memory).
- **Resilience**: Async write-back (non-blocking), event sourcing (SQL logs for replay FR-9), error mutate (track in in-memory + persist FR-11).
- **Efficiency**: Scoped read (e.g., only "kbs" FR-2.5, in-memory), delta emit (<1KB), cache (S4) for 80% reads; Buffer cap/auto-flush (e.g., logs >100 → SQL) avoids GBs overhead.


## 10. State Structure Diagram

AppState structure diagram (backend global/in-memory), with storage mapping (SQL persistent vs. in-memory runtime) and scopes.

```mermaid
graph TD
  AppState["AppState RwLock (Global Backend S8 - In-Memory Runtime)"]
  AppState --> Tools["Tools Vec<Tool> FR-1"]
  AppState --> KBPacks["KB Packs Vec<KB> FR-2 Active Only"]
  AppState --> Pipelines["Pipelines Vec<Pipeline> FR-3 Active Specs"]
  AppState --> Schedules["Schedules Vec<Schedule> FR-4 Active"]
  AppState --> Flows["Flows Vec<Flow> FR-6 Active"]
  AppState --> Settings["Settings FR-10"]
  AppState --> RecentLogs["Recent Logs VecDeque<LogEntry> FR-8 Buffer Cap 100"]
  AppState --> Metrics["Metrics HashMap FR-8 Current"]
  AppState --> Loading["Loading HashMap FR-11 Transient"]
  AppState --> Errors["Errors Vec FR-11 Recent"]

  subgraph SQL["SQL Database (Persistent S1)"]
    Tools -.->|"Metadata/History"| ToolsSQL["Tools Table"]
    KBPacks -.->|"Manifests/Versions"| KBPacksSQL["KB Table"]
    Pipelines -.->|"Specs/Runs History"| PipelinesSQL["Pipeline/Run Tables FR-3.4 Paginated"]
    Schedules -.->|"Cron/Status"| SchedulesSQL["Schedule Table"]
    Flows -.->|"Compositions"| FlowsSQL["Flow Table FR-6"]
    Settings -.->|"Configs"| SettingsSQL["Settings Table FR-10"]
    RecentLogs -.->|"Historical Full"| LogsSQL["Logs Table Retention/Paginated"]
    Metrics -.->|"Aggregated Trends"| MetricsSQL["Metrics Table FR-8"]
    Errors -.->|"Diagnostics History"| ErrorsSQL["Errors Table FR-11 Paginated"]
  end

  subgraph LocalFS["LocalFS (S3 Artifacts - Semi-Persistent)"]
    KBPacks -.->|"Packs/Index"| PacksFiles["ZIP Packs FR-6"]
    Pipelines -.->|"Artifacts"| ArtifactsFiles["Run Artifacts FR-3"]
    RecentLogs -.->|"JSONL Sink Full"| LogsFiles["Full Logs FR-8 Pruned"]
  end

  subgraph Shared["Shared Mirrored (NgRx Store Frontend - Ephemeral)"]
    KBPacks -.->|"Delta Sync"| NgRxKBs["EntityState<KB> normalized Active"]
    Pipelines -.->|"Delta"| NgRxRuns["EntityState<Run> FR-3.4 Recent"]
    RecentLogs -.->|"Stream"| NgRxLogs["LogEntry[] Recent Buffer"]
    Metrics -.->|"Event"| NgRxMetrics["HashMap P50/P95"]
    Errors -.->|"Push"| NgRxErrors["string[] Alerts"]
  end

  subgraph Local["Local Frontend (Signals - Ephemeral)"]
    NgRxKBs -.->|"Selector"| FilteredKBs["computed signal KB[] filtered FR-9"]
    NgRxLogs -.->|"Subscribe"| SearchFilter["signal string search term"]
    NgRxErrors -.->|"Effect"| TempData["signal any wizard temp FR-9"]
    NgRxRuns -.->|"Optimistic"| SelectedRun["signal Run selected ID"]
  end

  %% Sync Arrows
  AppState -.->|"Async Write-Back Batch"| SQL
  AppState -.->|"Emit Deltas"| Modules["Modules e.g., KB/Orch"]
  AppState -.->|"Tauri Events/Streams"| Shared
  Shared -.->|"Computed/Effects"| Local
  Local -.->|"Dispatch Mutate"| AppState
```

- **Explanation**: AppState in-memory (runtime, cap buffer) load scoped/paginated từ SQL (persistent) on init; Mutations write-back async. Artifacts ở LocalFS (semi-persistent, e.g., packs FR-6). Shared/local frontend ephemeral (in-memory mirror/signals).

## 11. Implementation and Recommendations

- **MVP:** Manager + KB + MCP subprocess (AC-1-3), SQLite/Diesel + LanceDB + PyO3/candle + StateManager, benchmark retrieval (<100ms) with criterion.
- **Tauri:** Async commands (tauri::command), tray mode (tauri-plugin-system-tray), cross-OS testing (PathBuf).
- **Performance:** Tokio semaphores, bincode UDS, cache TTL (dashmap), async PyO3 (pyo3-async). StateManager deltas for low-overhead sync.
- **Security/Testing:** Fuzz RPC (cargo-fuzz), audit PyO3/StateManager mutations, block outbound reqwest (air-gapped).
- **Next Steps:** Prototype retrieval/ingest flows (cargo bench), validate eval metrics (recall@k), implement FlowService (FR-6), test state consistency (e.g., concurrent mutate FR-11).