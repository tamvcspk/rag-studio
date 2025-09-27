/*!
 * Pipeline Data Models
 *
 * Core data structures for Pipeline system as specified in CORE_DESIGN.md.
 * These models define the Pipeline specification, execution context, and
 * step implementations for unified ETL workflows.
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

// Core Pipeline Models

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pipeline {
    pub id: String,
    pub name: String,
    pub description: String,
    pub spec: PipelineSpec,
    pub templates: Vec<String>, // Template IDs used
    pub last_run_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub status: PipelineStatus,
    pub tags: Vec<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineSpec {
    pub version: String,
    pub steps: Vec<PipelineStep>,
    pub parameters: HashMap<String, PipelineParameter>,
    pub resources: Option<PipelineResources>,
    pub triggers: Vec<PipelineTrigger>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStep {
    pub id: String,
    pub name: String,
    pub step_type: ETLStepType,
    pub config: HashMap<String, serde_json::Value>,
    pub inputs: Vec<PipelineStepInput>,
    pub outputs: Vec<PipelineStepOutput>,
    pub dependencies: Vec<String>, // IDs of steps this step depends on
    pub retry_policy: Option<RetryPolicy>,
    pub timeout: Option<u64>, // seconds
    pub parallelizable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, Hash, PartialEq)]
pub enum ETLStepType {
    Fetch,      // Data ingestion from various sources
    Parse,      // Content parsing (PDF, HTML, markdown, etc.)
    Normalize,  // Data normalization and cleaning
    Chunk,      // Text chunking strategies
    Annotate,   // Metadata annotation
    Embed,      // Embedding generation
    Index,      // Vector and lexical indexing
    Eval,       // Quality evaluation and validation
    Pack,       // KB creation from pipeline output (new step type)
    Transform,  // Data transformation
    Validate,   // Input validation
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStepInput {
    pub name: String,
    pub input_type: StepIOType,
    pub required: bool,
    pub source: Option<String>, // Reference to output of another step
    pub default_value: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStepOutput {
    pub name: String,
    pub output_type: StepIOType,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StepIOType {
    File,
    Data,
    Config,
    Reference,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineParameter {
    pub name: String,
    pub param_type: ParameterType,
    pub description: String,
    pub required: bool,
    pub default_value: Option<serde_json::Value>,
    pub validation: Option<ParameterValidation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParameterType {
    String,
    Number,
    Boolean,
    Object,
    Array,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterValidation {
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub pattern: Option<String>,
    pub enum_values: Option<Vec<serde_json::Value>>,
    pub custom_validator: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineResources {
    pub cpu: Option<f64>,
    pub memory: Option<u64>, // MB
    pub disk: Option<u64>,   // MB
    pub timeout: Option<u64>, // seconds
    pub max_parallel_steps: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineTrigger {
    pub trigger_type: TriggerType,
    pub config: HashMap<String, serde_json::Value>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TriggerType {
    Manual,
    Scheduled,
    FileWatch,
    Webhook,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryPolicy {
    pub max_attempts: u32,
    pub initial_delay: u64,    // milliseconds
    pub backoff_multiplier: f64,
    pub max_delay: u64,        // milliseconds
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PipelineStatus {
    Draft,
    Active,
    Paused,
    Error,
    Archived,
}

// Pipeline Execution Models

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineRun {
    pub id: String,
    pub pipeline_id: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub status: PipelineRunStatus,
    pub logs_ref: Option<String>,
    pub artifacts_ref: Option<String>,
    pub metrics: PipelineRunMetrics,
    pub step_runs: Vec<PipelineStepRun>,
    pub triggered_by: RunTrigger,
    pub parameters: HashMap<String, serde_json::Value>,
    pub error_message: Option<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PipelineRunStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
    Timeout,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineRunMetrics {
    pub duration: Option<u64>, // milliseconds
    pub steps_completed: u32,
    pub steps_total: u32,
    pub steps_skipped: u32,
    pub steps_failed: u32,
    pub data_processed: Option<u64>, // bytes
    pub records_processed: Option<u64>,
    pub memory_used: Option<u64>, // MB
    pub cpu_used: Option<f64>, // percentage
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStepRun {
    pub id: String,
    pub step_id: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub status: PipelineRunStatus,
    pub duration: Option<u64>, // milliseconds
    pub output: Option<serde_json::Value>,
    pub error_message: Option<String>,
    pub retry_count: u32,
    pub metrics: StepRunMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepRunMetrics {
    pub input_size: Option<u64>,  // bytes
    pub output_size: Option<u64>, // bytes
    pub records_processed: Option<u64>,
    pub memory_used: Option<u64>, // MB
    pub cpu_used: Option<f64>,    // percentage
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunTrigger {
    pub trigger_type: TriggerType,
    pub user_id: Option<String>,
    pub source: Option<String>,
    pub timestamp: DateTime<Utc>,
}

// Pipeline Template Models

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: PipelineTemplateCategory,
    pub spec: PipelineSpec,
    pub author: String,
    pub version: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PipelineTemplateCategory {
    DataIngestion,
    TextProcessing,
    DocumentParsing,
    EmbeddingGeneration,
    IndexBuilding,
    Evaluation,
    ExportImport,
    Custom,
}

// Validation Models

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub error_type: ValidationErrorType,
    pub node_id: Option<String>,
    pub message: String,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationErrorType {
    MissingConnection,
    CircularDependency,
    InvalidConfig,
    ResourceConflict,
    ModelNotAvailable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationWarning {
    pub warning_type: ValidationWarningType,
    pub node_id: Option<String>,
    pub message: String,
    pub level: WarningLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationWarningType {
    Performance,
    Compatibility,
    BestPractice,
    ModelOptimization,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WarningLevel {
    Low,
    Medium,
    High,
}

// KB Creation specific models

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KBCreationParameters {
    pub name: String,
    pub product: String,
    pub version: String,
    pub description: Option<String>,
    pub source_url: String,
    pub embedding_model: String,
}

// Factory functions for common pipeline operations

impl Pipeline {
    pub fn new(name: String, description: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            description,
            spec: PipelineSpec {
                version: "1.0.0".to_string(),
                steps: Vec::new(),
                parameters: HashMap::new(),
                resources: None,
                triggers: Vec::new(),
            },
            templates: Vec::new(),
            last_run_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            status: PipelineStatus::Draft,
            tags: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    pub fn from_template(template: &PipelineTemplate, name: String, parameters: HashMap<String, serde_json::Value>) -> Self {
        let mut pipeline = Self::new(name, template.description.clone());
        pipeline.spec = template.spec.clone();
        pipeline.templates.push(template.id.clone());
        pipeline.tags = template.tags.clone();

        // Apply parameter substitution to step configs
        for step in &mut pipeline.spec.steps {
            substitute_parameters(&mut step.config, &parameters);
        }

        pipeline
    }
}

impl PipelineRun {
    pub fn new(pipeline_id: String, triggered_by: RunTrigger, parameters: HashMap<String, serde_json::Value>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            pipeline_id,
            started_at: Utc::now(),
            ended_at: None,
            status: PipelineRunStatus::Pending,
            logs_ref: None,
            artifacts_ref: None,
            metrics: PipelineRunMetrics {
                duration: None,
                steps_completed: 0,
                steps_total: 0,
                steps_skipped: 0,
                steps_failed: 0,
                data_processed: None,
                records_processed: None,
                memory_used: None,
                cpu_used: None,
            },
            step_runs: Vec::new(),
            triggered_by,
            parameters,
            error_message: None,
            warnings: Vec::new(),
        }
    }
}

// Utility functions

fn substitute_parameters(config: &mut HashMap<String, serde_json::Value>, parameters: &HashMap<String, serde_json::Value>) {
    for (_key, value) in config.iter_mut() {
        if let serde_json::Value::String(s) = value {
            if s.starts_with("{{") && s.ends_with("}}") {
                let param_name = &s[2..s.len()-2];
                if let Some(param_value) = parameters.get(param_name) {
                    *value = param_value.clone();
                }
            }
        }
    }
}