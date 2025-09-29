/*!
 * Pipeline Commands - Tauri command handlers for pipeline operations
 *
 * This module provides the Tauri command interface for pipeline management,
 * following the established pattern from kb_commands.rs and settings_commands.rs.
 *
 * Updated to use the real Pipeline implementation from core crate instead of mock API.
 */

use tauri::State;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{info, error};

use crate::manager::Manager;
use rag_core::state::StateDelta;
use rag_core::{
    Pipeline, PipelineRun, PipelineTemplate, PipelineStatus, PipelineRunStatus,
    ETLStepType, KB_CREATION_TEMPLATES, get_kb_creation_template,
    PipelineSpec, PipelineRunMetrics, RunTrigger, PipelineStep
};
use rag_core::modules::pipeline::TriggerType;

// Request/Response types for Tauri commands

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePipelineRequest {
    pub name: String,
    pub description: String,
    pub template_id: Option<String>,
    pub parameters: Option<HashMap<String, serde_json::Value>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePipelineRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub spec: Option<PipelineSpec>,
    pub status: Option<PipelineStatus>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutePipelineRequest {
    #[serde(rename = "pipelineId")]
    pub pipeline_id: String,
    pub parameters: Option<HashMap<String, serde_json::Value>>,
    #[serde(rename = "triggeredBy")]
    pub triggered_by: TriggerInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerInfo {
    #[serde(rename = "type")]
    pub trigger_type: String,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetPipelinesResponse {
    pub pipelines: Vec<Pipeline>,
    pub runs: Vec<PipelineRun>,
    pub metrics: PipelineExecutionMetrics,
}

// Tauri command handlers

#[tauri::command]
pub async fn get_pipelines(
    manager: State<'_, Arc<Manager>>,
) -> Result<GetPipelinesResponse, String> {
    info!("Getting pipelines list");
    // TODO: Implement actual pipeline retrieval from backend
    // For now, return mock data for Phase 4.4 implementation

    let mock_pipelines = vec![
        Pipeline {
            id: "pipeline-1".to_string(),
            name: "Documentation Sync".to_string(),
            description: "Syncs docs from GitHub repositories".to_string(),
            spec: PipelineSpec {
                version: "1.0.0".to_string(),
                steps: vec![
                    PipelineStep {
                        id: "step-1".to_string(),
                        name: "Fetch Data".to_string(),
                        step_type: ETLStepType::Fetch,
                        config: HashMap::new(),
                        inputs: vec![],
                        outputs: vec![],
                        dependencies: vec![],
                        retry_policy: None,
                        timeout: None,
                        parallelizable: false,
                    },
                    PipelineStep {
                        id: "step-2".to_string(),
                        name: "Parse Documents".to_string(),
                        step_type: ETLStepType::Parse,
                        config: HashMap::new(),
                        inputs: vec![],
                        outputs: vec![],
                        dependencies: vec!["step-1".to_string()],
                        retry_policy: None,
                        timeout: None,
                        parallelizable: false,
                    },
                ],
                parameters: HashMap::new(),
                resources: None,
                triggers: vec![],
            },
            status: PipelineStatus::Active,
            templates: vec![],
            last_run_at: Some(chrono::Utc::now()),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            tags: vec!["sync".to_string(), "github".to_string()],
            metadata: HashMap::new(),
        },
    ];

    let mock_runs = vec![
        PipelineRun {
            id: "run-1".to_string(),
            pipeline_id: "pipeline-1".to_string(),
            started_at: chrono::Utc::now(),
            ended_at: Some(chrono::Utc::now()),
            status: PipelineRunStatus::Completed,
            logs_ref: None,
            artifacts_ref: None,
            metrics: PipelineRunMetrics {
                duration: Some(900000), // 15 minutes in ms
                steps_completed: 2,
                steps_total: 2,
                steps_skipped: 0,
                steps_failed: 0,
                data_processed: None,
                records_processed: Some(1000),
                memory_used: None,
                cpu_used: None,
            },
            step_runs: vec![],
            triggered_by: RunTrigger {
                trigger_type: TriggerType::Manual,
                user_id: None,
                source: None,
                timestamp: chrono::Utc::now(),
            },
            parameters: std::collections::HashMap::new(),
            error_message: None,
            warnings: vec![],
        },
    ];

    let mock_metrics = PipelineExecutionMetrics {
        total_pipelines: 1,
        active_pipelines: 1,
        error_pipelines: 0,
        draft_pipelines: 0,
        running_executions: 0,
        avg_execution_time: 900.0,
        total_executions: 5,
        success_rate: 100.0,
        last_24h_executions: 2,
    };

    Ok(GetPipelinesResponse {
        pipelines: mock_pipelines,
        runs: mock_runs,
        metrics: mock_metrics,
    })
}

#[tauri::command]
pub async fn create_pipeline(
    request: CreatePipelineRequest,
    _manager: State<'_, Arc<Manager>>,
) -> Result<Pipeline, String> {
    info!("Creating pipeline: {}", request.name);
    // TODO: Implement actual pipeline creation
    // For now, return a mock pipeline

    let new_pipeline = Pipeline {
        id: format!("pipeline-{}", chrono::Utc::now().timestamp()),
        name: request.name,
        description: request.description,
        spec: PipelineSpec {
            version: "1.0.0".to_string(),
            steps: vec![],
            parameters: HashMap::new(),
            resources: None,
            triggers: vec![],
        },
        templates: vec![],
        last_run_at: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        status: PipelineStatus::Draft,
        tags: request.tags.unwrap_or_default(),
        metadata: HashMap::new(),
    };

    // Emit event for real-time updates
    // TODO: Implement event emission when event system is ready

    Ok(new_pipeline)
}

#[tauri::command]
pub async fn update_pipeline(
    request: UpdatePipelineRequest,
    _manager_state: State<'_, Arc<Manager>>,
) -> Result<Pipeline, String> {
    // TODO: Implement actual pipeline update
    // For now, return a mock updated pipeline

    let updated_pipeline = Pipeline {
        id: request.id.clone(),
        name: request.name.unwrap_or_else(|| "Updated Pipeline".to_string()),
        description: request.description.unwrap_or_else(|| "Updated description".to_string()),
        spec: request.spec.unwrap_or_else(|| PipelineSpec {
            version: "1.0.0".to_string(),
            steps: vec![],
            parameters: HashMap::new(),
            resources: None,
            triggers: vec![],
        }),
        templates: vec![],
        last_run_at: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        status: request.status.unwrap_or(PipelineStatus::Draft),
        tags: request.tags.unwrap_or_default(),
        metadata: HashMap::new(),
    };

    Ok(updated_pipeline)
}

#[tauri::command]
pub async fn delete_pipeline(
    _pipeline_id: String,
    _manager_state: State<'_, Arc<Manager>>,
) -> Result<(), String> {
    // TODO: Implement actual pipeline deletion
    // For now, just return success

    // Emit event for real-time updates
    // TODO: Implement event emission when event system is ready

    Ok(())
}

#[tauri::command]
pub async fn execute_pipeline(
    request: ExecutePipelineRequest,
    _manager_state: State<'_, Arc<Manager>>,
) -> Result<PipelineRun, String> {
    // TODO: Implement actual pipeline execution
    // For now, return a mock pipeline run

    let new_run = PipelineRun {
        id: format!("run-{}", chrono::Utc::now().timestamp()),
        pipeline_id: request.pipeline_id,
        started_at: chrono::Utc::now(),
        ended_at: None,
        status: PipelineRunStatus::Running,
        logs_ref: None,
        artifacts_ref: None,
        metrics: PipelineRunMetrics {
            duration: None,
            steps_completed: 0,
            steps_total: 1,
            steps_skipped: 0,
            steps_failed: 0,
            data_processed: None,
            records_processed: None,
            memory_used: None,
            cpu_used: None,
        },
        step_runs: vec![],
        triggered_by: RunTrigger {
            trigger_type: TriggerType::Manual,
            user_id: None,
            source: None,
            timestamp: chrono::Utc::now(),
        },
        parameters: request.parameters.unwrap_or_default(),
        error_message: None,
        warnings: vec![],
    };

    Ok(new_run)
}

#[tauri::command]
pub async fn cancel_pipeline_execution(
    _run_id: String,
    _manager_state: State<'_, Arc<Manager>>,
) -> Result<(), String> {
    // TODO: Implement actual pipeline execution cancellation
    Ok(())
}

#[tauri::command]
pub async fn get_pipeline_templates(
    _manager: State<'_, Arc<Manager>>,
) -> Result<Vec<PipelineTemplate>, String> {
    info!("Getting pipeline templates");

    // Return the KB creation templates from the core implementation
    Ok(KB_CREATION_TEMPLATES.clone())
}

#[tauri::command]
pub async fn validate_pipeline(
    _pipeline_id: String,
    _manager_state: State<'_, Arc<Manager>>,
) -> Result<PipelineValidationResult, String> {
    // TODO: Implement actual pipeline validation
    // For now, return mock validation result

    let validation_result = PipelineValidationResult {
        is_valid: true,
        errors: vec![],
        warnings: vec![],
    };

    Ok(validation_result)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub error_type: String,
    pub node_id: Option<String>,
    pub message: String,
    pub suggestions: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationWarning {
    pub warning_type: String,
    pub node_id: Option<String>,
    pub message: String,
    pub level: String,
}