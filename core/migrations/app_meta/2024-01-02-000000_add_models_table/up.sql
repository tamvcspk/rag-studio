-- Add models table for model management system
-- Supports dynamic model discovery, metadata tracking, and performance metrics

CREATE TABLE models (
    id TEXT PRIMARY KEY,                           -- "sentence-transformers/all-MiniLM-L6-v2"
    name TEXT NOT NULL,                            -- "All MiniLM L6 v2"
    description TEXT,                              -- User-friendly description
    model_type TEXT NOT NULL CHECK (model_type IN ('embedding', 'reranking', 'combined')),
    source_type TEXT NOT NULL CHECK (source_type IN ('huggingface', 'local', 'bundled', 'manual')),
    source_data JSON NOT NULL,                     -- Source-specific metadata (repo ID, path, upload info)
    local_path TEXT,                               -- Local filesystem path if available
    size_mb INTEGER,                               -- Model size in megabytes
    dimensions INTEGER,                            -- Vector dimensions (384, 768, 1024, etc.)
    max_sequence_length INTEGER,                   -- Maximum token sequence length
    status TEXT NOT NULL CHECK (status IN ('available', 'downloading', 'error', 'not_downloaded')),
    download_progress INTEGER DEFAULT 0,           -- Download progress 0-100
    download_eta_seconds INTEGER,                  -- Estimated time remaining for downloads
    error_message TEXT,                            -- Error details if status is 'error'
    checksum TEXT,                                 -- SHA-256 integrity verification hash
    performance_metrics JSON,                      -- Load time, throughput, accuracy benchmarks
    compatibility JSON,                            -- Supported frameworks and versions
    last_used TIMESTAMP,                          -- LRU cleanup support
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for model queries
CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_models_last_used ON models(last_used);
CREATE INDEX idx_models_type ON models(model_type);
CREATE INDEX idx_models_source ON models(source_type);
CREATE INDEX idx_models_size ON models(size_mb);

-- Insert bundled models that ship with the application
-- All MiniLM L6 v2 - lightweight model for offline operation
INSERT INTO models (
    id, name, description, model_type, source_type, source_data,
    size_mb, dimensions, max_sequence_length, status,
    compatibility, created_at, updated_at
) VALUES (
    'sentence-transformers/all-MiniLM-L6-v2',
    'All MiniLM L6 v2',
    'Lightweight sentence transformer optimized for speed and efficiency',
    'embedding',
    'bundled',
    '{"repo_id": "sentence-transformers/all-MiniLM-L6-v2", "version": "v2.2.2", "bundled_with_app": true}',
    90,
    384,
    256,
    'available',
    '["sentence-transformers", "transformers"]',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Update schema migrations
INSERT INTO schema_migrations (version, description) VALUES (2, 'Add models table for dynamic model management');