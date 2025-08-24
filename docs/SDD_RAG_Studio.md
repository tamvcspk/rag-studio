# Software Design Document for RAG Studio Application (Angular UI)

## 1. Introduction

### 1.1 Purpose

This Software Design Document (SDD) provides a comprehensive design blueprint for the RAG Studio application, a local-first, no-code/low-code tool designed to enable users to build and operate personal Retrieval-Augmented Generation (RAG) systems. The application serves as a “studio” for managing knowledge bases (KBs), pipelines, tools, and flows, with a focus on data security, versioning, and mandatory citations. It exposes functionalities via a single Model Context Protocol (MCP) server for integration with external AI models or IDEs.

The design is derived from the provided requirement specification, incorporating functional requirements (FR-1 to FR-11), non-functional requirements (NFRs), data models, external interfaces, sample workflows, acceptance criteria, release roadmap, risks, and open questions. It integrates the suggested technology stack to ensure portability, lightweight operation, one-click startup, and headless mode via tray icon. To optimize performance, key backend components have been migrated from Python to Rust, leveraging Rust for speed and concurrency in core operations while preserving Python's strengths in AI integration (e.g., embedding and reranking) via PyO3 embeddings.

### 1.2 Scope

The application covers:

* Dynamic tool creation and management via MCP.
* KB creation, versioning, and management.
* Pipeline design and execution for ingest/indexing.
* Scheduling, retrieval runtime with reranking and citations.
* Import/export for sharing components.
* Security features including air-gapped mode.
* Observability, user experience enhancements, and error handling.

*Out-of-scope:* Multi-user collaboration (future phase), external API integrations beyond MCP, or cloud dependencies.

### 1.3 References

* Requirement Specification (as provided).
* Suggested Tech Stack: Tauri for framework, Angular for frontend, Rust with PyO3 for backend (migrated from Python/FastAPI), SQLite for storage, FAISS/Sentence-Transformers (via Python) for RAG components.
* Open Questions: Defaults for citation policy, Top-K/N thresholds, KB size limits (target 1–5GB), log retention (30 days/1GB), and pack locking (via cryptography if enabled).

### 1.4 Assumptions and Dependencies

* Runs on personal machines (Windows/macOS/Linux) with no internet required post-setup (air-gapped support).
* Users have basic hardware (CPU for embedding/indexing; no GPU assumed).
* Dependencies bundled for portability (e.g., via tauri-plugin-python and PyO3 for Python integration).

---

## 2. System Overview

### 2.1 High-Level Architecture

The system follows a modular, layered architecture:

* **UI Layer (Studio):** Web-based interface for management, built with Angular and rendered via Tauri’s WebView.
* **Core Layer:** Handles registry, orchestration, scheduling, and pack management using Rust backend with PyO3 for AI interop.
* **Runtime Layer:** RAG retrieval with hybrid search (BM25 + Vector), reranking, and answer generation.
* **MCP Server Layer:** Single Axum-based server (migrated from FastAPI) exposing endpoints for tools.
* **Storage Layer:** SQLite for metadata/registry; file-based for indexes/packs.

The app is portable (single executable/folder), starts with one click, and supports headless mode (MCP/scheduler run in background via tray icon). Backend migration to Rust unifies the stack, reducing inter-process communication and enhancing performance.

### 2.2 Key Components

* **UI Studio:** Wizards, drag-and-drop designers, logs viewer (Angular).
* **Core:** Registry (SQLite via Diesel), Orchestrator (Tokio-based, migrated from concurrent.futures), Scheduler (custom Tokio timers, migrated from APScheduler), Pack Manager (ZIP-based).
* **RAG Runtime:** FAISS for vectors (via Python/PyO3), custom Rust BM25 (migrated from rank_bm25), Sentence-Transformers for embedding/rerank (via Python/PyO3).
* **MCP Server:** Axum endpoints (`rag.*`, `kb.*`, `admin.*`).
* **Tray Icon:** Tauri plugin for background operation (show/hide UI, status monitoring).

### 2.3 Deployment View

* Single executable (built with Tauri): < 100MB (with bundled Python libs), portable across OS.
* Data stored in relative folder (e.g., `./data` for KBs, indexes, logs).
* Headless mode: On UI close, app minimizes to tray; server persists.
* Python Integration: Bundled via tauri-plugin-python and PyO3, using a minimal .venv for AI libs, ensuring no external Python dependency.

---

## 3. Architectural Design

### 3.1 Design Patterns

* **MVC:** Angular (View), Axum (Controller), SQLite/models (Model).
* **Modular/Plugin-based:** RAG components (embedding, index, rerank) are swappable without UI changes (config-based), with Python AI parts called via PyO3.
* **Event-Driven:** Scheduler and logs use pub-sub/events for observability (Tokio channels).
* **Transactional:** Import/export and tool registration use atomic operations (SQLite transactions via Diesel).

### 3.2 Technology Stack Integration

* **Framework:** Tauri for desktop portability, one-click start, tray icon (`tauri-plugin-system-tray`); headless via hidden WebView; tauri-plugin-python for PyO3 integration.
* **Frontend:** Angular; diagramming/designer via Angular ecosystem (e.g., Angular CDK DragDrop + `ngx-graph`/`ngx-flowchart`), component library **PrimeNG** (comprehensive UI components with accessibility).
* **Backend:** Rust 1.80+ with Axum (async server, migrated from FastAPI), Tokio (concurrency/orchestration), PyO3 (Python embedding for AI); bundled via tauri-plugin-python.
* **Database:** SQLite with Diesel (Rust ORM for Tool, KB Pack, Pipeline, etc.).
* **RAG:** Sentence-Transformers (e.g., `all-MiniLM-L6-v2`) for embed/rerank (Python via PyO3); FAISS for vectors (Python via PyO3); custom Rust BM25 (e.g., using tantivy crate) for lexical.
* **Orchestrator/Scheduler:** Tokio-based pipelines (resume/dry-run); custom Tokio timers for cron/rrule + retry/backoff (migrated from APScheduler).
* **Packs:** ZIP + YAML manifests; `ring` crate for checksums (Rust).
* **Security:** Air-gapped via outbound-block hooks; default-deny permissions via Axum middleware.

### 3.3 Data Flow

* **User → UI → Backend:** API calls via Tauri IPC to Rust core.
* **Pipeline Execution:** Fetch → Parse → Normalize → Chunk → Annotate → Embed (PyO3 call) → Index (PyO3 call) → Eval → Pack (with backfill on changes).
* **Retrieval:** Query → Filter (KB/version) → Hybrid Search (Rust BM25 + PyO3 FAISS) → Rerank (PyO3) → Answer + Citations.
* **Headless:** Scheduler runs jobs without UI; tray notifies errors.

---

## 4. Data Design

### 4.1 Data Models

Based on the conceptual schema:

```json
Tool: {
  "id": "...", "name": "...", "endpoint": "...", "status": "...",
  "description": "...", "permissions": "...", "createdAt": "...", "updatedAt": "..."
}
ToolBinding: {
  "toolId": "...", "baseOp": "rag.search|rag.answer", "defaults": {...}, "constraints": {...}
}
KB Pack: {
  "id": "...", "name": "...", "version": "...", "manifest": {...},
  "indexes": {...}, "fingerprint": "...", "license": "...", "createdAt": "..."
}
Pipeline: {
  "id": "...", "name": "...", "spec": "YAML steps", "templates": "...?", "lastRunAt": "..."
}
Schedule: {
  "id": "...", "pipelineId": "...", "cron/rrule": "...", "timezone": "...",
  "enabled": true, "lastStatus": "..."
}
Run: {
  "id": "...", "pipelineId": "...", "startedAt": "...", "endedAt": "...",
  "status": "...", "logsRef": "...", "artifactsRef": "...", "metrics": {...}
}
Flow: {
  "id": "...", "name": "...", "parts": [{"kind": "tool|kb|pipeline", "refId": "...", "order": 0}], "checksum": "..."
}
Settings: {
  "dataDir": "...", "networkPolicy": "...", "airGapped": true,
  "defaults": {...}, "workspaceProfiles": [...]
}
```

### 4.2 Storage

* **Metadata/Registry:** SQLite DB file (portable, accessed via Diesel in Rust).
* **Indexes/Packs:** File-based (FAISS index files via PyO3, ZIP packs).
* **Logs/Artifacts:** JSON/text files; retention policy configurable (default 30 days/1GB).

### 4.3 Data Integrity

* Checksums (Rust `ring` crate) for packs.
* Versioning: `semverRange` in KB; delta updates via fingerprint comparison.
* Backup: Export snapshot (FR-10) as ZIP of DB + files.

---

## 5. Component Design

### 5.1 FR-1 — MCP Server & Dynamic Tools

* **Endpoints:** Axum routes (e.g., `/admin/tool/register`, migrated from FastAPI).
* **Dynamic Registration:** In-memory cache + DB persistence; activate/deactivate without restart (hot reload).
* **Conflict Handling:** Unique endpoint checks; suggested alternatives.

### 5.2 FR-2 — KB Management

* **Wizard:** **PrimeNG Stepper** to select template, set version.
* **Versioning:** DB support for rollback/delta (re-embed changed chunks via PyO3).
* **Import/Export:** ZIP handler with manifest validation.

### 5.3 FR-3 — Pipeline Ingest/Index

* **Ops Library:** Prebuilt Rust funcs for non-AI ops; Python via PyO3 for AI-dependent ops.
  * *Fetch:* local FS / web allow-list / code repos
  * *Parse:* markdown/html/pdf/text/code libs
  * *Normalize, Chunk, Annotate, Embed (PyO3), Index (PyO3), Eval, Pack*
* **Designer:** Angular-based visual designer (CDK DragDrop + `ngx-graph`/custom); YAML spec output; validation.
* **Execution:** Tokio-based orchestrator runs steps (migrated from concurrent.futures); dry-run (no writes); checkpointed resume.

### 5.4 FR-4 — Scheduler

* Custom Tokio timers for background jobs; concurrency via semaphores (migrated from APScheduler).
* Exclusion rules (holidays/maintenance) via custom filters.
* Retry/backoff with capped attempts; manual run; pause/resume.

### 5.5 FR-5 — Retrieval Runtime

* Hybrid: merge Rust BM25 (migrated from rank_bm25) + PyO3 FAISS candidates.
* Rerank: cross-encoder model (PyO3).
* Citations: mandatory; configurable “no citation → no answer” (default on).

### 5.6 FR-6 — Import/Export

* Formats: `.toolpack`, `.kbpack`, `.pipepack`, `.flowpack`.
* Compatibility checks (embedder version, schema, license).

### 5.7 FR-7 — Security

* Air-gapped: block outbound (e.g., via Axum hooks).
* Default-deny permissions (FS/NET/PROCESS) with escalation prompts.
* Secrets encrypted at rest (optional Rust `ring` crate).

### 5.8 FR-8 to FR-11 — Observability, UX, Config, Error Handling

* **Logs:** Rust `tracing` + redaction.
* **Dashboard:** PrimeNG Charts for P50/P95 latency, hit rate, recall@k.
* **Errors:** Transactional rollback; pipeline resume.
* **UX:** Wizards, search/filter; **undo/redo via a history service (e.g., NgRx store snapshotting)**.

### 5.9 Performance Projections from Migration

| Feature       | Current (Python)          | Migrated (Rust)       | Expected Gain                          |
|---------------|---------------------------|-----------------------|----------------------------------------|
| MCP Server   | 13% CPU, 55MB mem        | 3% CPU, 3.5MB mem    | 4-10x resource efficiency, 6-30% faster requests |
| Orchestrator | 3-4x slower than Rust equiv. | Tokio-based          | 3-4x faster concurrency, lower memory  |
| Scheduler    | Higher overhead           | Tokio timers         | 2-100x faster for events, better scaling |
| BM25         | Slow (rank_bm25 baseline) | Native impl.         | 200-500x faster scoring (inspired by BM25S gains) |

---

## 6. User Interface Design

* **Layout:** Sidebar (Tools/KBs/Pipelines/Flows); main panel for editors/logs.
* **Wizards:** **PrimeNG Stepper** for guided flows.
* **Pipeline Designer:** Angular canvas with drag-and-drop nodes; side panel parameter editors; YAML sync view.
* **Tray Menu:** “Open UI”, “Status”, “Stop”.
* **Accessibility:** **PrimeNG accessibility features** (ARIA/keyboard/screen-reader compliance).

---

## 7. Security Design

* **Authentication:** None (local owner); future collaborator roles.
* **Permissions:** Per-tool/operation; dialog prompts for escalations.
* **Data Privacy:** No outbound in air-gapped; logs redacted.
* **Licenses:** Stored in manifests; warnings on import.

---

## 8. Non-Functional Design

* **Performance:** Query < 300 ms P95 (optimized via Rust migrations); startup < few seconds (Tauri).
* **Reliability:** Retry/backoff in scheduler; durable storage.
* **Portability:** Relative paths; bundled deps (including Python via PyO3).
* **Maintainability:** Modular components; avoid OS-specific code.
* **Scalability:** Single-user; KB limit 1–5GB (UI warnings).

---

## 9. Integration and Interfaces

* **MCP Endpoints:** Per spec (e.g., `rag.search` returns JSON with citations, served via Axum).
* **External:** MCP clients only; no direct FS access unless permitted.
* **Python Interop:** AI calls (e.g., embedding) via PyO3 from Rust; bundled .venv for libs like Sentence-Transformers.

---

## 10. Workflows and Use Cases

### Sample A — Tool Creation

1. UI wizard → create tool record.
2. Activate endpoint → exposed immediately via MCP (Axum).

### Sample B — KB from PDF

1. Designer: fetch(fs) → parse(pdf) → normalize → chunk → annotate → embed (PyO3) → index (PyO3) → pack.
2. Run pipeline (Tokio) → KB appears in catalog → pin & use for tools.

### Sample C — Scheduling

1. Create schedule (cron/rrule) → Tokio job.
2. Backfill on missed runs or embedder change.

---

## 11. Risks and Mitigations

* **Version Mismatch:** Enforce filters; surface warnings.
* **Privacy Breaches:** Default-deny; air-gapped; redaction.
* **Pipeline Failures:** Resume/dry-run; rich logs.
* **Pack Portability:** Checksums/manifests; compatibility validation.
* **Migration Risks:** Validate PyO3 interop; benchmark performance gains.

---

## 12. Roadmap Alignment

* **MVP:** Core FR-1 to FR-7; portable build with tray and Rust migrations.
* **Phase 2:** Flows, advanced eval, undo; full PyO3 optimization.
* **Phase 3:** Collaborators, templates/community hub.

---

## 13. Appendix — Open Questions Resolution

1. **Citation policy default:** On.
2. **Top-K/N:** Configurable per KB (default K=100, N=6–8).
3. **KB Size:** Target 1–5GB.
4. **Retention:** 30 days / 1GB by default.
5. **Pack Locking:** Optional via cryptographic signatures.