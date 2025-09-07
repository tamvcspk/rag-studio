# Improved Core Design for RAG Studio

## 1. Architecture Overview & Process Boundaries

RAG Studio is a local-first, secure, high-performance desktop application built on Tauri and Rust, designed to meet both functional (FR) and non-functional (NFR) requirements in SRS/SDD. The Manager acts as the composition root, managing DI services (SQLite, LanceDB, PyO3). MCP (Multi-tool Control Plane) runs in a subprocess for sandboxing and hot-swap, communicating via Outbound RPC (UDS/Axum with mTLS). Centralized logging uses tracing, supporting real-time UI and event sourcing.

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
        M1["Tool Registry &amp; Handlers<br>(behavior-driven, Dynamic Bindings)"]
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
    A4 --> S1 & S2 & S3 & S4 & S5 & S6 & S7
    M6 -- Events and Logs Structured JSON --> A3
    A2 --> A4
    A1 --> A4
    A3 --> S3
```

### Key Points
- **Manager:** Composition root, initializes/injects DI services (S1-S7), manages pools (SQLite/LanceDB/PyO3), supports config hot-reload (TOML via notify crate).
- **MCP:** Isolated subprocess (stdio, seccomp/AppArmor), hot-swap (AC-1), optional in-process mode (config: low_latency=true). Communicates via UDS/Axum with mTLS.
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

    Client->>MCP: invoke tool `doc.search` {q, topK, filters?}
    MCP->>MCP: validate input (JSON-Schema), limits (tracing span)
    MCP->>CACHE: check cache hit for query (local TTL cache)
    alt Cache Hit
        CACHE-->>MCP: cached results
    else Cache Miss
        MCP->>EMB: embed query → query_vec (Async PyO3 FFI, Rust fallback if timeout)
        Note over MCP,EMB: Prefer in-process EMB, fallback native Rust (e.g., rust-bert) for speed
        EMB-->>MCP: query_vec
        MCP->>ORPC: call op=`kb.hybrid_search` {collection, query_vec, query_text, top_k, filters (product/version/semverRange)}
        ORPC->>KB: kb.hybrid_search(...)
        KB->>SQL: filter/ACL/version pinning (semverRange, atomic transaction, no cross-version mix)
        par Vector Search & BM25 Parallel
            KB->>VDB: vector search (LanceDB ANN async) → candidates
            KB->>SQL: BM25 lexical search (tantivy integrated, async query) → candidates
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
        MCP->>CACHE: store results (TTL based on confidence)
    end
    MCP->>MCP: validate output schema (citations required, no citation → no answer policy, default on)
    MCP-->>Client: hits + citations (standard rag.search format)
    MCP->>LOG: emit events (invoke.received/completed, spans for P50/P95 latency, hit rate)
```

### Notes
- **Hybrid Retrieval:** Combines BM25 (tantivy) + Vector (LanceDB ANN), pre-filtering (FR-5.3), rerank (FR-5.2), mandatory citations (FR-5.4), backfill on no-results (FR-5.5).
- **Performance:** Parallel vector/BM25 (tokio::join!), local cache (MCP), async PyO3 FFI (pyo3-async) + Rust fallback (candle), atomic transactions, configurable Top-N (SRS §13.2).
- **Observability:** Tracing spans for P50/P95 latency, hit rate (FR-8).

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

  ORCH->>KB: begin_commit(collection, version, semverRange, label) (async transaction)
  KB->>SQL: create commit (state=pending, fingerprint for delta, WAL async)
  ETL->>STORE: fetch/parse/normalize/chunk/annotate blobs (prebuilt ops: FS/web allow-list/PDF/code, parallel tokio)
  alt Delta-only update
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
  end
  ORCH->>KB: finalize_commit(commit_id) (rollback if fail)
  KB->>SQL: mark commit (state=active), create version (pinning support, event source for undo)
  KB->>VDB: promote staging → active index (alias "current", zero-copy if possible)
  KB-->>ORCH: success (health metrics: size, embedder version, eval scores)
  ORCH->>LOG: emit kb.commit.completed (with eval results, retention policy)
  Note over KB,LOG: Backfill on missed runs/config changes (async queue, FR-3.4), undo via event replay (FR-9)
```

### Notes
- **Pipeline:** Prebuilt ops (FR-3.1: fetch/parse/chunk/embed/index/eval/pack), delta-only (FR-2.3), versioning (FR-2).
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
    KBMod["KB Module (Async Traits: Inject S1-S7, Circuit Breaker for Calls)"]
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
  S1 --> KBMod
  S2 --> KBMod
  S3 --> KBMod
  S4 --> KBMod
  S5 --> KBMod
  S6 --> KBMod
  S7 --> KBMod
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
```

### Principles
- **DI Services:** Manager initializes S1-S7 from TOML config (hot-reload via notify), async traits (async_trait), circuit breaker (tower) for resilience.
- **MCP:** Subprocess or in-process, default-deny permissions (FS/NET/PROCESS), escalation prompts via IPC (FR-1.7).
- **Logging:** Tracing-subscriber, JSONL sink, redaction filters, event sourcing (FR-9).
- **Tauri:** Async IPC commands/streams, Angular real-time (FR-3/9).

## 5. Boundaries & Implementation Decisions

### Subprocess
- **MCP:** stdio, sandbox (seccomp/AppArmor), hot-swap (AC-1), optional in-process mode (low_latency=true).
- **Heavy Tasks:** Async PyO3 offload (>10k chunks), Rust fallback (candle/rust-bert).

### In-Process Modules
- **KB/Embedding/Flow:** Async calls (SQL/LanceDB/PyO3), circuit breaker (tower).
- **Orchestrator/Scheduler:** Tokio concurrency (semaphores FR-4.5), retry/backoff (FR-4.2), dry-run/resume (FR-3.3/11).
- **Outbound RPC Server:** Axum UDS + mTLS (rustls), middleware for auth/limits/air-gapped.
- **Log Router:** Tracing spans (P50/P95/hit rate FR-8), event sourcing (FR-9).

### DI Services (Manager-owned)
- **SqlService:** SQLite WAL async (rusqlite async), migrations/backups (FR-10), auto-vacuum (30d/1GB SDD §13.4).
- **VectorDbService:** LanceDB async writes/promote (zero-copy), BM25 (tantivy), swappable (vdb=lancedb|qdrant-local).
- **StorageService:** LocalFS quotas (1-5GB), auto-prune, ZIP checksums (ring).
- **EmbeddingService:** PyO3 async (pyo3-async), Rust fallback (candle) if timeout (>5s).
- **Auth/Secrets:** Ring encryption/redaction, mTLS cert rotation.
- **Cache:** Memory TTL (dashmap), invalidation on commits.
- **FlowService:** Compose tools/KB/pipelines, checksum validation (FR-6/AC-5).

### Tauri-Specific
- Portable <100MB (bundle PyO3/candle), tray mode (graceful shutdown), IPC streams (Angular CDK FR-3/9), cross-OS path normalization (PathBuf).

### DI Services (Manager-owned, Hot-Reloadable)
- **SqlService:** SQLite WAL async (rusqlite async), migrations/backups (FR-10); auto-vacuum for retention (30d/1GB SDD §13.4).
- **VectorDbService:** LanceDB async writes/promote (zero-copy), BM25 (tantivy); swappable (config: vdb=lancedb|qdrant-local).
- **StorageService:** LocalFS quotas (1-5GB KB SDD §13.3), auto-prune; ZIP checksums (ring).
- **EmbeddingService:** PyO3 async (pyo3-async) + cache; Rust fallback (candle) if timeout (>5s).
- **Auth/Secrets:** Ring encryption/redaction; mTLS cert rotation (auto-gen if air-gapped).
- **Cache:** Memory TTL (dashmap), invalidation on commits.
- **FlowService:** Compose parts (tools/KB/pipelines), validate checksums/compatibility (FR-6/AC-5).

### Tauri-Specific
- Portable <100MB (bundle PyO3/candle); tray mode with graceful shutdown; IPC streams for wizards (Angular CDK FR-3/9); cross-OS path normalization (PathBuf).

## 6. KB API Contract Used by MCP

- `kb.hybrid_search(collection, query_vec/text, top_k, filters: {product?, version?, semverRange?}, cache_ttl?) -> [Hit {chunk_id, score, snippet, citation, meta, confidence?}]` (FR-5)
- `kb.answer(query, filters?, model?) -> {text, citations[], confidence?}` (rag.answer, async LLM via PyO3/candle)
- `kb.get_document(doc_id, range?) -> Document {metadata, chunks?, license?}`
- `kb.resolve_citations(chunk_ids) -> [Citation {title, anchor/URL, license?, version?}]` (FR-5.4)
- `kb.stats(collection/version) -> Stats {size, versions, embedder_version, health, eval_scores?}` (FR-2.4)
- `kb.list_collections(filters?) -> [KB {name, version, pinned?, flows?}]` (FR-6)
- `kb.compose_flow(flow_id, params?) -> {results, citations[]}` (FR-6, async composition)

*API write/maintenance (begin/finalize_commit async, gc/compact, backfill queue) for ETL/Orchestrator (FR-3/4), enriched error codes (FR-8).*

## 7. Implementation Recommendations
- **MVP:** Manager + KB + MCP subprocess (AC-1-3), SQLite/Diesel + LanceDB + PyO3/candle, benchmark retrieval (<100ms) with criterion.
- **Tauri:** Async commands (tauri::command), tray mode (tauri-plugin-system-tray), cross-OS testing (PathBuf).
- **Performance:** Tokio semaphores, bincode UDS, cache TTL (dashmap), async PyO3 (pyo3-async).
- **Security/Testing:** Fuzz RPC (cargo-fuzz), audit PyO3, block outbound reqwest (air-gapped).
- **Next Steps:** Prototype retrieval/ingest flows (cargo bench), validate eval metrics (recall@k), implement FlowService (FR-6).