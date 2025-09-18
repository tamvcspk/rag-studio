-- Initial schema for RAG Studio MVP
-- This creates all tables in a single database (app_meta.db)
-- Event sourcing tables are included for preparation

-- Configuration and Settings
CREATE TABLE settings (
    id INTEGER PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base Metadata
CREATE TABLE knowledge_bases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'building', 'error')),
    embedder_model TEXT NOT NULL,
    chunk_size INTEGER NOT NULL DEFAULT 512,
    chunk_overlap INTEGER NOT NULL DEFAULT 50,
    description TEXT,
    metadata JSON,
    health_score REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pinned_version INTEGER,
    UNIQUE(name, version)
);

-- Document Metadata
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    kb_id TEXT NOT NULL,
    title TEXT NOT NULL,
    source_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    license_info TEXT,
    metadata JSON,
    chunk_count INTEGER DEFAULT 0,
    size_bytes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
);

-- Document Chunks Metadata
CREATE TABLE document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    kb_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    token_count INTEGER,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    UNIQUE(document_id, chunk_index)
);

-- Pipeline Definitions
CREATE TABLE pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    config JSON NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'draft')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pipeline Run Tracking
CREATE TABLE pipeline_runs (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL,
    kb_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    metrics JSON,
    artifacts JSON,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id),
    FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id)
);

-- Tool Registry
CREATE TABLE tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    config JSON NOT NULL,
    schema JSON NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schedule Definitions
CREATE TABLE schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    cron_expression TEXT NOT NULL,
    pipeline_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    last_run DATETIME,
    next_run DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
);

-- Flow Definitions
CREATE TABLE flows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    definition JSON NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Database Schema Versioning
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Critical Event Log (MVP: in app_meta.db, Production: separate events.db)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    event_data JSON NOT NULL,
    metadata JSON,
    trace_id TEXT,
    user_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT NOT NULL
);

-- Aggregate Snapshots for Performance (MVP: basic usage)
CREATE TABLE aggregate_snapshots (
    aggregate_id TEXT PRIMARY KEY,
    aggregate_type TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    snapshot_data JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Event Processing Checkpoints (MVP: preparation only)
CREATE TABLE event_checkpoints (
    processor_name TEXT PRIMARY KEY,
    last_processed_sequence INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_documents_kb_id ON documents(kb_id);
CREATE INDEX idx_documents_hash ON documents(content_hash);
CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_kb_id ON document_chunks(kb_id);
CREATE INDEX idx_chunks_hash ON document_chunks(content_hash);
CREATE INDEX idx_pipeline_runs_pipeline_id ON pipeline_runs(pipeline_id);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX idx_pipeline_runs_started_at ON pipeline_runs(started_at);
CREATE INDEX idx_schedules_next_run ON schedules(next_run);
CREATE INDEX idx_kb_status ON knowledge_bases(status);
CREATE INDEX idx_kb_name_version ON knowledge_bases(name, version);

-- Event Sourcing Indexes
CREATE INDEX idx_events_aggregate ON events(aggregate_id, aggregate_type, sequence_number);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_trace_id ON events(trace_id);
CREATE UNIQUE INDEX idx_events_sequence ON events(aggregate_id, aggregate_type, sequence_number);

-- Insert initial schema migration record
INSERT INTO schema_migrations (version, description) VALUES (1, 'Initial schema for RAG Studio MVP');