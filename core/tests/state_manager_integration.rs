/*!
 * State Manager Integration Tests
 *
 * Tests complete state management workflows including cross-service interactions
 * and state synchronization across the application.
 */

use rag_core::state::{StateManager, StateDelta, KnowledgeBaseState, KnowledgeBaseStatus, PipelineRunState, PipelineRunStatus, LogEntry, LogLevel, ErrorState};
use chrono::Utc;

#[test]
fn test_state_manager_initialization() {
    let state_manager = StateManager::new();

    // Test that state manager initializes with default state
    let state = state_manager.read_state();
    assert!(state.knowledge_bases.is_empty());
    assert!(state.pipeline_runs.is_empty());
    assert!(state.schedules.is_empty());
    assert!(state.flows.is_empty());
    assert!(state.tools.is_empty());
    assert!(state.recent_logs.is_empty());
    assert!(state.errors.is_empty());
    assert!(state.loading_states.is_empty());
}

#[test]
fn test_state_manager_knowledge_base_mutations() {
    let state_manager = StateManager::new();

    // Test knowledge base operations
    let kb_state = KnowledgeBaseState {
        id: "test_kb".to_string(),
        name: "Test Knowledge Base".to_string(),
        version: 1,
        status: KnowledgeBaseStatus::Active,
        embedder_model: "test-model".to_string(),
        health_score: 0.95,
        document_count: 100,
        chunk_count: 500,
        last_updated: Utc::now(),
        metadata: serde_json::json!({"description": "Integration test KB"}),
    };

    state_manager.mutate(StateDelta::KnowledgeBaseAdd { kb: kb_state.clone() }).expect("Failed to add knowledge base");

    let state = state_manager.read_state();
    assert_eq!(state.knowledge_bases.len(), 1);
    assert!(state.knowledge_bases.contains_key("test_kb"));
    assert_eq!(state.knowledge_bases["test_kb"].name, "Test Knowledge Base");
    assert_eq!(state.knowledge_bases["test_kb"].document_count, 100);

    // Test knowledge base update
    let mut updated_kb = kb_state.clone();
    updated_kb.document_count = 150;
    updated_kb.health_score = 0.98;

    let updates = serde_json::to_value(&updated_kb).expect("Failed to serialize KB updates");
    state_manager.mutate(StateDelta::KnowledgeBaseUpdate {
        id: "test_kb".to_string(),
        updates
    }).expect("Failed to update knowledge base");

    let state = state_manager.read_state();
    assert_eq!(state.knowledge_bases["test_kb"].document_count, 150);
    assert_eq!(state.knowledge_bases["test_kb"].health_score, 0.98);

    // Test knowledge base removal
    state_manager.mutate(StateDelta::KnowledgeBaseRemove {
        id: "test_kb".to_string()
    }).expect("Failed to remove knowledge base");

    let state = state_manager.read_state();
    assert!(state.knowledge_bases.is_empty());
}

#[test]
fn test_state_manager_pipeline_runs() {
    let state_manager = StateManager::new();

    let run_state = PipelineRunState {
        id: "run_001".to_string(),
        pipeline_id: "pipeline_001".to_string(),
        kb_id: Some("kb_001".to_string()),
        status: PipelineRunStatus::Running,
        started_at: Some(Utc::now()),
        completed_at: None,
        progress: 45.0,
        error_message: None,
        metrics: serde_json::json!({"processed": 45, "total": 100}),
    };

    state_manager.mutate(StateDelta::RunAdd { run: run_state.clone() }).expect("Failed to add pipeline run");

    let state = state_manager.read_state();
    assert_eq!(state.pipeline_runs.len(), 1);
    assert!(state.pipeline_runs.contains_key("run_001"));
    assert!(matches!(state.pipeline_runs["run_001"].status, PipelineRunStatus::Running));
    assert_eq!(state.pipeline_runs["run_001"].progress, 45.0);

    // Test pipeline run completion
    state_manager.mutate(StateDelta::RunUpdate {
        id: "run_001".to_string(),
        status: PipelineRunStatus::Completed,
        progress: Some(100.0),
        error: None,
        metrics: Some(serde_json::json!({"processed": 100, "total": 100})),
    }).expect("Failed to update pipeline run");

    let state = state_manager.read_state();
    assert!(matches!(state.pipeline_runs["run_001"].status, PipelineRunStatus::Completed));
    assert_eq!(state.pipeline_runs["run_001"].progress, 100.0);
}

#[test]
fn test_state_manager_log_buffer() {
    let state_manager = StateManager::new();

    // Add multiple log entries
    for i in 0..150 {
        let log_entry = LogEntry {
            id: format!("log_{}", i),
            timestamp: Utc::now(),
            level: LogLevel::Info,
            message: format!("Test log message {}", i),
            source: "test".to_string(),
            trace_id: Some(format!("trace_{}", i)),
            metadata: serde_json::json!({"sequence": i}),
        };

        state_manager.mutate(StateDelta::LogAdd { entry: log_entry }).expect("Failed to add log entry");
    }

    let state = state_manager.read_state();
    // Should be capped at 100 entries
    assert_eq!(state.recent_logs.len(), 100);

    // Should contain the most recent entries (after pruning)
    assert!(state.recent_logs[0].message.contains("50")); // First kept entry
    assert!(state.recent_logs[99].message.contains("149")); // Last entry
}

#[test]
fn test_state_manager_loading_states() {
    let state_manager = StateManager::new();

    // Test setting loading state
    state_manager.mutate(StateDelta::LoadingSet {
        key: "data_processing".to_string(),
        loading: true,
    }).expect("Failed to set loading state");

    let state = state_manager.read_state();
    assert!(state.loading_states.contains_key("data_processing"));
    assert_eq!(state.loading_states["data_processing"], true);

    // Test clearing loading state
    state_manager.mutate(StateDelta::LoadingSet {
        key: "data_processing".to_string(),
        loading: false,
    }).expect("Failed to clear loading state");

    let state = state_manager.read_state();
    assert!(!state.loading_states.contains_key("data_processing"));
}

#[test]
fn test_state_manager_error_handling() {
    let state_manager = StateManager::new();

    let error_state = ErrorState {
        id: "error_001".to_string(),
        error_type: "validation_error".to_string(),
        message: "Invalid configuration detected".to_string(),
        source: Some("vector_service".to_string()),
        timestamp: Utc::now(),
        resolved: false,
        metadata: serde_json::json!({"component": "vector_db", "severity": "high"}),
    };

    state_manager.mutate(StateDelta::ErrorAdd { error: error_state.clone() }).expect("Failed to add error");

    let state = state_manager.read_state();
    assert!(state.errors.contains_key("error_001"));
    let error = &state.errors["error_001"];
    assert_eq!(error.error_type, "validation_error");
    assert_eq!(error.message, "Invalid configuration detected");
    assert_eq!(error.source, Some("vector_service".to_string()));
    assert!(!error.resolved);

    // Test resolving error
    state_manager.mutate(StateDelta::ErrorResolve {
        id: "error_001".to_string()
    }).expect("Failed to resolve error");

    let state = state_manager.read_state();
    assert!(state.errors["error_001"].resolved);
}

#[test]
fn test_state_manager_snapshot_and_load() {
    let state_manager = StateManager::new();

    // Add some data
    let kb_state = KnowledgeBaseState {
        id: "test_kb".to_string(),
        name: "Test Knowledge Base".to_string(),
        version: 1,
        status: KnowledgeBaseStatus::Active,
        embedder_model: "test-model".to_string(),
        health_score: 0.95,
        document_count: 100,
        chunk_count: 500,
        last_updated: Utc::now(),
        metadata: serde_json::json!({}),
    };

    state_manager.mutate(StateDelta::KnowledgeBaseAdd { kb: kb_state }).expect("Failed to add KB");

    // Take a snapshot
    let snapshot = state_manager.get_state_snapshot();
    assert_eq!(snapshot.knowledge_bases.len(), 1);

    // Create new state manager and load the snapshot
    let new_state_manager = StateManager::new();
    new_state_manager.load_state(snapshot);

    let loaded_state = new_state_manager.read_state();
    assert_eq!(loaded_state.knowledge_bases.len(), 1);
    assert!(loaded_state.knowledge_bases.contains_key("test_kb"));
}