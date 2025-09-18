/*!
 * Database Schema Definitions
 *
 * Diesel table definitions for all RAG Studio database tables.
 * This schema supports both MVP (single database) and production
 * (split database) architectures.
 */

// @generated automatically by Diesel CLI.

diesel::table! {
    settings (id) {
        id -> Integer,
        key -> Text,
        value -> Text,
        schema_version -> Integer,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    knowledge_bases (id) {
        id -> Text,
        name -> Text,
        version -> Integer,
        status -> Text,
        embedder_model -> Text,
        chunk_size -> Integer,
        chunk_overlap -> Integer,
        description -> Nullable<Text>,
        metadata -> Nullable<Text>,
        health_score -> Double,
        created_at -> Timestamp,
        updated_at -> Timestamp,
        pinned_version -> Nullable<Integer>,
    }
}

diesel::table! {
    documents (id) {
        id -> Text,
        kb_id -> Text,
        title -> Text,
        source_path -> Text,
        content_hash -> Text,
        license_info -> Nullable<Text>,
        metadata -> Nullable<Text>,
        chunk_count -> Integer,
        size_bytes -> Integer,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    document_chunks (id) {
        id -> Text,
        document_id -> Text,
        kb_id -> Text,
        chunk_index -> Integer,
        content -> Text,
        content_hash -> Text,
        token_count -> Nullable<Integer>,
        metadata -> Nullable<Text>,
        created_at -> Timestamp,
    }
}

diesel::table! {
    pipelines (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        config -> Text,
        status -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    pipeline_runs (id) {
        id -> Text,
        pipeline_id -> Text,
        kb_id -> Nullable<Text>,
        status -> Text,
        started_at -> Nullable<Timestamp>,
        completed_at -> Nullable<Timestamp>,
        error_message -> Nullable<Text>,
        metrics -> Nullable<Text>,
        artifacts -> Nullable<Text>,
    }
}

diesel::table! {
    tools (id) {
        id -> Text,
        name -> Text,
        #[sql_name = "type"]
        tool_type -> Text,
        config -> Text,
        schema -> Text,
        enabled -> Bool,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    schedules (id) {
        id -> Text,
        name -> Text,
        cron_expression -> Text,
        pipeline_id -> Text,
        enabled -> Bool,
        last_run -> Nullable<Timestamp>,
        next_run -> Nullable<Timestamp>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    flows (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        definition -> Text,
        enabled -> Bool,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    schema_migrations (version) {
        version -> Integer,
        applied_at -> Timestamp,
        description -> Nullable<Text>,
    }
}

// Event Sourcing Tables (MVP: in app_meta.db, Production: separate events.db)
diesel::table! {
    events (id) {
        id -> Integer,
        event_id -> Text,
        event_type -> Text,
        aggregate_id -> Text,
        aggregate_type -> Text,
        sequence_number -> Integer,
        event_data -> Text,
        metadata -> Nullable<Text>,
        trace_id -> Nullable<Text>,
        user_id -> Nullable<Text>,
        timestamp -> Timestamp,
        checksum -> Text,
    }
}

diesel::table! {
    aggregate_snapshots (aggregate_id) {
        aggregate_id -> Text,
        aggregate_type -> Text,
        sequence_number -> Integer,
        snapshot_data -> Text,
        created_at -> Timestamp,
    }
}

diesel::table! {
    event_checkpoints (processor_name) {
        processor_name -> Text,
        last_processed_sequence -> Integer,
        updated_at -> Timestamp,
    }
}

// Foreign key relationships
diesel::joinable!(documents -> knowledge_bases (kb_id));
diesel::joinable!(document_chunks -> documents (document_id));
diesel::joinable!(document_chunks -> knowledge_bases (kb_id));
diesel::joinable!(pipeline_runs -> pipelines (pipeline_id));
diesel::joinable!(pipeline_runs -> knowledge_bases (kb_id));
diesel::joinable!(schedules -> pipelines (pipeline_id));

diesel::allow_tables_to_appear_in_same_query!(
    settings,
    knowledge_bases,
    documents,
    document_chunks,
    pipelines,
    pipeline_runs,
    tools,
    schedules,
    flows,
    schema_migrations,
    events,
    aggregate_snapshots,
    event_checkpoints,
);