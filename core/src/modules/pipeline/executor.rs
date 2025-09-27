/*!
 * Pipeline Executor Implementation
 *
 * Handles the actual execution of pipeline steps including the new 'pack' step type
 * for KB creation. Implements the ETL processing specified in CORE_DESIGN.md with
 * proper error handling, progress tracking, and step dependency resolution.
 */

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use chrono::Utc;
use tokio::time::{timeout, Duration};
use uuid::Uuid;

use crate::{SqlService, StorageService, JsonCache, ModelService};

use super::models::*;
use super::errors::*;

// Execution context for pipeline runs
#[derive(Debug, Clone)]
pub struct ExecutionContext {
    pub run_id: String,
    pub pipeline: Pipeline,
    pub parameters: HashMap<String, serde_json::Value>,
}

// Result of step execution
#[derive(Debug, Clone)]
pub struct StepResult {
    pub step_id: String,
    pub status: PipelineRunStatus,
    pub output: Option<serde_json::Value>,
    pub error_message: Option<String>,
    pub metrics: StepRunMetrics,
    pub duration: Option<u64>, // milliseconds
}

// Result of complete pipeline execution
#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub status: PipelineRunStatus,
    pub steps_completed: u32,
    pub steps_failed: u32,
    pub total_duration: u64, // milliseconds
    pub error_message: Option<String>,
    pub outputs: HashMap<String, serde_json::Value>, // step_id -> output
}

// Step executor trait for different step types
#[async_trait]
pub trait StepExecutor: Send + Sync {
    async fn execute(&self, step: &PipelineStep, context: &ExecutionContext, inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult>;
    fn step_type(&self) -> ETLStepType;
}

// Main pipeline executor
pub struct PipelineExecutor {
    sql_service: Arc<SqlService>,
    storage_service: Arc<StorageService>,
    cache_service: Arc<JsonCache>,
    model_service: Arc<ModelService>,
    step_executors: HashMap<ETLStepType, Box<dyn StepExecutor>>,
}

impl PipelineExecutor {
    pub fn new(
        sql_service: Arc<SqlService>,
        storage_service: Arc<StorageService>,
        cache_service: Arc<JsonCache>,
        model_service: Arc<ModelService>,
    ) -> Self {
        let mut step_executors: HashMap<ETLStepType, Box<dyn StepExecutor>> = HashMap::new();

        // Register step executors
        step_executors.insert(ETLStepType::Fetch, Box::new(FetchStepExecutor::new(storage_service.clone())));
        step_executors.insert(ETLStepType::Parse, Box::new(ParseStepExecutor::new()));
        step_executors.insert(ETLStepType::Normalize, Box::new(NormalizeStepExecutor::new()));
        step_executors.insert(ETLStepType::Chunk, Box::new(ChunkStepExecutor::new()));
        step_executors.insert(ETLStepType::Annotate, Box::new(AnnotateStepExecutor::new()));
        step_executors.insert(ETLStepType::Embed, Box::new(EmbedStepExecutor::new(model_service.clone())));
        step_executors.insert(ETLStepType::Index, Box::new(IndexStepExecutor::new(sql_service.clone())));
        step_executors.insert(ETLStepType::Eval, Box::new(EvalStepExecutor::new()));
        step_executors.insert(ETLStepType::Pack, Box::new(PackStepExecutor::new(sql_service.clone(), storage_service.clone())));
        step_executors.insert(ETLStepType::Transform, Box::new(TransformStepExecutor::new()));
        step_executors.insert(ETLStepType::Validate, Box::new(ValidateStepExecutor::new()));

        Self {
            sql_service,
            storage_service,
            cache_service,
            model_service,
            step_executors,
        }
    }

    pub async fn execute(&self, context: ExecutionContext) -> PipelineResult<ExecutionResult> {
        let start_time = std::time::Instant::now();
        let mut steps_completed = 0u32;
        let mut steps_failed = 0u32;
        let mut outputs: HashMap<String, serde_json::Value> = HashMap::new();

        // Build execution order based on dependencies
        let execution_order = self.build_execution_order(&context.pipeline.spec.steps)?;

        for step in execution_order {
            // Collect inputs from previous steps
            let inputs = self.collect_step_inputs(&step, &outputs, &context.parameters)?;

            // Execute step with timeout
            let step_timeout = step.timeout.unwrap_or(1800); // 30 minutes default
            let result = match timeout(
                Duration::from_secs(step_timeout),
                self.execute_step(&step, &context, inputs)
            ).await {
                Ok(result) => result?,
                Err(_) => {
                    steps_failed += 1;
                    return Ok(ExecutionResult {
                        status: PipelineRunStatus::Timeout,
                        steps_completed,
                        steps_failed,
                        total_duration: start_time.elapsed().as_millis() as u64,
                        error_message: Some(format!("Step '{}' timed out after {} seconds", step.name, step_timeout)),
                        outputs,
                    });
                }
            };

            match result.status {
                PipelineRunStatus::Completed => {
                    steps_completed += 1;
                    if let Some(output) = result.output {
                        outputs.insert(step.id.clone(), output);
                    }
                }
                PipelineRunStatus::Failed => {
                    steps_failed += 1;
                    return Ok(ExecutionResult {
                        status: PipelineRunStatus::Failed,
                        steps_completed,
                        steps_failed,
                        total_duration: start_time.elapsed().as_millis() as u64,
                        error_message: result.error_message,
                        outputs,
                    });
                }
                _ => {
                    // Should not happen during execution
                    steps_failed += 1;
                    return Ok(ExecutionResult {
                        status: PipelineRunStatus::Failed,
                        steps_completed,
                        steps_failed,
                        total_duration: start_time.elapsed().as_millis() as u64,
                        error_message: Some(format!("Step '{}' returned unexpected status", step.name)),
                        outputs,
                    });
                }
            }
        }

        Ok(ExecutionResult {
            status: PipelineRunStatus::Completed,
            steps_completed,
            steps_failed,
            total_duration: start_time.elapsed().as_millis() as u64,
            error_message: None,
            outputs,
        })
    }

    fn build_execution_order(&self, steps: &[PipelineStep]) -> PipelineResult<Vec<PipelineStep>> {
        // Simple topological sort based on dependencies
        let mut ordered_steps = Vec::new();
        let mut remaining_steps: Vec<PipelineStep> = steps.to_vec();
        let mut processed_step_ids = std::collections::HashSet::new();

        while !remaining_steps.is_empty() {
            let initial_len = remaining_steps.len();

            // Find steps with no unresolved dependencies
            remaining_steps.retain(|step| {
                let dependencies_satisfied = step.dependencies.iter()
                    .all(|dep_id| processed_step_ids.contains(dep_id));

                if dependencies_satisfied {
                    ordered_steps.push(step.clone());
                    processed_step_ids.insert(step.id.clone());
                    false // Remove from remaining_steps
                } else {
                    true // Keep in remaining_steps
                }
            });

            // Check for circular dependencies
            if remaining_steps.len() == initial_len {
                return Err(PipelineError::DependencyError {
                    details: "Circular dependency detected in pipeline steps".to_string(),
                });
            }
        }

        Ok(ordered_steps)
    }

    fn collect_step_inputs(
        &self,
        step: &PipelineStep,
        outputs: &HashMap<String, serde_json::Value>,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> PipelineResult<HashMap<String, serde_json::Value>> {
        let mut inputs = HashMap::new();

        for input in &step.inputs {
            if let Some(source) = &input.source {
                // Get input from previous step output
                if let Some(value) = outputs.get(source) {
                    inputs.insert(input.name.clone(), value.clone());
                } else if input.required {
                    return Err(PipelineError::DependencyError {
                        details: format!("Required input '{}' not available from step '{}'", input.name, source),
                    });
                } else if let Some(default) = &input.default_value {
                    inputs.insert(input.name.clone(), default.clone());
                }
            } else {
                // Get input from pipeline parameters
                if let Some(value) = parameters.get(&input.name) {
                    inputs.insert(input.name.clone(), value.clone());
                } else if input.required {
                    return Err(PipelineError::ParameterValidationFailed {
                        parameter: input.name.clone(),
                        reason: "Required parameter not provided".to_string(),
                    });
                } else if let Some(default) = &input.default_value {
                    inputs.insert(input.name.clone(), default.clone());
                }
            }
        }

        // Also include step config as inputs
        for (key, value) in &step.config {
            inputs.insert(key.clone(), value.clone());
        }

        Ok(inputs)
    }

    async fn execute_step(
        &self,
        step: &PipelineStep,
        context: &ExecutionContext,
        inputs: HashMap<String, serde_json::Value>,
    ) -> PipelineResult<StepResult> {
        let executor = self.step_executors.get(&step.step_type)
            .ok_or_else(|| PipelineError::StepNotImplemented {
                step_type: format!("{:?}", step.step_type),
            })?;

        executor.execute(step, context, inputs).await
    }
}

// Concrete step executor implementations

// Fetch Step - Data ingestion from various sources
struct FetchStepExecutor {
    storage_service: Arc<StorageService>,
}

impl FetchStepExecutor {
    fn new(storage_service: Arc<StorageService>) -> Self {
        Self { storage_service }
    }
}

#[async_trait]
impl StepExecutor for FetchStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        // Extract source type and path from inputs
        let source = inputs.get("source")
            .and_then(|v| v.as_str())
            .ok_or_else(|| PipelineError::InvalidStepConfig {
                step: step.name.clone(),
                reason: "Missing 'source' parameter".to_string(),
            })?;

        let result = match source {
            "local-folder" => {
                let path = inputs.get("path")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| PipelineError::InvalidStepConfig {
                        step: step.name.clone(),
                        reason: "Missing 'path' parameter for local-folder source".to_string(),
                    })?;

                // TODO: Implement actual local folder scanning
                serde_json::json!({
                    "source_type": "local-folder",
                    "files": [
                        {"path": format!("{}/doc1.txt", path), "size": 1024},
                        {"path": format!("{}/doc2.md", path), "size": 2048}
                    ],
                    "total_files": 2,
                    "total_size": 3072
                })
            }
            "web-crawler" => {
                let base_url = inputs.get("baseUrl")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| PipelineError::InvalidStepConfig {
                        step: step.name.clone(),
                        reason: "Missing 'baseUrl' parameter for web-crawler source".to_string(),
                    })?;

                // TODO: Implement actual web crawling
                serde_json::json!({
                    "source_type": "web-crawler",
                    "base_url": base_url,
                    "pages": [
                        {"url": format!("{}/page1", base_url), "title": "Page 1"},
                        {"url": format!("{}/page2", base_url), "title": "Page 2"}
                    ],
                    "total_pages": 2
                })
            }
            "git-clone" => {
                let repo = inputs.get("repo")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| PipelineError::InvalidStepConfig {
                        step: step.name.clone(),
                        reason: "Missing 'repo' parameter for git-clone source".to_string(),
                    })?;

                // TODO: Implement actual git cloning
                serde_json::json!({
                    "source_type": "git-clone",
                    "repository": repo,
                    "files": [
                        {"path": "README.md", "type": "markdown"},
                        {"path": "src/main.rs", "type": "rust"}
                    ],
                    "total_files": 2
                })
            }
            _ => {
                return Err(PipelineError::InvalidStepConfig {
                    step: step.name.clone(),
                    reason: format!("Unsupported source type: {}", source),
                });
            }
        };

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(0),
                output_size: Some(3072),
                records_processed: Some(2),
                memory_used: Some(10),
                cpu_used: Some(5.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Fetch
    }
}

// Parse Step - Content parsing
struct ParseStepExecutor;

impl ParseStepExecutor {
    fn new() -> Self {
        Self
    }
}

#[async_trait]
impl StepExecutor for ParseStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        // Extract file data from previous step
        let _files = inputs.get("files")
            .ok_or_else(|| PipelineError::InvalidStepConfig {
                step: step.name.clone(),
                reason: "Missing 'files' input from previous step".to_string(),
            })?;

        // TODO: Implement actual content parsing
        let result = serde_json::json!({
            "parsed_documents": [
                {
                    "id": "doc-1",
                    "title": "Document 1",
                    "content": "This is the parsed content of document 1...",
                    "metadata": {"format": "txt", "size": 1024}
                },
                {
                    "id": "doc-2",
                    "title": "Document 2",
                    "content": "This is the parsed content of document 2...",
                    "metadata": {"format": "md", "size": 2048}
                }
            ],
            "total_documents": 2
        });

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(3072),
                output_size: Some(4096),
                records_processed: Some(2),
                memory_used: Some(15),
                cpu_used: Some(10.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Parse
    }
}

// Normalize Step - Data cleaning and normalization
struct NormalizeStepExecutor;

impl NormalizeStepExecutor {
    fn new() -> Self {
        Self
    }
}

#[async_trait]
impl StepExecutor for NormalizeStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, _inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        // TODO: Implement actual normalization
        let result = serde_json::json!({
            "normalized_documents": [
                {
                    "id": "doc-1",
                    "title": "Document 1",
                    "content": "This is the normalized content of document 1...",
                    "metadata": {"format": "txt", "size": 1024, "normalized": true}
                }
            ],
            "total_documents": 1,
            "deduplication_stats": {"removed": 1, "kept": 1}
        });

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(4096),
                output_size: Some(2048),
                records_processed: Some(1),
                memory_used: Some(12),
                cpu_used: Some(8.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Normalize
    }
}

// Chunk Step - Text chunking
struct ChunkStepExecutor;

impl ChunkStepExecutor {
    fn new() -> Self {
        Self
    }
}

#[async_trait]
impl StepExecutor for ChunkStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        let max_tokens = inputs.get("maxTokens")
            .and_then(|v| v.as_u64())
            .unwrap_or(512);

        // TODO: Implement actual text chunking
        let result = serde_json::json!({
            "chunks": [
                {
                    "id": "chunk-1",
                    "document_id": "doc-1",
                    "content": "This is chunk 1 of document 1...",
                    "token_count": max_tokens / 2,
                    "position": 0
                },
                {
                    "id": "chunk-2",
                    "document_id": "doc-1",
                    "content": "This is chunk 2 of document 1...",
                    "token_count": max_tokens / 2,
                    "position": 1
                }
            ],
            "total_chunks": 2,
            "chunking_strategy": "semantic",
            "max_tokens": max_tokens
        });

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(2048),
                output_size: Some(1024),
                records_processed: Some(2),
                memory_used: Some(20),
                cpu_used: Some(15.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Chunk
    }
}

// Annotate Step - Metadata annotation
struct AnnotateStepExecutor;

impl AnnotateStepExecutor {
    fn new() -> Self {
        Self
    }
}

#[async_trait]
impl StepExecutor for AnnotateStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, _inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        // TODO: Implement actual annotation
        let result = serde_json::json!({
            "annotated_chunks": [
                {
                    "id": "chunk-1",
                    "content": "This is chunk 1 of document 1...",
                    "annotations": {"language": "en", "sentiment": "neutral", "topics": ["technical"]}
                }
            ],
            "total_chunks": 1
        });

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(1024),
                output_size: Some(1536),
                records_processed: Some(1),
                memory_used: Some(25),
                cpu_used: Some(20.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Annotate
    }
}

// Embed Step - Embedding generation using ModelService
struct EmbedStepExecutor {
    model_service: Arc<ModelService>,
}

impl EmbedStepExecutor {
    fn new(model_service: Arc<ModelService>) -> Self {
        Self { model_service }
    }
}

#[async_trait]
impl StepExecutor for EmbedStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        let model = inputs.get("model")
            .and_then(|v| v.as_str())
            .ok_or_else(|| PipelineError::InvalidStepConfig {
                step: step.name.clone(),
                reason: "Missing 'model' parameter".to_string(),
            })?;

        // Validate model availability
        match self.model_service.get_model_status(model).await {
            Ok(status) => {
                match status {
                    crate::ModelStatus::Available => {
                        // Model is ready, proceed with embedding
                    }
                    crate::ModelStatus::NotDownloaded => {
                        return Err(PipelineError::ModelNotAvailable {
                            model_id: model.to_string(),
                            suggestion: "Download the model before running the pipeline".to_string(),
                        });
                    }
                    crate::ModelStatus::Downloading { .. } => {
                        return Err(PipelineError::ModelNotAvailable {
                            model_id: model.to_string(),
                            suggestion: "Wait for model download to complete".to_string(),
                        });
                    }
                    crate::ModelStatus::Error { message } => {
                        return Err(PipelineError::ModelError {
                            model_id: model.to_string(),
                            message,
                            fallback: "all-MiniLM-L6-v2".to_string(),
                        });
                    }
                }
            }
            Err(e) => {
                return Err(PipelineError::ModelError {
                    model_id: model.to_string(),
                    message: e.to_string(),
                    fallback: "all-MiniLM-L6-v2".to_string(),
                });
            }
        }

        // TODO: Implement actual embedding generation via EmbeddingService
        let result = serde_json::json!({
            "embedded_chunks": [
                {
                    "id": "chunk-1",
                    "content": "This is chunk 1 of document 1...",
                    "embedding": [0.1, 0.2, 0.3], // Mock embedding vector
                    "model": model,
                    "dimensions": 384
                }
            ],
            "total_chunks": 1,
            "model_used": model,
            "embedding_dimensions": 384
        });

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(1536),
                output_size: Some(2048),
                records_processed: Some(1),
                memory_used: Some(100),
                cpu_used: Some(50.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Embed
    }
}

// Index Step - Vector and lexical indexing
struct IndexStepExecutor {
    sql_service: Arc<SqlService>,
}

impl IndexStepExecutor {
    fn new(sql_service: Arc<SqlService>) -> Self {
        Self { sql_service }
    }
}

#[async_trait]
impl StepExecutor for IndexStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, _inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        // TODO: Implement actual indexing to LanceDB and SQLite
        let result = serde_json::json!({
            "indexed_chunks": 1,
            "vector_index_size": 1024,
            "bm25_index_size": 512,
            "total_vectors": 1,
            "index_health": "healthy"
        });

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(2048),
                output_size: Some(1536),
                records_processed: Some(1),
                memory_used: Some(50),
                cpu_used: Some(30.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Index
    }
}

// Eval Step - Quality evaluation
struct EvalStepExecutor;

impl EvalStepExecutor {
    fn new() -> Self {
        Self
    }
}

#[async_trait]
impl StepExecutor for EvalStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        let quality_threshold = inputs.get("qualityThreshold")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.8);

        // TODO: Implement actual quality evaluation
        let quality_score = 0.85; // Mock score

        if quality_score < quality_threshold {
            return Ok(StepResult {
                step_id: step.id.clone(),
                status: PipelineRunStatus::Failed,
                output: None,
                error_message: Some(format!("Quality score {} below threshold {}", quality_score, quality_threshold)),
                metrics: StepRunMetrics {
                    input_size: Some(1536),
                    output_size: Some(0),
                    records_processed: Some(0),
                    memory_used: Some(20),
                    cpu_used: Some(10.0),
                },
                duration: Some(start_time.elapsed().as_millis() as u64),
            });
        }

        let result = serde_json::json!({
            "quality_score": quality_score,
            "threshold": quality_threshold,
            "passed": true,
            "metrics": {
                "recall_at_k": 0.9,
                "precision": 0.8,
                "f1_score": 0.85
            }
        });

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(1536),
                output_size: Some(256),
                records_processed: Some(1),
                memory_used: Some(20),
                cpu_used: Some(10.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Eval
    }
}

// Pack Step - KB creation from pipeline output (NEW STEP TYPE)
struct PackStepExecutor {
    sql_service: Arc<SqlService>,
    storage_service: Arc<StorageService>,
}

impl PackStepExecutor {
    fn new(sql_service: Arc<SqlService>, storage_service: Arc<StorageService>) -> Self {
        Self { sql_service, storage_service }
    }
}

#[async_trait]
impl StepExecutor for PackStepExecutor {
    async fn execute(&self, step: &PipelineStep, context: &ExecutionContext, inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        // Extract KB creation parameters
        let create_kb = inputs.get("createKB")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        if !create_kb {
            // This is not a KB creation pack step, handle differently
            return Ok(StepResult {
                step_id: step.id.clone(),
                status: PipelineRunStatus::Completed,
                output: Some(serde_json::json!({"packed": false})),
                error_message: None,
                metrics: StepRunMetrics {
                    input_size: Some(256),
                    output_size: Some(64),
                    records_processed: Some(0),
                    memory_used: Some(5),
                    cpu_used: Some(2.0),
                },
                duration: Some(start_time.elapsed().as_millis() as u64),
            });
        }

        let name = inputs.get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| PipelineError::InvalidStepConfig {
                step: step.name.clone(),
                reason: "Missing 'name' parameter for KB creation".to_string(),
            })?;

        let product = inputs.get("product")
            .and_then(|v| v.as_str())
            .ok_or_else(|| PipelineError::InvalidStepConfig {
                step: step.name.clone(),
                reason: "Missing 'product' parameter for KB creation".to_string(),
            })?;

        let version = context.parameters.get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("1.0.0");

        let description = context.parameters.get("description")
            .and_then(|v| v.as_str());

        // TODO: Implement actual KB creation using KbService
        // This would involve:
        // 1. Creating KB metadata in SQL database
        // 2. Storing indexed content in LanceDB
        // 3. Creating KB manifest and metadata files
        // 4. Registering KB in StateManager

        let kb_id = Uuid::new_v4().to_string();
        let result = serde_json::json!({
            "knowledge_base": {
                "id": kb_id,
                "name": name,
                "product": product,
                "version": version,
                "description": description,
                "status": "indexed",
                "document_count": 1,
                "chunk_count": 1,
                "index_size": 2048,
                "health_score": 0.85,
                "created_at": Utc::now().to_rfc3339(),
                "updated_at": Utc::now().to_rfc3339()
            },
            "pipeline_output": {
                "total_processing_time": start_time.elapsed().as_millis(),
                "steps_completed": 8,
                "quality_score": 0.85
            }
        });

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(2048),
                output_size: Some(1024),
                records_processed: Some(1),
                memory_used: Some(30),
                cpu_used: Some(20.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Pack
    }
}

// Transform Step - Data transformation
struct TransformStepExecutor;

impl TransformStepExecutor {
    fn new() -> Self {
        Self
    }
}

#[async_trait]
impl StepExecutor for TransformStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, _inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        // TODO: Implement actual data transformation
        let result = serde_json::json!({"transformed": true});

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(1024),
                output_size: Some(1024),
                records_processed: Some(1),
                memory_used: Some(10),
                cpu_used: Some(5.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Transform
    }
}

// Validate Step - Input validation
struct ValidateStepExecutor;

impl ValidateStepExecutor {
    fn new() -> Self {
        Self
    }
}

#[async_trait]
impl StepExecutor for ValidateStepExecutor {
    async fn execute(&self, step: &PipelineStep, _context: &ExecutionContext, _inputs: HashMap<String, serde_json::Value>) -> PipelineResult<StepResult> {
        let start_time = std::time::Instant::now();

        // TODO: Implement actual validation
        let result = serde_json::json!({"validated": true});

        Ok(StepResult {
            step_id: step.id.clone(),
            status: PipelineRunStatus::Completed,
            output: Some(result),
            error_message: None,
            metrics: StepRunMetrics {
                input_size: Some(512),
                output_size: Some(512),
                records_processed: Some(1),
                memory_used: Some(5),
                cpu_used: Some(2.0),
            },
            duration: Some(start_time.elapsed().as_millis() as u64),
        })
    }

    fn step_type(&self) -> ETLStepType {
        ETLStepType::Validate
    }
}