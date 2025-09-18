/*!
 * Database Models
 *
 * Diesel model definitions for all RAG Studio database tables.
 * These models map to the schema definitions and provide type-safe
 * database interactions.
 */

use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::NaiveDateTime;
use crate::services::schema::*;

/// Settings table model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = settings)]
pub struct Setting {
    pub id: i32,
    pub key: String,
    pub value: String,
    pub schema_version: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = settings)]
pub struct NewSetting {
    pub key: String,
    pub value: String,
    pub schema_version: i32,
}

/// Knowledge Base model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = knowledge_bases)]
pub struct KnowledgeBase {
    pub id: String,
    pub name: String,
    pub version: i32,
    pub status: String,
    pub embedder_model: String,
    pub chunk_size: i32,
    pub chunk_overlap: i32,
    pub description: Option<String>,
    pub metadata: Option<String>, // JSON
    pub health_score: f64,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub pinned_version: Option<i32>,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = knowledge_bases)]
pub struct NewKnowledgeBase {
    pub id: String,
    pub name: String,
    pub version: i32,
    pub status: String,
    pub embedder_model: String,
    pub chunk_size: i32,
    pub chunk_overlap: i32,
    pub description: Option<String>,
    pub metadata: Option<String>,
    pub health_score: f64,
    pub pinned_version: Option<i32>,
}

/// Document model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = documents)]
pub struct Document {
    pub id: String,
    pub kb_id: String,
    pub title: String,
    pub source_path: String,
    pub content_hash: String,
    pub license_info: Option<String>,
    pub metadata: Option<String>, // JSON
    pub chunk_count: i32,
    pub size_bytes: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = documents)]
pub struct NewDocument {
    pub id: String,
    pub kb_id: String,
    pub title: String,
    pub source_path: String,
    pub content_hash: String,
    pub license_info: Option<String>,
    pub metadata: Option<String>,
    pub chunk_count: i32,
    pub size_bytes: i32,
}

/// Document Chunk model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = document_chunks)]
pub struct DocumentChunk {
    pub id: String,
    pub document_id: String,
    pub kb_id: String,
    pub chunk_index: i32,
    pub content: String,
    pub content_hash: String,
    pub token_count: Option<i32>,
    pub metadata: Option<String>, // JSON
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = document_chunks)]
pub struct NewDocumentChunk {
    pub id: String,
    pub document_id: String,
    pub kb_id: String,
    pub chunk_index: i32,
    pub content: String,
    pub content_hash: String,
    pub token_count: Option<i32>,
    pub metadata: Option<String>,
}

/// Pipeline model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = pipelines)]
pub struct Pipeline {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub config: String, // JSON
    pub status: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = pipelines)]
pub struct NewPipeline {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub config: String,
    pub status: String,
}

/// Pipeline Run model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = pipeline_runs)]
pub struct PipelineRun {
    pub id: String,
    pub pipeline_id: String,
    pub kb_id: Option<String>,
    pub status: String,
    pub started_at: Option<NaiveDateTime>,
    pub completed_at: Option<NaiveDateTime>,
    pub error_message: Option<String>,
    pub metrics: Option<String>, // JSON
    pub artifacts: Option<String>, // JSON
}

#[derive(Debug, Insertable)]
#[diesel(table_name = pipeline_runs)]
pub struct NewPipelineRun {
    pub id: String,
    pub pipeline_id: String,
    pub kb_id: Option<String>,
    pub status: String,
    pub started_at: Option<NaiveDateTime>,
    pub completed_at: Option<NaiveDateTime>,
    pub error_message: Option<String>,
    pub metrics: Option<String>,
    pub artifacts: Option<String>,
}

/// Tool model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = tools)]
pub struct Tool {
    pub id: String,
    pub name: String,
    pub tool_type: String,
    pub config: String, // JSON
    pub schema: String, // JSON
    pub enabled: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = tools)]
pub struct NewTool {
    pub id: String,
    pub name: String,
    pub tool_type: String,
    pub config: String,
    pub schema: String,
    pub enabled: bool,
}

/// Schedule model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = schedules)]
pub struct Schedule {
    pub id: String,
    pub name: String,
    pub cron_expression: String,
    pub pipeline_id: String,
    pub enabled: bool,
    pub last_run: Option<NaiveDateTime>,
    pub next_run: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = schedules)]
pub struct NewSchedule {
    pub id: String,
    pub name: String,
    pub cron_expression: String,
    pub pipeline_id: String,
    pub enabled: bool,
    pub last_run: Option<NaiveDateTime>,
    pub next_run: Option<NaiveDateTime>,
}

/// Flow model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = flows)]
pub struct Flow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub definition: String, // JSON
    pub enabled: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = flows)]
pub struct NewFlow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub definition: String,
    pub enabled: bool,
}

/// Event Sourcing - Event model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Identifiable)]
#[diesel(table_name = events)]
pub struct Event {
    pub id: i32, // Auto-increment primary key
    pub event_id: String,
    pub event_type: String,
    pub aggregate_id: String,
    pub aggregate_type: String,
    pub sequence_number: i32,
    pub event_data: String, // JSON
    pub metadata: Option<String>, // JSON
    pub trace_id: Option<String>,
    pub user_id: Option<String>,
    pub timestamp: NaiveDateTime,
    pub checksum: String,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = events)]
pub struct NewEvent {
    pub event_id: String,
    pub event_type: String,
    pub aggregate_id: String,
    pub aggregate_type: String,
    pub sequence_number: i32,
    pub event_data: String,
    pub metadata: Option<String>,
    pub trace_id: Option<String>,
    pub user_id: Option<String>,
    pub checksum: String,
}

/// Aggregate Snapshot model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = aggregate_snapshots)]
#[diesel(primary_key(aggregate_id))]
pub struct AggregateSnapshot {
    pub aggregate_id: String,
    pub aggregate_type: String,
    pub sequence_number: i32,
    pub snapshot_data: String, // JSON
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = aggregate_snapshots)]
pub struct NewAggregateSnapshot {
    pub aggregate_id: String,
    pub aggregate_type: String,
    pub sequence_number: i32,
    pub snapshot_data: String,
}

/// Event Checkpoint model
#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, Identifiable)]
#[diesel(table_name = event_checkpoints)]
#[diesel(primary_key(processor_name))]
pub struct EventCheckpoint {
    pub processor_name: String,
    pub last_processed_sequence: i32,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = event_checkpoints)]
pub struct NewEventCheckpoint {
    pub processor_name: String,
    pub last_processed_sequence: i32,
}