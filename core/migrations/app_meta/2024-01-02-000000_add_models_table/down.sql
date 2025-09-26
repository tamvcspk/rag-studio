-- Rollback models table migration

-- Remove models table indexes
DROP INDEX IF EXISTS idx_models_status;
DROP INDEX IF EXISTS idx_models_last_used;
DROP INDEX IF EXISTS idx_models_type;
DROP INDEX IF EXISTS idx_models_source;
DROP INDEX IF EXISTS idx_models_size;

-- Remove models table
DROP TABLE IF EXISTS models;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = 2;