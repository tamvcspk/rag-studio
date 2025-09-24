/*!
 * State Manager Implementation
 *
 * Thread-safe state management using Arc<RwLock<AppState>> pattern for MVP.
 * Clear upgrade path to actor-based StateManager post-MVP.
 */

use std::sync::{Arc, RwLock};
use super::app_state::*;

/// Shared Application State Manager (MVP)
/// Thread-safe shared state with simple mutation API
pub struct StateManager {
    state: Arc<RwLock<AppState>>,
}

impl StateManager {
    /// Create new state manager with default state
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(AppState::default())),
        }
    }

    /// Create state manager with initial state
    pub fn with_state(state: AppState) -> Self {
        Self {
            state: Arc::new(RwLock::new(state)),
        }
    }

    /// Get a read lock on the state
    pub fn read_state(&self) -> std::sync::RwLockReadGuard<'_, AppState> {
        self.state.read().unwrap()
    }

    /// Apply a state mutation
    pub fn mutate(&self, delta: StateDelta) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        self.apply_delta(&mut state, delta)
    }

    /// Get clone of current state (for serialization/persistence)
    pub fn get_state_snapshot(&self) -> AppState {
        self.state.read().unwrap().clone()
    }

    /// Replace entire state (for loading from persistence)
    pub fn load_state(&self, new_state: AppState) {
        let mut state = self.state.write().unwrap();
        *state = new_state;
    }

    /// Apply delta mutation to state
    fn apply_delta(&self, state: &mut AppState, delta: StateDelta) -> Result<(), String> {
        match delta {
            StateDelta::KnowledgeBaseAdd { kb } => {
                state.knowledge_bases.insert(kb.id.clone(), kb);
            }
            StateDelta::KnowledgeBaseUpdate { id, updates } => {
                if let Some(kb) = state.knowledge_bases.get_mut(&id) {
                    // Apply updates (simplified for MVP)
                    if let Ok(updated_kb) = serde_json::from_value::<KnowledgeBaseState>(updates) {
                        *kb = updated_kb;
                    }
                }
            }
            StateDelta::KnowledgeBaseRemove { id } => {
                state.knowledge_bases.remove(&id);
            }

            StateDelta::RunAdd { run } => {
                state.pipeline_runs.insert(run.id.clone(), run);
            }
            StateDelta::RunUpdate { id, status, progress, error, metrics } => {
                if let Some(run) = state.pipeline_runs.get_mut(&id) {
                    run.status = status;
                    if let Some(p) = progress {
                        run.progress = p;
                    }
                    if let Some(e) = error {
                        run.error_message = Some(e);
                    }
                    if let Some(m) = metrics {
                        run.metrics = m;
                    }
                }
            }
            StateDelta::RunRemove { id } => {
                state.pipeline_runs.remove(&id);
            }

            StateDelta::ToolAdd { tool } => {
                state.tools.insert(tool.id.clone(), tool);
            }
            StateDelta::ToolUpdate { id, updates } => {
                if let Some(tool) = state.tools.get_mut(&id) {
                    if let Ok(updated_tool) = serde_json::from_value::<ToolState>(updates) {
                        *tool = updated_tool;
                    }
                }
            }
            StateDelta::ToolToggle { id, enabled } => {
                if let Some(tool) = state.tools.get_mut(&id) {
                    tool.enabled = enabled;
                }
            }

            StateDelta::MetricsUpdate { key, value } => {
                // Convert serde_json::Value to MetricValue
                let metric_value = if let Ok(metric) = serde_json::from_value::<MetricValue>(value.clone()) {
                    metric
                } else {
                    // Create a simple MetricValue from primitive types
                    MetricValue {
                        value: value.as_f64().unwrap_or(0.0),
                        timestamp: chrono::Utc::now(),
                        unit: "".to_string(),
                        tags: std::collections::HashMap::new(),
                    }
                };
                state.metrics.insert(key, metric_value);
            }

            StateDelta::LogAdd { entry } => {
                state.recent_logs.push(entry);
                // Keep only last 100 entries
                if state.recent_logs.len() > 100 {
                    state.recent_logs.remove(0);
                }
            }
            StateDelta::LogsPrune { before } => {
                state.recent_logs.retain(|log| log.timestamp > before);
            }

            StateDelta::ErrorAdd { error } => {
                state.errors.insert(error.id.clone(), error);
            }
            StateDelta::ErrorResolve { id } => {
                if let Some(error) = state.errors.get_mut(&id) {
                    error.resolved = true;
                }
            }

            StateDelta::LoadingSet { key, loading } => {
                if loading {
                    state.loading_states.insert(key, true);
                } else {
                    state.loading_states.remove(&key);
                }
            }

            StateDelta::SettingsUpdate { key, value } => {
                state.settings.insert(key, value);
            }
            StateDelta::SettingsRemove { key } => {
                state.settings.remove(&key);
            }
        }

        Ok(())
    }
}

impl Default for StateManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_state_manager_creation() {
        let manager = StateManager::new();
        let state = manager.read_state();
        assert!(state.knowledge_bases.is_empty());
        assert!(state.pipeline_runs.is_empty());
    }

    #[test]
    fn test_knowledge_base_mutations() {
        let manager = StateManager::new();

        let kb = KnowledgeBaseState {
            id: "test-kb".to_string(),
            name: "Test KB".to_string(),
            version: 1,
            status: KnowledgeBaseStatus::Active,
            embedder_model: "sentence-transformers/all-MiniLM-L6-v2".to_string(),
            health_score: 1.0,
            document_count: 0,
            chunk_count: 0,
            last_updated: Utc::now(),
            metadata: serde_json::json!({}),
        };

        // Add KB
        manager.mutate(StateDelta::KnowledgeBaseAdd { kb: kb.clone() }).unwrap();

        // Verify KB was added
        let state = manager.read_state();
        assert!(state.knowledge_bases.contains_key("test-kb"));
        assert_eq!(state.knowledge_bases["test-kb"].name, "Test KB");
    }

    #[test]
    fn test_pipeline_run_mutations() {
        let manager = StateManager::new();

        let run = PipelineRunState {
            id: "test-run".to_string(),
            pipeline_id: "test-pipeline".to_string(),
            kb_id: Some("test-kb".to_string()),
            status: PipelineRunStatus::Pending,
            started_at: None,
            completed_at: None,
            progress: 0.0,
            error_message: None,
            metrics: serde_json::json!({}),
        };

        // Add run
        manager.mutate(StateDelta::RunAdd { run: run.clone() }).unwrap();

        // Update run status
        manager.mutate(StateDelta::RunUpdate {
            id: "test-run".to_string(),
            status: PipelineRunStatus::Running,
            progress: Some(0.5),
            error: None,
            metrics: None,
        }).unwrap();

        // Verify run was updated
        let state = manager.read_state();
        assert!(state.pipeline_runs.contains_key("test-run"));
        assert!(matches!(state.pipeline_runs["test-run"].status, PipelineRunStatus::Running));
        assert_eq!(state.pipeline_runs["test-run"].progress, 0.5);
    }

    #[test]
    fn test_log_buffer_pruning() {
        let manager = StateManager::new();

        // Add more than 100 log entries
        for i in 0..105 {
            let log = LogEntry {
                id: format!("log-{}", i),
                timestamp: Utc::now(),
                level: LogLevel::Info,
                message: format!("Test message {}", i),
                source: "test".to_string(),
                trace_id: None,
                metadata: serde_json::json!({}),
            };

            manager.mutate(StateDelta::LogAdd { entry: log }).unwrap();
        }

        // Verify buffer is capped at 100
        let state = manager.read_state();
        assert_eq!(state.recent_logs.len(), 100);

        // Verify oldest entries were removed (should start from log-5)
        assert_eq!(state.recent_logs[0].id, "log-5");
        assert_eq!(state.recent_logs[99].id, "log-104");
    }
}