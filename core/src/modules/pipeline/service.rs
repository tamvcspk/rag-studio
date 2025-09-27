/*!
 * Pipeline Service Implementation
 *
 * Core service for Pipeline management following the established DI pattern
 * from other core services. Provides async trait interface for testability
 * and implements the Pipeline execution architecture specified in CORE_DESIGN.md.
 */

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::Utc;

use crate::{SqlService, StorageService, JsonCache, ModelService};
use crate::state::StateManager;

use super::models::*;
use super::errors::{PipelineError, PipelineResult, ValidationWarning as ValidationWarningEnum, WarningLevel as ErrorWarningLevel};
use super::executor::{PipelineExecutor, ExecutionContext};
use super::templates::{get_kb_creation_template, KB_CREATION_TEMPLATES};

// Configuration for Pipeline Service
#[derive(Debug, Clone)]
pub struct PipelineConfig {
    pub max_concurrent_pipelines: u32,
    pub default_timeout_seconds: u64,
    pub max_retry_attempts: u32,
    pub enable_step_caching: bool,
    pub storage_quota_gb: u64,
}

impl PipelineConfig {
    pub fn new_mvp() -> Self {
        Self {
            max_concurrent_pipelines: 5,
            default_timeout_seconds: 3600, // 1 hour
            max_retry_attempts: 3,
            enable_step_caching: true,
            storage_quota_gb: 5,
        }
    }

    pub fn new_production() -> Self {
        Self {
            max_concurrent_pipelines: 20,
            default_timeout_seconds: 7200, // 2 hours
            max_retry_attempts: 5,
            enable_step_caching: true,
            storage_quota_gb: 50,
        }
    }

    pub fn test_config() -> Self {
        Self {
            max_concurrent_pipelines: 2,
            default_timeout_seconds: 300, // 5 minutes
            max_retry_attempts: 1,
            enable_step_caching: false,
            storage_quota_gb: 1,
        }
    }
}

// Async trait for Pipeline Service
#[async_trait]
pub trait PipelineService: Send + Sync {
    // Pipeline CRUD operations
    async fn create_pipeline(&self, name: String, description: String, template_id: Option<String>, parameters: Option<HashMap<String, serde_json::Value>>) -> PipelineResult<Pipeline>;
    async fn get_pipeline(&self, pipeline_id: &str) -> PipelineResult<Pipeline>;
    async fn list_pipelines(&self) -> PipelineResult<Vec<Pipeline>>;
    async fn update_pipeline(&self, pipeline_id: &str, updates: PipelineUpdateRequest) -> PipelineResult<Pipeline>;
    async fn delete_pipeline(&self, pipeline_id: &str) -> PipelineResult<()>;

    // Pipeline execution
    async fn execute_pipeline(&self, pipeline_id: &str, parameters: HashMap<String, serde_json::Value>, triggered_by: RunTrigger) -> PipelineResult<PipelineRun>;
    async fn cancel_execution(&self, run_id: &str) -> PipelineResult<()>;
    async fn get_run(&self, run_id: &str) -> PipelineResult<PipelineRun>;
    async fn list_runs(&self, pipeline_id: Option<&str>) -> PipelineResult<Vec<PipelineRun>>;

    // Template operations
    async fn list_templates(&self) -> PipelineResult<Vec<PipelineTemplate>>;
    async fn get_template(&self, template_id: &str) -> PipelineResult<PipelineTemplate>;
    async fn create_from_template(&self, template_id: &str, name: String, parameters: HashMap<String, serde_json::Value>) -> PipelineResult<Pipeline>;

    // Validation
    async fn validate_pipeline(&self, pipeline_id: &str) -> PipelineResult<PipelineValidationResult>;
    async fn validate_template_parameters(&self, template_id: &str, parameters: &HashMap<String, serde_json::Value>) -> PipelineResult<Vec<ValidationWarningEnum>>;

    // Statistics and monitoring
    async fn get_execution_metrics(&self) -> PipelineResult<PipelineExecutionMetrics>;
    async fn get_pipeline_health(&self, pipeline_id: &str) -> PipelineResult<PipelineHealthStatus>;
}

#[derive(Debug, Clone)]
pub struct PipelineExecutionMetrics {
    pub total_pipelines: u32,
    pub active_pipelines: u32,
    pub error_pipelines: u32,
    pub draft_pipelines: u32,
    pub running_executions: u32,
    pub avg_execution_time: f64,
    pub total_executions: u64,
    pub success_rate: f64,
    pub last_24h_executions: u32,
}

#[derive(Debug, Clone)]
pub struct PipelineHealthStatus {
    pub pipeline_id: String,
    pub status: PipelineStatus,
    pub last_execution_status: Option<PipelineRunStatus>,
    pub error_count_24h: u32,
    pub success_rate_7d: f64,
    pub avg_execution_time_7d: f64,
}

#[derive(Debug, Clone)]
pub struct PipelineUpdateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub spec: Option<PipelineSpec>,
    pub status: Option<PipelineStatus>,
    pub tags: Option<Vec<String>>,
}

// Concrete implementation
pub struct PipelineServiceImpl {
    config: PipelineConfig,
    sql_service: Arc<SqlService>,
    storage_service: Arc<StorageService>,
    cache_service: Arc<JsonCache>,
    model_service: Arc<ModelService>,
    state_manager: Arc<StateManager>,
    executor: Arc<PipelineExecutor>,
    pipelines: Arc<RwLock<HashMap<String, Pipeline>>>,
    runs: Arc<RwLock<HashMap<String, PipelineRun>>>,
}

impl PipelineServiceImpl {
    pub fn new(
        config: PipelineConfig,
        sql_service: Arc<SqlService>,
        storage_service: Arc<StorageService>,
        cache_service: Arc<JsonCache>,
        model_service: Arc<ModelService>,
        state_manager: Arc<StateManager>,
    ) -> Self {
        let executor = Arc::new(PipelineExecutor::new(
            sql_service.clone(),
            storage_service.clone(),
            cache_service.clone(),
            model_service.clone(),
        ));

        Self {
            config,
            sql_service,
            storage_service,
            cache_service,
            model_service,
            state_manager,
            executor,
            pipelines: Arc::new(RwLock::new(HashMap::new())),
            runs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    async fn load_pipeline_from_storage(&self, pipeline_id: &str) -> PipelineResult<Pipeline> {
        // TODO: Implement actual pipeline loading from SQL database
        // For now, return error if not found in memory
        Err(PipelineError::NotFound { id: pipeline_id.to_string() })
    }

    async fn save_pipeline_to_storage(&self, _pipeline: &Pipeline) -> PipelineResult<()> {
        // TODO: Implement actual pipeline persistence to SQL database
        Ok(())
    }

    async fn validate_model_dependencies(&self, steps: &[PipelineStep]) -> PipelineResult<Vec<ValidationWarningEnum>> {
        let mut warnings = Vec::new();

        for step in steps {
            if let ETLStepType::Embed = step.step_type {
                if let Some(model_value) = step.config.get("model") {
                    if let Some(model_id) = model_value.as_str() {
                        match self.model_service.get_model_status(model_id).await {
                            Ok(status) => {
                                match status {
                                    crate::ModelStatus::Available => {
                                        // Check for better model suggestions
                                        // TODO: implement suggest_better_model in ModelService
                                        // Temporarily disabled until suggest_better_model is implemented
                                        // if let Ok(Some(suggestion)) = self.model_service.suggest_better_model(model_id, "embedding").await {
                                        //     warnings.push(ValidationWarningEnum::SuboptimalModel {
                                        //         current: model_id.to_string(),
                                        //         suggested: suggestion,
                                        //         reason: "Better accuracy for this content type".to_string(),
                                        //     });
                                        // }
                                    }
                                    crate::ModelStatus::NotDownloaded => {
                                        return Err(PipelineError::ModelNotAvailable {
                                            model_id: model_id.to_string(),
                                            suggestion: format!("Download model or use fallback: {}",
                                                self.model_service.get_fallback_model(&crate::ModelType::Embedding).await
                                                    .unwrap_or_else(|_| "all-MiniLM-L6-v2".to_string())
                                            ),
                                        });
                                    }
                                    crate::ModelStatus::Downloading { progress, eta_seconds } => {
                                        warnings.push(ValidationWarningEnum::ModelDownloading {
                                            model_id: model_id.to_string(),
                                            progress: progress.into(),
                                            eta_seconds: eta_seconds.unwrap_or(0),
                                        });
                                    }
                                    crate::ModelStatus::Error { message } => {
                                        let fallback = self.model_service.get_fallback_model(&crate::ModelType::Embedding).await
                                            .unwrap_or_else(|_| "all-MiniLM-L6-v2".to_string());
                                        return Err(PipelineError::ModelError {
                                            model_id: model_id.to_string(),
                                            message,
                                            fallback,
                                        });
                                    }
                                }
                            }
                            Err(_) => {
                                warnings.push(ValidationWarningEnum::CompatibilityWarning {
                                    component: format!("Step '{}' model validation", step.name),
                                    message: format!("Could not validate model '{}'", model_id),
                                    level: ErrorWarningLevel::Medium,
                                });
                            }
                        }
                    }
                }
            }
        }

        Ok(warnings)
    }
}

#[async_trait]
impl PipelineService for PipelineServiceImpl {
    async fn create_pipeline(
        &self,
        name: String,
        description: String,
        template_id: Option<String>,
        parameters: Option<HashMap<String, serde_json::Value>>,
    ) -> PipelineResult<Pipeline> {
        let pipeline = if let Some(template_id) = template_id {
            let template = self.get_template(&template_id).await?;
            let params = parameters.unwrap_or_default();
            Pipeline::from_template(&template, name, params)
        } else {
            Pipeline::new(name, description)
        };

        // Validate the pipeline
        let validation = self.validate_pipeline(&pipeline.id).await?;
        if !validation.is_valid {
            let error_details = validation.errors
                .iter()
                .map(|e| e.message.clone())
                .collect::<Vec<_>>()
                .join("; ");
            return Err(PipelineError::ValidationFailed { details: error_details });
        }

        // Save to storage
        self.save_pipeline_to_storage(&pipeline).await?;

        // Store in memory
        {
            let mut pipelines = self.pipelines.write().await;
            pipelines.insert(pipeline.id.clone(), pipeline.clone());
        }

        // Update state manager
        // TODO: Implement state delta for pipeline creation

        Ok(pipeline)
    }

    async fn get_pipeline(&self, pipeline_id: &str) -> PipelineResult<Pipeline> {
        // Check memory first
        {
            let pipelines = self.pipelines.read().await;
            if let Some(pipeline) = pipelines.get(pipeline_id) {
                return Ok(pipeline.clone());
            }
        }

        // Load from storage
        let pipeline = self.load_pipeline_from_storage(pipeline_id).await?;

        // Cache in memory
        {
            let mut pipelines = self.pipelines.write().await;
            pipelines.insert(pipeline_id.to_string(), pipeline.clone());
        }

        Ok(pipeline)
    }

    async fn list_pipelines(&self) -> PipelineResult<Vec<Pipeline>> {
        let pipelines = self.pipelines.read().await;
        Ok(pipelines.values().cloned().collect())
    }

    async fn update_pipeline(&self, pipeline_id: &str, updates: PipelineUpdateRequest) -> PipelineResult<Pipeline> {
        let mut pipeline = self.get_pipeline(pipeline_id).await?;

        // Apply updates
        if let Some(name) = updates.name {
            pipeline.name = name;
        }
        if let Some(description) = updates.description {
            pipeline.description = description;
        }
        if let Some(spec) = updates.spec {
            pipeline.spec = spec;
        }
        if let Some(status) = updates.status {
            pipeline.status = status;
        }
        if let Some(tags) = updates.tags {
            pipeline.tags = tags;
        }
        pipeline.updated_at = Utc::now();

        // Validate the updated pipeline
        let validation = self.validate_pipeline(&pipeline.id).await?;
        if !validation.is_valid {
            let error_details = validation.errors
                .iter()
                .map(|e| e.message.clone())
                .collect::<Vec<_>>()
                .join("; ");
            return Err(PipelineError::ValidationFailed { details: error_details });
        }

        // Save to storage
        self.save_pipeline_to_storage(&pipeline).await?;

        // Update memory
        {
            let mut pipelines = self.pipelines.write().await;
            pipelines.insert(pipeline.id.clone(), pipeline.clone());
        }

        Ok(pipeline)
    }

    async fn delete_pipeline(&self, pipeline_id: &str) -> PipelineResult<()> {
        // Check if pipeline exists
        let _pipeline = self.get_pipeline(pipeline_id).await?;

        // TODO: Check for running executions and cancel them

        // Remove from storage
        // TODO: Implement actual deletion from SQL database

        // Remove from memory
        {
            let mut pipelines = self.pipelines.write().await;
            pipelines.remove(pipeline_id);
        }

        Ok(())
    }

    async fn execute_pipeline(
        &self,
        pipeline_id: &str,
        parameters: HashMap<String, serde_json::Value>,
        triggered_by: RunTrigger,
    ) -> PipelineResult<PipelineRun> {
        let pipeline = self.get_pipeline(pipeline_id).await?;

        // Validate pipeline before execution
        let validation = self.validate_pipeline(pipeline_id).await?;
        if !validation.is_valid {
            let error_details = validation.errors
                .iter()
                .map(|e| e.message.clone())
                .collect::<Vec<_>>()
                .join("; ");
            return Err(PipelineError::ValidationFailed { details: error_details });
        }

        // Create pipeline run
        let mut run = PipelineRun::new(pipeline_id.to_string(), triggered_by, parameters);
        run.metrics.steps_total = pipeline.spec.steps.len() as u32;

        // Store run in memory
        {
            let mut runs = self.runs.write().await;
            runs.insert(run.id.clone(), run.clone());
        }

        // Execute pipeline asynchronously
        let executor = self.executor.clone();
        let runs_store = self.runs.clone();
        let run_id = run.id.clone();
        let parameters = run.parameters.clone();

        tokio::spawn(async move {
            let execution_context = ExecutionContext {
                run_id: run_id.clone(),
                pipeline,
                parameters,
            };

            match executor.execute(execution_context).await {
                Ok(result) => {
                    // Update run with successful result
                    if let Some(run) = runs_store.write().await.get_mut(&run_id) {
                        run.status = PipelineRunStatus::Completed;
                        run.ended_at = Some(Utc::now());
                        run.metrics.steps_completed = result.steps_completed;
                        // TODO: Update more metrics from result
                    }
                }
                Err(error) => {
                    // Update run with error
                    if let Some(run) = runs_store.write().await.get_mut(&run_id) {
                        run.status = PipelineRunStatus::Failed;
                        run.ended_at = Some(Utc::now());
                        run.error_message = Some(error.to_string());
                    }
                }
            }
        });

        Ok(run)
    }

    async fn cancel_execution(&self, run_id: &str) -> PipelineResult<()> {
        // TODO: Implement execution cancellation
        // For now, just mark as cancelled
        {
            let mut runs = self.runs.write().await;
            if let Some(run) = runs.get_mut(run_id) {
                run.status = PipelineRunStatus::Cancelled;
                run.ended_at = Some(Utc::now());
            } else {
                return Err(PipelineError::NotFound { id: run_id.to_string() });
            }
        }
        Ok(())
    }

    async fn get_run(&self, run_id: &str) -> PipelineResult<PipelineRun> {
        let runs = self.runs.read().await;
        runs.get(run_id)
            .cloned()
            .ok_or_else(|| PipelineError::NotFound { id: run_id.to_string() })
    }

    async fn list_runs(&self, pipeline_id: Option<&str>) -> PipelineResult<Vec<PipelineRun>> {
        let runs = self.runs.read().await;
        let filtered_runs: Vec<PipelineRun> = runs.values()
            .filter(|run| {
                if let Some(pid) = pipeline_id {
                    &run.pipeline_id == pid
                } else {
                    true
                }
            })
            .cloned()
            .collect();
        Ok(filtered_runs)
    }

    async fn list_templates(&self) -> PipelineResult<Vec<PipelineTemplate>> {
        Ok(KB_CREATION_TEMPLATES.clone())
    }

    async fn get_template(&self, template_id: &str) -> PipelineResult<PipelineTemplate> {
        get_kb_creation_template(template_id)
            .ok_or_else(|| PipelineError::TemplateNotFound { template_id: template_id.to_string() })
    }

    async fn create_from_template(
        &self,
        template_id: &str,
        name: String,
        parameters: HashMap<String, serde_json::Value>,
    ) -> PipelineResult<Pipeline> {
        self.create_pipeline(name, format!("Created from template {}", template_id), Some(template_id.to_string()), Some(parameters)).await
    }

    async fn validate_pipeline(&self, pipeline_id: &str) -> PipelineResult<PipelineValidationResult> {
        let pipeline = self.get_pipeline(pipeline_id).await?;

        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate model dependencies
        match self.validate_model_dependencies(&pipeline.spec.steps).await {
            Ok(model_warnings) => {
                for model_warning in model_warnings {
                    warnings.push(ValidationWarning {
                        warning_type: ValidationWarningType::Compatibility,
                        node_id: None,
                        message: format!("{:?}", model_warning),
                        level: WarningLevel::Medium,
                    });
                }
            },
            Err(error) => errors.push(ValidationError {
                error_type: ValidationErrorType::ModelNotAvailable,
                node_id: None,
                message: error.to_string(),
                suggestions: vec!["Download the required model or choose a different embedding model".to_string()],
            }),
        }

        // Validate step dependencies
        for step in &pipeline.spec.steps {
            for dep_id in &step.dependencies {
                if !pipeline.spec.steps.iter().any(|s| &s.id == dep_id) {
                    errors.push(ValidationError {
                        error_type: ValidationErrorType::MissingConnection,
                        node_id: Some(step.id.clone()),
                        message: format!("Step '{}' depends on missing step '{}'", step.name, dep_id),
                        suggestions: vec![format!("Add step '{}' or remove the dependency", dep_id)],
                    });
                }
            }
        }

        // TODO: Add more validation rules (circular dependencies, resource conflicts, etc.)

        Ok(PipelineValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        })
    }

    async fn validate_template_parameters(
        &self,
        template_id: &str,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> PipelineResult<Vec<ValidationWarningEnum>> {
        let template = self.get_template(template_id).await?;
        let mut warnings = Vec::new();

        // Validate required parameters
        for (param_name, param_def) in &template.spec.parameters {
            if param_def.required && !parameters.contains_key(param_name) {
                warnings.push(ValidationWarningEnum::ParameterValidationFailed {
                    parameter: param_name.clone(),
                    reason: "Required parameter missing".to_string(),
                });
            }
        }

        // TODO: Add more parameter validation

        Ok(warnings)
    }

    async fn get_execution_metrics(&self) -> PipelineResult<PipelineExecutionMetrics> {
        let pipelines = self.pipelines.read().await;
        let runs = self.runs.read().await;

        let total_pipelines = pipelines.len() as u32;
        let active_pipelines = pipelines.values().filter(|p| matches!(p.status, PipelineStatus::Active)).count() as u32;
        let error_pipelines = pipelines.values().filter(|p| matches!(p.status, PipelineStatus::Error)).count() as u32;
        let draft_pipelines = pipelines.values().filter(|p| matches!(p.status, PipelineStatus::Draft)).count() as u32;
        let running_executions = runs.values().filter(|r| matches!(r.status, PipelineRunStatus::Running)).count() as u32;

        let completed_runs: Vec<&PipelineRun> = runs.values()
            .filter(|r| matches!(r.status, PipelineRunStatus::Completed))
            .collect();

        let avg_execution_time = if !completed_runs.is_empty() {
            let total_time: u64 = completed_runs.iter()
                .filter_map(|r| r.metrics.duration)
                .sum();
            total_time as f64 / completed_runs.len() as f64
        } else {
            0.0
        };

        let total_executions = runs.len() as u64;
        let successful_runs = completed_runs.len() as u64;
        let total_finished_runs = runs.values()
            .filter(|r| matches!(r.status, PipelineRunStatus::Completed | PipelineRunStatus::Failed))
            .count() as u64;

        let success_rate = if total_finished_runs > 0 {
            (successful_runs as f64 / total_finished_runs as f64) * 100.0
        } else {
            0.0
        };

        let last_24h_executions = runs.values()
            .filter(|r| {
                let now = Utc::now();
                let duration = now.signed_duration_since(r.started_at);
                duration.num_hours() <= 24
            })
            .count() as u32;

        Ok(PipelineExecutionMetrics {
            total_pipelines,
            active_pipelines,
            error_pipelines,
            draft_pipelines,
            running_executions,
            avg_execution_time,
            total_executions,
            success_rate,
            last_24h_executions,
        })
    }

    async fn get_pipeline_health(&self, pipeline_id: &str) -> PipelineResult<PipelineHealthStatus> {
        let pipeline = self.get_pipeline(pipeline_id).await?;
        let runs = self.list_runs(Some(pipeline_id)).await?;

        let last_execution_status = runs.iter()
            .max_by_key(|r| r.started_at)
            .map(|r| r.status.clone());

        let now = Utc::now();
        let error_count_24h = runs.iter()
            .filter(|r| {
                let duration = now.signed_duration_since(r.started_at);
                duration.num_hours() <= 24 && matches!(r.status, PipelineRunStatus::Failed)
            })
            .count() as u32;

        let runs_7d: Vec<&PipelineRun> = runs.iter()
            .filter(|r| {
                let duration = now.signed_duration_since(r.started_at);
                duration.num_days() <= 7
            })
            .collect();

        let successful_runs_7d = runs_7d.iter()
            .filter(|r| matches!(r.status, PipelineRunStatus::Completed))
            .count();

        let success_rate_7d = if !runs_7d.is_empty() {
            (successful_runs_7d as f64 / runs_7d.len() as f64) * 100.0
        } else {
            0.0
        };

        let avg_execution_time_7d = if !runs_7d.is_empty() {
            let total_time: u64 = runs_7d.iter()
                .filter_map(|r| r.metrics.duration)
                .sum();
            total_time as f64 / runs_7d.len() as f64
        } else {
            0.0
        };

        Ok(PipelineHealthStatus {
            pipeline_id: pipeline_id.to_string(),
            status: pipeline.status,
            last_execution_status,
            error_count_24h,
            success_rate_7d,
            avg_execution_time_7d,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio;

    // TODO: Implement unit tests for PipelineService
    // Following the pattern from other service tests
}