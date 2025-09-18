-- Rollback initial schema
-- Drop tables in reverse order to handle foreign key constraints

-- Drop indexes first
DROP INDEX IF EXISTS idx_events_sequence;
DROP INDEX IF EXISTS idx_events_trace_id;
DROP INDEX IF EXISTS idx_events_timestamp;
DROP INDEX IF EXISTS idx_events_type;
DROP INDEX IF EXISTS idx_events_aggregate;
DROP INDEX IF EXISTS idx_kb_name_version;
DROP INDEX IF EXISTS idx_kb_status;
DROP INDEX IF EXISTS idx_schedules_next_run;
DROP INDEX IF EXISTS idx_pipeline_runs_started_at;
DROP INDEX IF EXISTS idx_pipeline_runs_status;
DROP INDEX IF EXISTS idx_pipeline_runs_pipeline_id;
DROP INDEX IF EXISTS idx_chunks_hash;
DROP INDEX IF EXISTS idx_chunks_kb_id;
DROP INDEX IF EXISTS idx_chunks_document_id;
DROP INDEX IF EXISTS idx_documents_hash;
DROP INDEX IF EXISTS idx_documents_kb_id;

-- Drop event sourcing tables
DROP TABLE IF EXISTS event_checkpoints;
DROP TABLE IF EXISTS aggregate_snapshots;
DROP TABLE IF EXISTS events;

-- Drop application tables
DROP TABLE IF EXISTS schema_migrations;
DROP TABLE IF EXISTS flows;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS tools;
DROP TABLE IF EXISTS pipeline_runs;
DROP TABLE IF EXISTS pipelines;
DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS knowledge_bases;
DROP TABLE IF EXISTS settings;