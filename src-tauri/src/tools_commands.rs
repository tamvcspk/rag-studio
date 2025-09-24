/*!
 * Tools Management Commands
 *
 * Tauri commands for managing MCP tools - creation, update, deletion, testing, and monitoring.
 * Integrates with the Manager composition root and MCP server subprocess.
 */

use tauri::{State, Emitter};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use anyhow::Result;
use sha2::{Sha256, Digest};
use base64::Engine;
use tracing::{info, error};

use crate::manager::Manager;
use rag_core::state::{StateDelta, ToolState};

// Tool data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub id: String,
    pub name: String,
    pub endpoint: String,
    pub description: String,
    pub status: ToolStatus,
    #[serde(rename = "baseOperation")]
    pub base_operation: BaseOperation,
    #[serde(rename = "knowledgeBase")]
    pub knowledge_base: KnowledgeBaseRef,
    pub config: ToolConfig,
    pub permissions: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "lastUsed")]
    pub last_used: Option<DateTime<Utc>>,
    #[serde(rename = "errorMessage")]
    pub error_message: Option<String>,
    pub usage: Option<ToolUsageStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeBaseRef {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolConfig {
    #[serde(rename = "topK")]
    pub top_k: u32,
    #[serde(rename = "topN")]
    pub top_n: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolUsageStats {
    #[serde(rename = "totalCalls")]
    pub total_calls: u64,
    #[serde(rename = "avgLatency")]
    pub avg_latency: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ToolStatus {
    Active,
    Inactive,
    Error,
    Pending,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BaseOperation {
    #[serde(rename = "rag.search")]
    RagSearch,
    #[serde(rename = "rag.answer")]
    RagAnswer,
}

impl std::fmt::Display for BaseOperation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BaseOperation::RagSearch => write!(f, "rag.search"),
            BaseOperation::RagAnswer => write!(f, "rag.answer"),
        }
    }
}

// Request/Response structures
#[derive(Debug, Deserialize)]
pub struct CreateToolRequest {
    pub name: String,
    pub endpoint: String,
    pub description: String,
    #[serde(rename = "baseOperation")]
    pub base_operation: BaseOperation,
    #[serde(rename = "knowledgeBase")]
    pub knowledge_base: KnowledgeBaseRef,
    pub config: ToolConfig,
    pub permissions: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateToolRequest {
    pub id: String,
    pub name: Option<String>,
    pub endpoint: Option<String>,
    pub description: Option<String>,
    pub config: Option<ToolConfig>,
    pub permissions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ToolTestRequest {
    #[serde(rename = "toolId")]
    pub tool_id: String,
    #[serde(rename = "testQuery")]
    pub test_query: String,
    #[serde(rename = "testParams")]
    pub test_params: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize)]
pub struct ToolTestResult {
    pub success: bool,
    pub response: Option<serde_json::Value>,
    pub error: Option<String>,
    pub latency: Option<f64>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ToolExecutionMetrics {
    pub total_tools: u32,
    pub active_tools: u32,
    pub error_tools: u32,
    pub inactive_tools: u32,
    pub pending_tools: u32,
    pub avg_response_time: f64,
    pub total_executions: u64,
    pub success_rate: f64,
}

#[derive(Debug, Serialize)]
pub struct GetToolsResponse {
    pub tools: Vec<Tool>,
    pub metrics: ToolExecutionMetrics,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolExportData {
    pub tool: Tool,
    pub dependencies: Vec<String>,
    #[serde(rename = "exportedAt")]
    pub exported_at: DateTime<Utc>,
    pub format: String,
}

// Enhanced .ragpack file structures
#[derive(Debug, Serialize, Deserialize)]
pub struct RagPackMetadata {
    pub version: String,
    #[serde(rename = "toolVersion")]
    pub tool_version: String,
    pub compatibility: Vec<String>,
    pub description: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDependency {
    pub name: String,
    #[serde(rename = "dependencyType")]
    pub dependency_type: String, // "knowledge_base", "model", "service"
    pub version: String,
    pub required: bool,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct RagPackExportResult {
    #[serde(rename = "toolId")]
    pub tool_id: String,
    #[serde(rename = "toolName")]
    pub tool_name: String,
    #[serde(rename = "ragpackContent")]
    pub ragpack_content: Vec<u8>,
    #[serde(rename = "fileSize")]
    pub file_size: u64,
    pub checksum: String,
    pub dependencies: Vec<ToolDependency>,
    pub format: String,
    #[serde(rename = "exportedAt")]
    pub exported_at: DateTime<Utc>,
    #[serde(rename = "exportMetadata")]
    pub export_metadata: RagPackMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RagPackContent {
    pub metadata: RagPackMetadata,
    pub tool: Tool,
    pub dependencies: Vec<ToolDependency>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ImportToolRequest {
    #[serde(rename = "ragpackContent")]
    pub ragpack_content: Vec<u8>,
    #[serde(rename = "validateDependencies")]
    pub validate_dependencies: Option<bool>,
    #[serde(rename = "resolveDependencies")]
    pub resolve_dependencies: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ImportValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    #[serde(rename = "missingDependencies")]
    pub missing_dependencies: Vec<ToolDependency>,
    #[serde(rename = "conflictingTools")]
    pub conflicting_tools: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkExportRequest {
    #[serde(rename = "toolIds")]
    pub tool_ids: Vec<String>,
    pub format: String,
    #[serde(rename = "includeDependencies")]
    pub include_dependencies: bool,
}

#[derive(Debug, Serialize)]
pub struct BulkExportResult {
    #[serde(rename = "ragpackContent")]
    pub ragpack_content: Vec<u8>,
    #[serde(rename = "fileSize")]
    pub file_size: u64,
    pub checksum: String,
    #[serde(rename = "exportedTools")]
    pub exported_tools: Vec<String>,
    #[serde(rename = "exportedAt")]
    pub exported_at: DateTime<Utc>,
}

// Tauri Commands

#[tauri::command]
pub async fn get_tools(manager: State<'_, Manager>) -> Result<GetToolsResponse, String> {
    info!("Getting tools list");

    let state = manager.state_manager.read_state();

    // Convert ToolState from state to Tool format for frontend
    let mut tools: Vec<Tool> = state.tools.values().map(|tool_state| {
        Tool {
            id: tool_state.id.clone(),
            name: tool_state.name.clone(),
            endpoint: format!("tool.{}", tool_state.tool_type),
            description: tool_state.config.get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("No description")
                .to_string(),
            status: if tool_state.enabled { ToolStatus::Active } else { ToolStatus::Inactive },
            base_operation: BaseOperation::RagSearch, // Default for MVP
            knowledge_base: KnowledgeBaseRef {
                name: tool_state.config.get("knowledge_base")
                    .and_then(|v| v.as_str())
                    .unwrap_or("default_kb")
                    .to_string(),
                version: "1.0".to_string(),
            },
            config: ToolConfig {
                top_k: tool_state.config.get("top_k")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(10) as u32,
                top_n: tool_state.config.get("top_n")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(5) as u32,
            },
            permissions: vec!["kb.read".to_string()],
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_used: tool_state.last_used,
            error_message: None,
            usage: Some(ToolUsageStats {
                total_calls: tool_state.usage_count,
                avg_latency: 250.5, // Mock value for MVP
            }),
        }
    }).collect();

    // If no tools in state, return mock data for MVP
    if tools.is_empty() {
        tools = vec![
        Tool {
            id: "tool_1".to_string(),
            name: "RAG Search Tool".to_string(),
            endpoint: "kb.hybrid_search".to_string(),
            description: "Hybrid vector + BM25 search with citations".to_string(),
            status: ToolStatus::Active,
            base_operation: BaseOperation::RagSearch,
            knowledge_base: KnowledgeBaseRef {
                name: "default_kb".to_string(),
                version: "1.0".to_string(),
            },
            config: ToolConfig {
                top_k: 10,
                top_n: 5,
            },
            permissions: vec!["kb.read".to_string()],
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_used: Some(Utc::now()),
            error_message: None,
            usage: Some(ToolUsageStats {
                total_calls: 150,
                avg_latency: 250.5,
            }),
        },
        Tool {
            id: "tool_2".to_string(),
            name: "RAG Answer Tool".to_string(),
            endpoint: "kb.generate_answer".to_string(),
            description: "Generate comprehensive answers from knowledge base".to_string(),
            status: ToolStatus::Active,
            base_operation: BaseOperation::RagAnswer,
            knowledge_base: KnowledgeBaseRef {
                name: "default_kb".to_string(),
                version: "1.0".to_string(),
            },
            config: ToolConfig {
                top_k: 5,
                top_n: 3,
            },
            permissions: vec!["kb.read".to_string(), "llm.generate".to_string()],
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_used: Some(Utc::now()),
            error_message: None,
            usage: Some(ToolUsageStats {
                total_calls: 85,
                avg_latency: 1200.0,
            }),
        },
        ];
    }

    let metrics = ToolExecutionMetrics {
        total_tools: tools.len() as u32,
        active_tools: tools.iter().filter(|t| matches!(t.status, ToolStatus::Active)).count() as u32,
        error_tools: tools.iter().filter(|t| matches!(t.status, ToolStatus::Error)).count() as u32,
        inactive_tools: tools.iter().filter(|t| matches!(t.status, ToolStatus::Inactive)).count() as u32,
        pending_tools: tools.iter().filter(|t| matches!(t.status, ToolStatus::Pending)).count() as u32,
        avg_response_time: 725.25,
        total_executions: 235,
        success_rate: 0.96,
    };

    info!("Retrieved {} tools", tools.len());
    Ok(GetToolsResponse {
        tools,
        metrics,
    })
}

#[tauri::command]
pub async fn create_tool(
    tool_data: CreateToolRequest,
    manager: State<'_, Manager>,
    app_handle: tauri::AppHandle,
) -> Result<Tool, String> {
    info!("Creating tool: {}", tool_data.name);

    let tool_id = Uuid::new_v4().to_string();

    // Create ToolState for StateManager
    let tool_state = ToolState {
        id: tool_id.clone(),
        name: tool_data.name.clone(),
        tool_type: tool_data.base_operation.to_string(),
        enabled: true,
        last_used: None,
        usage_count: 0,
        config: serde_json::json!({
            "description": tool_data.description,
            "endpoint": tool_data.endpoint,
            "knowledge_base": tool_data.knowledge_base.name,
            "top_k": tool_data.config.top_k,
            "top_n": tool_data.config.top_n,
            "permissions": tool_data.permissions
        }),
        schema: serde_json::json!({}), // MVP: empty schema
    };

    // Add to state using StateManager
    manager.state_manager.mutate(StateDelta::ToolAdd { tool: tool_state.clone() })
        .map_err(|e| format!("Failed to add tool to state: {}", e))?;

    // Create response tool format
    let new_tool = Tool {
        id: tool_id.clone(),
        name: tool_data.name,
        endpoint: tool_data.endpoint,
        description: tool_data.description,
        status: ToolStatus::Active, // Start as active
        base_operation: tool_data.base_operation,
        knowledge_base: tool_data.knowledge_base,
        config: tool_data.config,
        permissions: tool_data.permissions,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        last_used: None,
        error_message: None,
        usage: Some(ToolUsageStats {
            total_calls: 0,
            avg_latency: 0.0,
        }),
    };

    // Emit event for real-time UI updates
    if let Err(e) = app_handle.emit("tool_created", &new_tool) {
        error!("Failed to emit tool_created event: {}", e);
    }

    // Emit state delta via manager
    manager.emit_state_delta("tool_created", serde_json::json!({
        "tool_id": tool_id,
        "name": new_tool.name
    })).await;

    info!("Tool created: {}", tool_id);
    Ok(new_tool)
}

#[tauri::command]
pub async fn update_tool(
    update_data: UpdateToolRequest,
    manager: State<'_, Manager>,
    app_handle: tauri::AppHandle,
) -> Result<Tool, String> {
    println!("🔧 update_tool command called: {}", update_data.id);

    // For MVP, simulate tool update
    let updated_tool = Tool {
        id: update_data.id.clone(),
        name: update_data.name.unwrap_or_else(|| "Updated Tool".to_string()),
        endpoint: update_data.endpoint.unwrap_or_else(|| "kb.updated".to_string()),
        description: update_data.description.unwrap_or_else(|| "Updated description".to_string()),
        status: ToolStatus::Active,
        base_operation: BaseOperation::RagSearch,
        knowledge_base: KnowledgeBaseRef {
            name: "default_kb".to_string(),
            version: "1.0".to_string(),
        },
        config: update_data.config.unwrap_or(ToolConfig { top_k: 10, top_n: 5 }),
        permissions: update_data.permissions.unwrap_or_else(|| vec!["kb.read".to_string()]),
        created_at: Utc::now() - chrono::Duration::hours(1), // Fake older creation time
        updated_at: Utc::now(),
        last_used: Some(Utc::now()),
        error_message: None,
        usage: Some(ToolUsageStats {
            total_calls: 50,
            avg_latency: 300.0,
        }),
    };

    // Emit event for real-time UI updates
    if let Err(e) = app_handle.emit("tool_updated", &updated_tool) {
        eprintln!("Failed to emit tool_updated event: {}", e);
    }

    Ok(updated_tool)
}

#[tauri::command]
pub async fn delete_tool(
    tool_id: String,
    manager: State<'_, Manager>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    println!("🔧 delete_tool command called: {}", tool_id);

    // For MVP, simulate tool deletion
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Emit event for real-time UI updates
    if let Err(e) = app_handle.emit("tool_deleted", serde_json::json!({
        "toolId": tool_id
    })) {
        eprintln!("Failed to emit tool_deleted event: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub async fn update_tool_status(
    tool_id: String,
    status: String,
    manager: State<'_, Manager>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    println!("🔧 update_tool_status command called: {} -> {}", tool_id, status);

    // For MVP, simulate status update
    let error_message = if status == "ERROR" {
        Some("Simulated error for testing".to_string())
    } else {
        None
    };

    // Emit event for real-time UI updates
    if let Err(e) = app_handle.emit("tool_status_changed", serde_json::json!({
        "toolId": tool_id,
        "status": status,
        "errorMessage": error_message
    })) {
        eprintln!("Failed to emit tool_status_changed event: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub async fn test_tool(
    test_request: ToolTestRequest,
    manager: State<'_, Manager>,
) -> Result<ToolTestResult, String> {
    println!("🔧 test_tool command called: {}", test_request.tool_id);

    let start_time = std::time::Instant::now();

    // For MVP, simulate tool testing
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

    let latency = start_time.elapsed().as_millis() as f64;

    // Simulate success or failure based on query content
    let success = !test_request.test_query.contains("error");

    let result = if success {
        ToolTestResult {
            success: true,
            response: Some(serde_json::json!({
                "results": [
                    {
                        "chunk_id": "chunk_test_1",
                        "score": 0.92,
                        "content": format!("Test result for query: {}", test_request.test_query),
                        "citation": {
                            "title": "Test Document",
                            "source": "test.md"
                        }
                    }
                ]
            })),
            error: None,
            latency: Some(latency),
            timestamp: Utc::now(),
        }
    } else {
        ToolTestResult {
            success: false,
            response: None,
            error: Some("Simulated test error".to_string()),
            latency: Some(latency),
            timestamp: Utc::now(),
        }
    };

    Ok(result)
}

#[tauri::command]
pub async fn export_tool(
    tool_id: String,
    format: String,
    include_dependencies: Option<bool>,
    manager: State<'_, Manager>,
) -> Result<RagPackExportResult, String> {
    println!("🔧 export_tool command called: {} ({})", tool_id, format);

    let include_deps = include_dependencies.unwrap_or(true);

    // Get the tool from manager (for MVP, use mock data)
    let tool = get_tool_by_id(&tool_id, &manager).await?;

    // Create dependency analysis
    let dependencies = if include_deps {
        analyze_tool_dependencies(&tool).await?
    } else {
        vec![]
    };

    // Generate .ragpack file content
    let ragpack_content = create_ragpack_content(&tool, &dependencies, &format)?;

    // Generate file metadata
    let file_size = ragpack_content.len() as u64;
    let checksum = calculate_checksum(&ragpack_content);

    let export_result = RagPackExportResult {
        tool_id: tool.id.clone(),
        tool_name: tool.name.clone(),
        ragpack_content,
        file_size,
        checksum,
        dependencies: dependencies.clone(),
        format: format.clone(),
        exported_at: Utc::now(),
        export_metadata: RagPackMetadata {
            version: "1.0".to_string(),
            tool_version: tool.updated_at.format("%Y%m%d_%H%M%S").to_string(),
            compatibility: vec!["rag-studio-1.0".to_string()],
            description: format!("Tool export: {}", tool.name),
            tags: vec!["tool".to_string(), tool.base_operation.to_string()],
        },
    };

    Ok(export_result)
}

#[tauri::command]
pub async fn import_tool(
    export_data: ToolExportData,
    manager: State<'_, Manager>,
    app_handle: tauri::AppHandle,
) -> Result<Tool, String> {
    println!("🔧 import_tool command called");

    // For MVP, create new tool from export data
    let mut imported_tool = export_data.tool;
    imported_tool.id = Uuid::new_v4().to_string(); // Generate new ID
    imported_tool.created_at = Utc::now();
    imported_tool.updated_at = Utc::now();
    imported_tool.last_used = None;
    imported_tool.status = ToolStatus::Pending;

    // Emit event for real-time UI updates
    if let Err(e) = app_handle.emit("tool_created", &imported_tool) {
        eprintln!("Failed to emit tool_created event: {}", e);
    }

    Ok(imported_tool)
}

#[tauri::command]
pub async fn import_tool_from_ragpack(
    import_request: ImportToolRequest,
    manager: State<'_, Manager>,
    app_handle: tauri::AppHandle,
) -> Result<Tool, String> {
    println!("🔧 import_tool_from_ragpack command called");

    // Parse the .ragpack file
    let ragpack_content = parse_ragpack_content(&import_request.ragpack_content)?;

    // Validate dependencies if requested
    if import_request.validate_dependencies.unwrap_or(true) {
        let validation_result = validate_tool_dependencies(&ragpack_content.dependencies, &manager).await?;
        if !validation_result.valid {
            return Err(format!("Validation failed: {}", validation_result.errors.join(", ")));
        }
    }

    // Create new tool from ragpack
    let mut imported_tool = ragpack_content.tool;
    imported_tool.id = Uuid::new_v4().to_string(); // Generate new ID
    imported_tool.created_at = Utc::now();
    imported_tool.updated_at = Utc::now();
    imported_tool.last_used = None;
    imported_tool.status = ToolStatus::Pending;

    // Resolve dependencies if requested
    if import_request.resolve_dependencies.unwrap_or(false) {
        resolve_tool_dependencies(&ragpack_content.dependencies, &manager).await?;
    }

    // Emit event for real-time UI updates
    if let Err(e) = app_handle.emit("tool_created", &imported_tool) {
        eprintln!("Failed to emit tool_created event: {}", e);
    }

    Ok(imported_tool)
}

#[tauri::command]
pub async fn validate_tool_import(
    ragpack_content: Vec<u8>,
    manager: State<'_, Manager>,
) -> Result<ImportValidationResult, String> {
    println!("🔧 validate_tool_import command called");

    // Parse the .ragpack file
    let parsed_content = parse_ragpack_content(&ragpack_content)?;

    // Validate dependencies
    let validation_result = validate_tool_dependencies(&parsed_content.dependencies, &manager).await?;

    Ok(validation_result)
}

// Helper functions for .ragpack export/import functionality

/// Get tool by ID from manager (MVP implementation with mock data)
async fn get_tool_by_id(tool_id: &str, _manager: &Manager) -> Result<Tool, String> {
    // For MVP, return mock tool data based on tool_id
    let mock_tool = Tool {
        id: tool_id.to_string(),
        name: format!("Tool {}", tool_id),
        endpoint: "kb.hybrid_search".to_string(),
        description: "Mock tool for export testing".to_string(),
        status: ToolStatus::Active,
        base_operation: BaseOperation::RagSearch,
        knowledge_base: KnowledgeBaseRef {
            name: "default_kb".to_string(),
            version: "1.0".to_string(),
        },
        config: ToolConfig {
            top_k: 10,
            top_n: 5,
        },
        permissions: vec!["kb.read".to_string()],
        created_at: Utc::now(),
        updated_at: Utc::now(),
        last_used: Some(Utc::now()),
        error_message: None,
        usage: Some(ToolUsageStats {
            total_calls: 100,
            avg_latency: 250.0,
        }),
    };

    Ok(mock_tool)
}

/// Analyze tool dependencies for export
async fn analyze_tool_dependencies(tool: &Tool) -> Result<Vec<ToolDependency>, String> {
    let mut dependencies = Vec::new();

    // Add knowledge base dependency
    dependencies.push(ToolDependency {
        name: tool.knowledge_base.name.clone(),
        dependency_type: "knowledge_base".to_string(),
        version: tool.knowledge_base.version.clone(),
        required: true,
        description: format!("Knowledge base required by {}", tool.name),
    });

    // Add operation-specific dependencies
    match tool.base_operation {
        BaseOperation::RagAnswer => {
            dependencies.push(ToolDependency {
                name: "llm.generator".to_string(),
                dependency_type: "service".to_string(),
                version: "1.0".to_string(),
                required: true,
                description: "LLM generation service for answer operations".to_string(),
            });
        },
        BaseOperation::RagSearch => {
            dependencies.push(ToolDependency {
                name: "vector.search".to_string(),
                dependency_type: "service".to_string(),
                version: "1.0".to_string(),
                required: true,
                description: "Vector search service for retrieval operations".to_string(),
            });
        }
    }

    Ok(dependencies)
}

/// Create .ragpack file content (ZIP format with JSON manifest)
fn create_ragpack_content(tool: &Tool, dependencies: &[ToolDependency], format: &str) -> Result<Vec<u8>, String> {
    use std::io::{Write, Cursor};
    use zip::write::{FileOptions, ZipWriter};

    let mut zip_data = Vec::new();
    let cursor = Cursor::new(&mut zip_data);
    let mut zip_writer = ZipWriter::new(cursor);

    // Create manifest content
    let ragpack_content = RagPackContent {
        metadata: RagPackMetadata {
            version: "1.0".to_string(),
            tool_version: tool.updated_at.format("%Y%m%d_%H%M%S").to_string(),
            compatibility: vec!["rag-studio-1.0".to_string()],
            description: format!("Tool export: {}", tool.name),
            tags: vec!["tool".to_string(), tool.base_operation.to_string()],
        },
        tool: tool.clone(),
        dependencies: dependencies.to_vec(),
        created_at: Utc::now(),
    };

    // Serialize manifest based on format
    let manifest_content = match format {
        "json" => serde_json::to_string_pretty(&ragpack_content)
            .map_err(|e| format!("Failed to serialize manifest as JSON: {}", e))?,
        "yaml" => serde_yaml::to_string(&ragpack_content)
            .map_err(|e| format!("Failed to serialize manifest as YAML: {}", e))?,
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    // Add manifest file to ZIP
    let manifest_filename = format!("manifest.{}", format);
    zip_writer.start_file(&manifest_filename, FileOptions::<()>::default())
        .map_err(|e| format!("Failed to create manifest file in ZIP: {}", e))?;
    zip_writer.write_all(manifest_content.as_bytes())
        .map_err(|e| format!("Failed to write manifest content: {}", e))?;

    // Add tool configuration file
    let tool_config = serde_json::to_string_pretty(tool)
        .map_err(|e| format!("Failed to serialize tool config: {}", e))?;
    zip_writer.start_file("tool_config.json", FileOptions::<()>::default())
        .map_err(|e| format!("Failed to create tool config file: {}", e))?;
    zip_writer.write_all(tool_config.as_bytes())
        .map_err(|e| format!("Failed to write tool config: {}", e))?;

    // Add dependencies file if any
    if !dependencies.is_empty() {
        let deps_config = serde_json::to_string_pretty(dependencies)
            .map_err(|e| format!("Failed to serialize dependencies: {}", e))?;
        zip_writer.start_file("dependencies.json", FileOptions::<()>::default())
            .map_err(|e| format!("Failed to create dependencies file: {}", e))?;
        zip_writer.write_all(deps_config.as_bytes())
            .map_err(|e| format!("Failed to write dependencies: {}", e))?;
    }

    // Add README with usage instructions
    let readme_content = format!(
        "# RAG Studio Tool Export: {}\n\n## Description\n{}\n\n## Operation Type\n{}\n\n## Dependencies\n{}\n\n## Import Instructions\n1. Open RAG Studio\n2. Navigate to Tools → Import\n3. Select this .ragpack file\n4. Follow the import wizard\n\n## Created\n{}\n",
        tool.name,
        tool.description,
        tool.base_operation.to_string(),
        dependencies.iter().map(|d| format!("- {} ({})", d.name, d.dependency_type)).collect::<Vec<_>>().join("\n"),
        tool.created_at.format("%Y-%m-%d %H:%M:%S UTC")
    );
    zip_writer.start_file("README.md", FileOptions::<()>::default())
        .map_err(|e| format!("Failed to create README file: {}", e))?;
    zip_writer.write_all(readme_content.as_bytes())
        .map_err(|e| format!("Failed to write README: {}", e))?;

    // Finish ZIP file
    zip_writer.finish()
        .map_err(|e| format!("Failed to finalize ZIP file: {}", e))?;

    Ok(zip_data)
}

/// Calculate SHA-256 checksum for file integrity
fn calculate_checksum(content: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content);
    let result = hasher.finalize();
    base64::engine::general_purpose::STANDARD.encode(result)
}

/// Parse .ragpack file content (ZIP format)
fn parse_ragpack_content(ragpack_data: &[u8]) -> Result<RagPackContent, String> {
    use std::io::{Cursor, Read};
    use zip::read::ZipArchive;

    let cursor = Cursor::new(ragpack_data);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to read ragpack archive: {}", e))?;

    // Look for manifest file (try JSON first, then YAML)
    let manifest_content = if archive.file_names().any(|name| name == "manifest.json") {
        let mut manifest_file = archive.by_name("manifest.json")
            .map_err(|e| format!("Failed to open manifest.json: {}", e))?;
        let mut content = String::new();
        manifest_file.read_to_string(&mut content)
            .map_err(|e| format!("Failed to read manifest.json: {}", e))?;
        serde_json::from_str::<RagPackContent>(&content)
            .map_err(|e| format!("Failed to parse JSON manifest: {}", e))?
    } else if archive.file_names().any(|name| name == "manifest.yaml") {
        let mut manifest_file = archive.by_name("manifest.yaml")
            .map_err(|e| format!("Failed to open manifest.yaml: {}", e))?;
        let mut content = String::new();
        manifest_file.read_to_string(&mut content)
            .map_err(|e| format!("Failed to read manifest.yaml: {}", e))?;
        serde_yaml::from_str::<RagPackContent>(&content)
            .map_err(|e| format!("Failed to parse YAML manifest: {}", e))?
    } else {
        return Err("No valid manifest file found in ragpack".to_string());
    };

    // Validate manifest version compatibility
    if !manifest_content.metadata.compatibility.contains(&"rag-studio-1.0".to_string()) {
        return Err(format!(
            "Incompatible ragpack version. Supports: {:?}",
            manifest_content.metadata.compatibility
        ));
    }

    Ok(manifest_content)
}

/// Validate tool dependencies
async fn validate_tool_dependencies(
    dependencies: &[ToolDependency],
    _manager: &Manager,
) -> Result<ImportValidationResult, String> {
    let mut validation_result = ImportValidationResult {
        valid: true,
        errors: Vec::new(),
        warnings: Vec::new(),
        missing_dependencies: Vec::new(),
        conflicting_tools: Vec::new(),
    };

    for dependency in dependencies {
        match dependency.dependency_type.as_str() {
            "knowledge_base" => {
                // For MVP, simulate KB validation
                if dependency.name == "missing_kb" {
                    validation_result.valid = false;
                    validation_result.errors.push(format!(
                        "Knowledge base '{}' not found",
                        dependency.name
                    ));
                    validation_result.missing_dependencies.push(dependency.clone());
                } else if dependency.name.starts_with("warning_") {
                    validation_result.warnings.push(format!(
                        "Knowledge base '{}' version mismatch (expected: {}, found: 1.1)",
                        dependency.name, dependency.version
                    ));
                }
            }
            "service" => {
                // For MVP, simulate service validation
                if dependency.name == "missing_service" {
                    validation_result.valid = false;
                    validation_result.errors.push(format!(
                        "Required service '{}' not available",
                        dependency.name
                    ));
                    validation_result.missing_dependencies.push(dependency.clone());
                }
            }
            "model" => {
                // For MVP, simulate model validation
                if dependency.name == "missing_model" {
                    validation_result.valid = false;
                    validation_result.errors.push(format!(
                        "Required model '{}' not installed",
                        dependency.name
                    ));
                    validation_result.missing_dependencies.push(dependency.clone());
                }
            }
            _ => {
                validation_result.warnings.push(format!(
                    "Unknown dependency type '{}' for {}",
                    dependency.dependency_type, dependency.name
                ));
            }
        }
    }

    Ok(validation_result)
}

/// Resolve tool dependencies (install/configure missing dependencies)
async fn resolve_tool_dependencies(
    dependencies: &[ToolDependency],
    _manager: &Manager,
) -> Result<(), String> {
    for dependency in dependencies {
        if dependency.required {
            match dependency.dependency_type.as_str() {
                "knowledge_base" => {
                    // For MVP, simulate KB creation/installation
                    println!("🔧 Resolving KB dependency: {}", dependency.name);
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                }
                "service" => {
                    // For MVP, simulate service start/configuration
                    println!("🔧 Resolving service dependency: {}", dependency.name);
                    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                }
                "model" => {
                    // For MVP, simulate model download/installation
                    println!("🔧 Resolving model dependency: {}", dependency.name);
                    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                }
                _ => {
                    return Err(format!(
                        "Cannot resolve unknown dependency type: {}",
                        dependency.dependency_type
                    ));
                }
            }
        }
    }

    Ok(())
}

// Bulk operations for import/export multiple tools

#[tauri::command]
pub async fn bulk_export_tools(
    export_request: BulkExportRequest,
    manager: State<'_, Manager>,
) -> Result<BulkExportResult, String> {
    println!("🔧 bulk_export_tools command called: {} tools", export_request.tool_ids.len());

    let mut exported_tools = Vec::new();
    let mut all_dependencies = Vec::new();
    let mut all_tools = Vec::new();

    // Collect all tools and their dependencies
    for tool_id in &export_request.tool_ids {
        let tool = get_tool_by_id(tool_id, &manager).await?;

        let dependencies = if export_request.include_dependencies {
            analyze_tool_dependencies(&tool).await?
        } else {
            vec![]
        };

        all_tools.push(tool);
        all_dependencies.extend(dependencies);
        exported_tools.push(tool_id.clone());
    }

    // Create bulk export content
    let bulk_content = create_bulk_ragpack_content(&all_tools, &all_dependencies, &export_request.format)?;

    // Generate file metadata
    let file_size = bulk_content.len() as u64;
    let checksum = calculate_checksum(&bulk_content);

    let export_result = BulkExportResult {
        ragpack_content: bulk_content,
        file_size,
        checksum,
        exported_tools,
        exported_at: Utc::now(),
    };

    Ok(export_result)
}

#[tauri::command]
pub async fn bulk_import_tools(
    ragpack_content: Vec<u8>,
    validate_dependencies: Option<bool>,
    resolve_dependencies: Option<bool>,
    manager: State<'_, Manager>,
    app_handle: tauri::AppHandle,
) -> Result<Vec<Tool>, String> {
    println!("🔧 bulk_import_tools command called");

    // Parse bulk .ragpack file
    let bulk_content = parse_bulk_ragpack_content(&ragpack_content)?;

    let mut imported_tools = Vec::new();

    // Validate all dependencies if requested
    if validate_dependencies.unwrap_or(true) {
        let validation_result = validate_tool_dependencies(&bulk_content.dependencies, &manager).await?;
        if !validation_result.valid {
            return Err(format!("Bulk validation failed: {}", validation_result.errors.join(", ")));
        }
    }

    // Resolve dependencies once for all tools if requested
    if resolve_dependencies.unwrap_or(false) {
        resolve_tool_dependencies(&bulk_content.dependencies, &manager).await?;
    }

    // Import each tool
    for tool_data in bulk_content.tools {
        let mut imported_tool = tool_data;
        imported_tool.id = Uuid::new_v4().to_string(); // Generate new ID
        imported_tool.created_at = Utc::now();
        imported_tool.updated_at = Utc::now();
        imported_tool.last_used = None;
        imported_tool.status = ToolStatus::Pending;

        // Emit event for real-time UI updates
        if let Err(e) = app_handle.emit("tool_created", &imported_tool) {
            eprintln!("Failed to emit tool_created event: {}", e);
        }

        imported_tools.push(imported_tool);
    }

    Ok(imported_tools)
}

// Helper functions for bulk operations

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkRagPackContent {
    pub metadata: RagPackMetadata,
    pub tools: Vec<Tool>,
    pub dependencies: Vec<ToolDependency>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

/// Create bulk .ragpack file content (ZIP format with multiple tools)
fn create_bulk_ragpack_content(tools: &[Tool], dependencies: &[ToolDependency], format: &str) -> Result<Vec<u8>, String> {
    use std::io::{Write, Cursor};
    use zip::write::{FileOptions, ZipWriter};

    let mut zip_data = Vec::new();
    let cursor = Cursor::new(&mut zip_data);
    let mut zip_writer = ZipWriter::new(cursor);

    // Create bulk manifest content
    let bulk_content = BulkRagPackContent {
        metadata: RagPackMetadata {
            version: "1.0".to_string(),
            tool_version: Utc::now().format("%Y%m%d_%H%M%S").to_string(),
            compatibility: vec!["rag-studio-1.0".to_string()],
            description: format!("Bulk tool export: {} tools", tools.len()),
            tags: vec!["bulk".to_string(), "tools".to_string()],
        },
        tools: tools.to_vec(),
        dependencies: dependencies.to_vec(),
        created_at: Utc::now(),
    };

    // Serialize manifest based on format
    let manifest_content = match format {
        "json" => serde_json::to_string_pretty(&bulk_content)
            .map_err(|e| format!("Failed to serialize bulk manifest as JSON: {}", e))?,
        "yaml" => serde_yaml::to_string(&bulk_content)
            .map_err(|e| format!("Failed to serialize bulk manifest as YAML: {}", e))?,
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    // Add manifest file to ZIP
    let manifest_filename = format!("bulk_manifest.{}", format);
    zip_writer.start_file(&manifest_filename, FileOptions::<()>::default())
        .map_err(|e| format!("Failed to create bulk manifest file in ZIP: {}", e))?;
    zip_writer.write_all(manifest_content.as_bytes())
        .map_err(|e| format!("Failed to write bulk manifest content: {}", e))?;

    // Add individual tool files
    for (index, tool) in tools.iter().enumerate() {
        let tool_config = serde_json::to_string_pretty(tool)
            .map_err(|e| format!("Failed to serialize tool config: {}", e))?;
        let tool_filename = format!("tools/tool_{}.json", index + 1);
        zip_writer.start_file(&tool_filename, FileOptions::<()>::default())
            .map_err(|e| format!("Failed to create tool file: {}", e))?;
        zip_writer.write_all(tool_config.as_bytes())
            .map_err(|e| format!("Failed to write tool config: {}", e))?;
    }

    // Add dependencies file if any
    if !dependencies.is_empty() {
        let deps_config = serde_json::to_string_pretty(dependencies)
            .map_err(|e| format!("Failed to serialize dependencies: {}", e))?;
        zip_writer.start_file("bulk_dependencies.json", FileOptions::<()>::default())
            .map_err(|e| format!("Failed to create dependencies file: {}", e))?;
        zip_writer.write_all(deps_config.as_bytes())
            .map_err(|e| format!("Failed to write dependencies: {}", e))?;
    }

    // Add README with usage instructions
    let tool_list = tools.iter()
        .map(|t| format!("- {} ({})", t.name, t.base_operation.to_string()))
        .collect::<Vec<_>>()
        .join("\n");

    let readme_content = format!(
        "# RAG Studio Bulk Tool Export\n\n## Tools Included\n{}\n\n## Dependencies\n{}\n\n## Import Instructions\n1. Open RAG Studio\n2. Navigate to Tools → Bulk Import\n3. Select this .ragpack file\n4. Review dependencies and conflicts\n5. Complete the bulk import process\n\n## Created\n{}\n",
        tool_list,
        dependencies.iter().map(|d| format!("- {} ({})", d.name, d.dependency_type)).collect::<Vec<_>>().join("\n"),
        Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    );
    zip_writer.start_file("README.md", FileOptions::<()>::default())
        .map_err(|e| format!("Failed to create README file: {}", e))?;
    zip_writer.write_all(readme_content.as_bytes())
        .map_err(|e| format!("Failed to write README: {}", e))?;

    // Finish ZIP file
    zip_writer.finish()
        .map_err(|e| format!("Failed to finalize bulk ZIP file: {}", e))?;

    Ok(zip_data)
}

/// Parse bulk .ragpack file content
fn parse_bulk_ragpack_content(ragpack_data: &[u8]) -> Result<BulkRagPackContent, String> {
    use std::io::{Cursor, Read};
    use zip::read::ZipArchive;

    let cursor = Cursor::new(ragpack_data);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to read bulk ragpack archive: {}", e))?;

    // Look for bulk manifest file (try JSON first, then YAML)
    let bulk_content = if archive.file_names().any(|name| name == "bulk_manifest.json") {
        let mut manifest_file = archive.by_name("bulk_manifest.json")
            .map_err(|e| format!("Failed to open bulk_manifest.json: {}", e))?;
        let mut content = String::new();
        manifest_file.read_to_string(&mut content)
            .map_err(|e| format!("Failed to read bulk_manifest.json: {}", e))?;
        serde_json::from_str::<BulkRagPackContent>(&content)
            .map_err(|e| format!("Failed to parse JSON bulk manifest: {}", e))?
    } else if archive.file_names().any(|name| name == "bulk_manifest.yaml") {
        let mut manifest_file = archive.by_name("bulk_manifest.yaml")
            .map_err(|e| format!("Failed to open bulk_manifest.yaml: {}", e))?;
        let mut content = String::new();
        manifest_file.read_to_string(&mut content)
            .map_err(|e| format!("Failed to read bulk_manifest.yaml: {}", e))?;
        serde_yaml::from_str::<BulkRagPackContent>(&content)
            .map_err(|e| format!("Failed to parse YAML bulk manifest: {}", e))?
    } else {
        return Err("No valid bulk manifest file found in ragpack".to_string());
    };

    // Validate manifest version compatibility
    if !bulk_content.metadata.compatibility.contains(&"rag-studio-1.0".to_string()) {
        return Err(format!(
            "Incompatible bulk ragpack version. Supports: {:?}",
            bulk_content.metadata.compatibility
        ));
    }

    Ok(bulk_content)
}

// Template management for pre-built tools

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    #[serde(rename = "baseOperation")]
    pub base_operation: BaseOperation,
    pub tags: Vec<String>,
    #[serde(rename = "isBuiltIn")]
    pub is_built_in: bool,
    #[serde(rename = "configTemplate")]
    pub config_template: ToolConfig,
    #[serde(rename = "defaultPermissions")]
    pub default_permissions: Vec<String>,
    #[serde(rename = "requiredDependencies")]
    pub required_dependencies: Vec<ToolDependency>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ToolTemplateLibrary {
    pub templates: Vec<ToolTemplate>,
    pub categories: Vec<String>,
    #[serde(rename = "totalCount")]
    pub total_count: u32,
}

#[tauri::command]
pub async fn get_tool_templates(
    category: Option<String>,
    _manager: State<'_, Manager>,
) -> Result<ToolTemplateLibrary, String> {
    println!("🔧 get_tool_templates command called");

    // For MVP, return predefined tool templates
    let mut templates = vec![
        // RAG Search Templates
        ToolTemplate {
            id: "template_basic_search".to_string(),
            name: "Basic RAG Search".to_string(),
            description: "Simple RAG search with vector + BM25 hybrid retrieval".to_string(),
            category: "search".to_string(),
            base_operation: BaseOperation::RagSearch,
            tags: vec!["basic".to_string(), "search".to_string(), "hybrid".to_string()],
            is_built_in: true,
            config_template: ToolConfig {
                top_k: 10,
                top_n: 5,
            },
            default_permissions: vec!["kb.read".to_string()],
            required_dependencies: vec![
                ToolDependency {
                    name: "vector.search".to_string(),
                    dependency_type: "service".to_string(),
                    version: "1.0".to_string(),
                    required: true,
                    description: "Vector search service".to_string(),
                }
            ],
            created_at: Utc::now(),
        },
        ToolTemplate {
            id: "template_advanced_search".to_string(),
            name: "Advanced RAG Search".to_string(),
            description: "Advanced RAG search with filtering and reranking".to_string(),
            category: "search".to_string(),
            base_operation: BaseOperation::RagSearch,
            tags: vec!["advanced".to_string(), "search".to_string(), "filtering".to_string()],
            is_built_in: true,
            config_template: ToolConfig {
                top_k: 20,
                top_n: 10,
            },
            default_permissions: vec!["kb.read".to_string(), "kb.filter".to_string()],
            required_dependencies: vec![
                ToolDependency {
                    name: "vector.search".to_string(),
                    dependency_type: "service".to_string(),
                    version: "1.0".to_string(),
                    required: true,
                    description: "Vector search service".to_string(),
                },
                ToolDependency {
                    name: "reranker.model".to_string(),
                    dependency_type: "model".to_string(),
                    version: "1.0".to_string(),
                    required: false,
                    description: "Cross-encoder reranking model".to_string(),
                }
            ],
            created_at: Utc::now(),
        },
        // RAG Answer Templates
        ToolTemplate {
            id: "template_basic_answer".to_string(),
            name: "Basic RAG Answer".to_string(),
            description: "Generate answers from knowledge base with citations".to_string(),
            category: "generation".to_string(),
            base_operation: BaseOperation::RagAnswer,
            tags: vec!["basic".to_string(), "generation".to_string(), "citations".to_string()],
            is_built_in: true,
            config_template: ToolConfig {
                top_k: 5,
                top_n: 3,
            },
            default_permissions: vec!["kb.read".to_string(), "llm.generate".to_string()],
            required_dependencies: vec![
                ToolDependency {
                    name: "vector.search".to_string(),
                    dependency_type: "service".to_string(),
                    version: "1.0".to_string(),
                    required: true,
                    description: "Vector search service".to_string(),
                },
                ToolDependency {
                    name: "llm.generator".to_string(),
                    dependency_type: "service".to_string(),
                    version: "1.0".to_string(),
                    required: true,
                    description: "LLM generation service".to_string(),
                }
            ],
            created_at: Utc::now(),
        },
        ToolTemplate {
            id: "template_conversational".to_string(),
            name: "Conversational RAG".to_string(),
            description: "Multi-turn conversational RAG with context memory".to_string(),
            category: "generation".to_string(),
            base_operation: BaseOperation::RagAnswer,
            tags: vec!["conversational".to_string(), "memory".to_string(), "chat".to_string()],
            is_built_in: true,
            config_template: ToolConfig {
                top_k: 8,
                top_n: 4,
            },
            default_permissions: vec!["kb.read".to_string(), "llm.generate".to_string(), "memory.store".to_string()],
            required_dependencies: vec![
                ToolDependency {
                    name: "vector.search".to_string(),
                    dependency_type: "service".to_string(),
                    version: "1.0".to_string(),
                    required: true,
                    description: "Vector search service".to_string(),
                },
                ToolDependency {
                    name: "llm.generator".to_string(),
                    dependency_type: "service".to_string(),
                    version: "1.0".to_string(),
                    required: true,
                    description: "LLM generation service".to_string(),
                },
                ToolDependency {
                    name: "memory.service".to_string(),
                    dependency_type: "service".to_string(),
                    version: "1.0".to_string(),
                    required: true,
                    description: "Conversation memory service".to_string(),
                }
            ],
            created_at: Utc::now(),
        },
    ];

    // Filter by category if specified
    if let Some(cat) = category {
        templates.retain(|t| t.category == cat);
    }

    let categories = vec![
        "search".to_string(),
        "generation".to_string(),
        "analysis".to_string(),
        "custom".to_string(),
    ];

    let library = ToolTemplateLibrary {
        total_count: templates.len() as u32,
        templates,
        categories,
    };

    Ok(library)
}

#[tauri::command]
pub async fn create_tool_from_template(
    template_id: String,
    tool_name: String,
    knowledge_base: KnowledgeBaseRef,
    custom_config: Option<ToolConfig>,
    _manager: State<'_, Manager>,
    app_handle: tauri::AppHandle,
) -> Result<Tool, String> {
    println!("🔧 create_tool_from_template command called: {}", template_id);

    // Get template (for MVP, use mock template lookup)
    let template = get_template_by_id(&template_id)?;

    // Create tool from template
    let tool_config = custom_config.unwrap_or(template.config_template);

    let new_tool = Tool {
        id: Uuid::new_v4().to_string(),
        name: tool_name,
        endpoint: format!("kb.{}", template.base_operation.to_string().replace(".", "_")),
        description: format!("Created from template: {}", template.name),
        status: ToolStatus::Pending,
        base_operation: template.base_operation,
        knowledge_base,
        config: tool_config,
        permissions: template.default_permissions,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        last_used: None,
        error_message: None,
        usage: None,
    };

    // Emit event for real-time UI updates
    if let Err(e) = app_handle.emit("tool_created", &new_tool) {
        eprintln!("Failed to emit tool_created event: {}", e);
    }

    // Simulate async processing (would validate dependencies and register with MCP server)
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Update status to active (simulate successful registration)
    let mut active_tool = new_tool.clone();
    active_tool.status = ToolStatus::Active;
    active_tool.updated_at = Utc::now();

    // Emit status update event
    if let Err(e) = app_handle.emit("tool_status_changed", serde_json::json!({
        "toolId": active_tool.id,
        "status": "ACTIVE",
        "errorMessage": null
    })) {
        eprintln!("Failed to emit tool_status_changed event: {}", e);
    }

    Ok(active_tool)
}

#[tauri::command]
pub async fn save_tool_as_template(
    tool_id: String,
    template_name: String,
    template_description: String,
    category: String,
    manager: State<'_, Manager>,
) -> Result<ToolTemplate, String> {
    println!("🔧 save_tool_as_template command called: {}", tool_id);

    // Get the tool (for MVP, use mock data)
    let tool = get_tool_by_id(&tool_id, &manager).await?;

    // Analyze dependencies
    let dependencies = analyze_tool_dependencies(&tool).await?;

    // Create template from tool
    let template = ToolTemplate {
        id: Uuid::new_v4().to_string(),
        name: template_name,
        description: template_description,
        category,
        base_operation: tool.base_operation,
        tags: vec!["custom".to_string(), "user".to_string()],
        is_built_in: false,
        config_template: tool.config,
        default_permissions: tool.permissions,
        required_dependencies: dependencies,
        created_at: Utc::now(),
    };

    // For MVP, simulate saving template to storage
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    Ok(template)
}

/// Helper function to get template by ID (MVP implementation)
fn get_template_by_id(template_id: &str) -> Result<ToolTemplate, String> {
    match template_id {
        "template_basic_search" => Ok(ToolTemplate {
            id: template_id.to_string(),
            name: "Basic RAG Search".to_string(),
            description: "Simple RAG search with vector + BM25 hybrid retrieval".to_string(),
            category: "search".to_string(),
            base_operation: BaseOperation::RagSearch,
            tags: vec!["basic".to_string(), "search".to_string()],
            is_built_in: true,
            config_template: ToolConfig { top_k: 10, top_n: 5 },
            default_permissions: vec!["kb.read".to_string()],
            required_dependencies: vec![],
            created_at: Utc::now(),
        }),
        "template_basic_answer" => Ok(ToolTemplate {
            id: template_id.to_string(),
            name: "Basic RAG Answer".to_string(),
            description: "Generate answers from knowledge base with citations".to_string(),
            category: "generation".to_string(),
            base_operation: BaseOperation::RagAnswer,
            tags: vec!["basic".to_string(), "generation".to_string()],
            is_built_in: true,
            config_template: ToolConfig { top_k: 5, top_n: 3 },
            default_permissions: vec!["kb.read".to_string(), "llm.generate".to_string()],
            required_dependencies: vec![],
            created_at: Utc::now(),
        }),
        _ => Err(format!("Template not found: {}", template_id)),
    }
}