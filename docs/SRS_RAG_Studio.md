# 1. Purpose & Scope

**Purpose**
Provide a “studio” application that lets users **build and operate a personal RAG** quickly with strong data safety. The app exposes **a single MCP server** that provides tools to external AI models/IDEs.
**Core philosophy**: local-first, no-code/low-code for ingest/index, clear versioning, citations required.

**Scope**

* Create/activate/deactivate **dynamic tools** served via MCP.
* Create/manage/version **knowledge bases (KBs)** via UI.
* Design and run **ingest/index pipelines** using **prebuilt operations**, either manually or on a schedule.
* **Share** individual parts (tool/KB/pipeline) or the **entire process** (flow) via import/export.
* Secure local data, support **air-gapped** mode.

---

# 2. Terminology

* **RAG**: Retrieval-Augmented Generation.
* **MCP**: Model Context Protocol; a standard for IDEs/AIs to call “tools.”
* **Tool (dynamic tool)**: an MCP endpoint registered **dynamically**, acting as a façade over `rag.search`/`rag.answer` with defaults (product/version/filters).
* **Knowledge Base (KB)**: content that has been ingested → chunked → embedded → indexed; has a **version** and a **manifest**.
* **Pipeline**: an ordered set of steps (fetch → parse → normalize → chunk → annotate → embed → index → eval → pack).
* **Flow**: a composition of multiple parts (tool, KB, pipeline, schedule) into a complete process.
* **Rerank**: post-retrieval re-ranking to improve accuracy.
* **Backfill**: ingest/index catch-up when data/runs are missing or configuration changes.

---

# 3. User Roles & Integrations

* **Owner (local machine user)**: full control to create/edit/schedule, toggle air-gapped mode.
* **Collaborator (future optional)**: can import/export, run pipelines, view logs.
* **MCP Clients**: external IDEs/AIs/assistants that call tools via MCP (no direct filesystem access unless granted).

---

# 4. System Overview (Conceptual)

* **User Interface (UI Studio)**: manage Tool/KB/Pipeline/Flow, view logs, monitor schedules.
* **Core**: registry, pipeline orchestrator, scheduler, pack manager, policies & permissions.
* **RAG Runtime**: retrieval layer (BM25 + Vector), rerank, answer generation with citations; applies KB/version filters **before** retrieval.
* **MCP Server (single)**: exposes tool sets `rag.*`, `kb.*`, `admin.*`; supports **dynamic** tool registration/unregistration.

> Note: functional description only; not tied to specific tech/UI framework/DB.

---

# 5. Functional Requirements

## FR-1. Single MCP Server & Dynamic Tools

1. **One** MCP server serves all tools to AI/IDEs.
2. **Create dynamic tools** via UI: set endpoint name, choose type (search/answer), bind a KB & defaults (product/version/filters/k).
3. **Activate/Deactivate** tools **without restarting** the server.
4. **Tool catalog**: show status (ACTIVE/INACTIVE), description, permissions (FS/NET/PROCESS), KB/version constraints.
5. **Edit** tools (change defaults, icon/label), **delete** tools.
6. **Endpoint conflict handling** (no duplicates; suggest alternatives).
7. **Per-tool permissions**: configure filesystem, network, process access; default is “deny.”

## FR-2. Knowledge Base (KB) Management

1. **Create KB** via wizard: pick a template (e.g., web docs, PDF folder, code repo), set `product`, `version`, `semverRange`.
2. **Versioning**: each KB has a clear version; allow **pinning** a version per “workspace profile” (user project profile).
3. **Update/Rollback** KB; support **delta-only** (re-embed only changed parts).
4. **Health & status**: view size, fingerprint, embedding model version, index metrics.
5. **Tool ↔ KB linkage**: warn when a tool points to a missing KB or wrong version.
6. **Import/Export** KB (`.kbpack`): includes manifest, indexes, licenses, checksum; verify compatibility before use.

## FR-3. Ingest/Index Pipeline (Prebuilt Operations)

1. **Library of prebuilt operations**, at minimum:

   * Fetch (local file/folder; web sources in an allow-list; code repos).
   * Parse (markdown/html/pdf/text/code).
   * Normalize (cleaning, link normalization, drop navigation).
   * Chunk (by headings & code blocks, with token overlap).
   * Annotate (metadata: product/version/domain/semverRange).
   * Embed (vector generation; with cache).
   * Index (BM25 + Vector).
   * Eval (smoke tests: recall\@k; size; drift warnings).
   * Pack (write manifest & index artifacts).
2. **Pipeline Designer UI**: drag-and-drop, parameter forms, view YAML manifest, **Validate** configuration.
3. **Run pipeline**:

   * **Run now**, **Dry-run** (no writes), **Resume** from failed step.
   * **Backfill**: fill missing data (time/config based).
4. **Run history**: persist logs/artifacts, eval results, status.
5. **Templates & presets**: save/library of sample pipelines; clone & tweak quickly.

## FR-4. Scheduler

1. Create schedules using **cron/rrule**; choose timezone (default to user timezone).
2. **Retry/backoff** on failure; cap retries; error notification policy.
3. **Manually run** a defined job; **pause/resume** schedules.
4. **Exclusion rules**: holidays, maintenance windows.
5. **Concurrency limits** per pipeline/KB.

## FR-5. Retrieval Runtime & Answering

1. **Hybrid retrieval**: combine BM25 and Vector; merge candidates.
2. **Rerank** candidates; select **Top-N** (default 6–8) for answering.
3. **Filter by KB/version** **before** retrieval & rerank; do not mix versions.
4. **Citation policy**: always include **citations** (title + anchor/URL); optional “no citation → no answer.”
5. **“No results” handling**: controlled backfilling (slightly broaden sources/strategy) then rerank.
6. **Standard response formats** for `rag.search` (snippets + citations + metadata) and `rag.answer` (text + citations + confidence).

## FR-6. Import/Export & Sharing

1. **Sharing formats**:

   * `.toolpack` (tool + bindings + permissions + icon + manifest).
   * `.kbpack` (KB + index + manifest + license).
   * `.pipepack` (pipeline + notes).
   * `.flowpack` (entire flow: component catalog + order + checksum).
2. **Compatibility checks** on import (embedding model, schema, license); suggest re-embedding if needed.
3. **No data leakage**: do not auto-send content externally during import/export.

## FR-7. Security & Privacy

1. **Air-gapped mode**: block outbound network; allow only local operations when enabled.
2. **Per-tool/operation permissions**: FS/NET/PROCESS; default “deny-all,” with permission prompts when exceeding scope.
3. **Secret management**; log **redaction**.
4. **Licensing**: display/record source licenses; warn if unclear.

## FR-8. Observability & Quality

1. **Logs** with levels; **event bus** (pipeline run, schedule run, tool register).
2. **Dashboard**: query stats (P50/P95 latency), hit rate, recall\@k (if eval enabled).
3. **In-app alerts** for job/schedule failures; optional notifications.

## FR-9. User Experience

1. Quick wizards: **Tool** (3 steps), **KB** (templates), **Pipeline** (drag-and-drop).
2. Search/filter across Tool/KB/Pipeline/Flow catalogs.
3. **Undo/redo** for pipeline edits.
4. **Accessibility**: keyboard/screen-reader support; switchable UI language.

## FR-10. Configuration & Administration

1. **Workspace profiles**: auto-detect project traits to suggest version pinning.
2. **Global settings**: data directory, network policy, resource limits, pipeline defaults.
3. **Backup/restore** the registry & packs (export snapshot).

## FR-11. Error Handling & Recovery

1. On pipeline failure, stop at the failed step; allow **fix and resume**.
2. MCP failures: self-recover without losing registered tools; avoid endpoint duplication.
3. Transactional rollback for import/export and tool registration.

---

# 6. Non-functional Requirements

* **Performance**:

  * Typical query (`search k≈100 → rerank → top-8`) P95 < 300 ms (on a personal machine, medium KB).
  * MCP startup < a few seconds with ≤ 50 dynamic tools.

* **Reliability**:

  * Scheduler & pipelines support retry/backoff; durable state.
  * Package integrity via checksum/signature.

* **Security & Privacy**:

  * Air-gapped enforced; default-deny permissions; secrets protected; logs redacted.

* **Operability & Maintainability**:

  * Create/activate/deactivate tools **without** restarting MCP.
  * Easy configuration backup/restore.

* **Portability & Extensibility**:

  * OS-agnostic; swappable modules (embedding, index, rerank) without UI changes.

* **MCP Compliance**:

  * MCP surface follows the spec; unified schemas for inputs/outputs.

---

# 7. Data Model (Conceptual)

* **Tool**: `{ id, name, endpoint, status, description, permissions, createdAt, updatedAt }`
* **ToolBinding**: `{ toolId, baseOp("rag.search"|"rag.answer"), defaults, constraints }`
* **KB Pack**: `{ id, name, version, manifest, indexes, fingerprint, license, createdAt }`
* **Pipeline**: `{ id, name, spec (declares steps & params), templates?, lastRunAt }`
* **Schedule**: `{ id, pipelineId, cron/rrule, timezone, enabled, lastStatus }`
* **Run**: `{ id, pipelineId, startedAt, endedAt, status, logsRef, artifactsRef, metrics }`
* **Flow**: `{ id, name, parts:[{kind:"tool|kb|pipeline", refId, order}], checksum }`
* **Settings**: `{ dataDir, networkPolicy, airGapped, defaults, workspaceProfiles[] }`

> Note: this is **logical schema**, not prescribing storage/DB format.

---

# 8. External Interfaces (MCP – Logical)

* `rag.search(q, product?, version?, k?, filters?) → { results:[{title, snippet, citation, meta, score}] }`
* `rag.answer(q, product?, version?) → { text, citations:[…], confidence? }`
* `kb.list() → { packs:[{name, version, status, size, embedderVersion}] }`
* `kb.install(source) / kb.update(name,to) / kb.pin(product,version) / kb.status(name)`
* `admin.tool.register(endpoint, baseOp, defaults) / admin.tool.activate(endpoint) / admin.tool.deactivate(endpoint)`

**General requirement**: every response includes **clear error codes/diagnostics**; every state-changing action must be **event-logged**.

---

# 9. Sample Workflows

**A) Create an Angular tool from an existing KB**

1. Choose Tool template → specify KB `angular@14.x` → set endpoint `tool.angular.search/answer`.
2. Create → tool appears as INACTIVE → Activate → ready for IDE/AI to call.

**B) Build a new KB from a PDF folder**

1. Pipeline Designer: drag-and-drop fetch(fs) → parse(pdf) → normalize → chunk → annotate → embed → index → pack.
2. Run now → KB `mydocs@1.0.0` shows up in the catalog; can be pinned & used to create a personal tool.

**C) Weekly update schedule + backfill**

1. Create schedule for Sunday 03:00; enable retry/backoff.
2. If a run is missed or the embedder changes → backfill to sync the index.

---

# 10. Acceptance Criteria

* **AC-1**: Create/activate/deactivate dynamic tools **without restarting** MCP; endpoints appear/disappear immediately to MCP clients.
* **AC-2**: `rag.search/answer` **honors pinned versions**; no cross-version mixing; always returns citations.
* **AC-3**: Pipelines support **Run now** and **Dry-run**; logs & artifacts are saved; can resume from a failed step.
* **AC-4**: Scheduler runs on time (per configured timezone), has retry/backoff; can be paused/resumed.
* **AC-5**: Import `.kbpack/.toolpack/.pipepack/.flowpack` verifies checksum; warns on compatibility; usable immediately if compatible.
* **AC-6**: With air-gapped enabled → all outbound operations are blocked; local queries still work.
* **AC-7**: Dashboard shows query P50/P95 latency; run & error history is retained.

---

# 11. Release Roadmap

* **MVP (mandatory)**: FR-1, FR-2 (basic), FR-3 (minimal ops), FR-4 (simple cron), FR-5 (search/answer + citations), FR-6 (KB import), FR-7 (air-gapped), AC-1 → AC-5.
* **Phase 2**: flowpack, advanced eval, cross-version API diffs, quality alerts, pipeline undo/redo, multi-profile.
* **Phase 3**: Collaborator role, LAN sharing, out-of-app alerts, community template hub.

---

# 12. Risks & Mitigations

* **Version drift** → enforce version filters in retrieval & rerank; warn if out-of-scope.
* **Privacy breaches** → default-deny, one-click air-gapped, log redaction.
* **Complex pipeline failures** → stepwise resume, dry-run, backfill configuration.
* **Pack portability** → mandatory checksum & manifest; compatibility checks before use.

---

# 13. Open Questions

1. Should the **default** “no citation → no answer” policy be enabled?
2. Default **Top-K/Top-N** thresholds, and can users tune them per KB?
3. Target **maximum KB size** for the first release (MB/GB) to guide UI limits & warnings?
4. Default **retention** for logs/artifacts (days/GB)?
5. Do we need a **rights protection mode** (pack locking) when exporting to others?
