/*!
 * Application State Management (MVP)
 *
 * Simplified shared state using Arc<RwLock<AppState>> pattern for MVP.
 * This provides a clear upgrade path to actor-based StateManager post-MVP.
 */

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
// use uuid::Uuid; // For future use

/// Global Application State (MVP)
/// Shared state with Arc<RwLock<AppState>> pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    /// Knowledge Base Packs (FR-2)
    pub knowledge_bases: HashMap<String, KnowledgeBaseState>,

    /// Pipeline Runs (FR-3.4)
    pub pipeline_runs: HashMap<String, PipelineRunState>,

    /// Tool Registry (FR-1)
    pub tools: HashMap<String, ToolState>,

    /// Active Schedules (FR-4)
    pub schedules: HashMap<String, ScheduleState>,

    /// Flow Definitions (FR-6)
    pub flows: HashMap<String, FlowState>,

    /// Recent Logs Buffer (FR-8, cap ~100)
    pub recent_logs: Vec<LogEntry>,

    /// Performance Metrics (FR-8)
    pub metrics: HashMap<String, MetricValue>,

    /// Application Settings (FR-10)
    pub settings: HashMap<String, String>,

    /// Loading States (FR-11)
    pub loading_states: HashMap<String, bool>,

    /// Error States (FR-11)
    pub errors: HashMap<String, ErrorState>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            knowledge_bases: HashMap::new(),
            pipeline_runs: HashMap::new(),
            tools: HashMap::new(),
            schedules: HashMap::new(),
            flows: HashMap::new(),
            recent_logs: Vec::with_capacity(100),
            metrics: HashMap::new(),
            settings: HashMap::new(),
            loading_states: HashMap::new(),
            errors: HashMap::new(),
        }
    }
}

/// Knowledge Base State
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeBaseState {
    pub id: String,
    pub name: String,
    pub version: i32,
    pub status: KnowledgeBaseStatus,
    pub embedder_model: String,
    pub health_score: f64,
    pub document_count: usize,
    pub chunk_count: usize,
    pub last_updated: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KnowledgeBaseStatus {
    Active,
    Inactive,
    Building,
    Error(String),
}

/// Pipeline Run State
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineRunState {
    pub id: String,
    pub pipeline_id: String,
    pub kb_id: Option<String>,
    pub status: PipelineRunStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub progress: f32,
    pub error_message: Option<String>,
    pub metrics: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PipelineRunStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// Tool State
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolState {
    pub id: String,
    pub name: String,
    pub tool_type: String,
    pub enabled: bool,
    pub last_used: Option<DateTime<Utc>>,
    pub usage_count: u64,
    pub config: serde_json::Value,
    pub schema: serde_json::Value,
}

/// Schedule State
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleState {
    pub id: String,
    pub name: String,
    pub cron_expression: String,
    pub pipeline_id: String,
    pub enabled: bool,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
    pub run_count: u64,
}

/// Flow State
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowState {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub definition: serde_json::Value,
    pub last_executed: Option<DateTime<Utc>>,
    pub execution_count: u64,
}

/// Log Entry for recent logs buffer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub message: String,
    pub source: String,
    pub trace_id: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

/// Metric Value for performance tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricValue {
    pub value: f64,
    pub timestamp: DateTime<Utc>,
    pub unit: String,
    pub tags: HashMap<String, String>,
}

/// Error State
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorState {
    pub id: String,
    pub error_type: String,
    pub message: String,
    pub source: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub resolved: bool,
    pub metadata: serde_json::Value,
}

/// State mutations for MVP (upgrade path to actor-based deltas)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateDelta {
    // Knowledge Base mutations
    KnowledgeBaseAdd {
        kb: KnowledgeBaseState,
    },
    KnowledgeBaseUpdate {
        id: String,
        updates: serde_json::Value,
    },
    KnowledgeBaseRemove {
        id: String,
    },

    // Pipeline Run mutations
    RunAdd {
        run: PipelineRunState,
    },
    RunUpdate {
        id: String,
        status: PipelineRunStatus,
        progress: Option<f32>,
        error: Option<String>,
        metrics: Option<serde_json::Value>,
    },
    RunRemove {
        id: String,
    },

    // Tool mutations
    ToolAdd {
        tool: ToolState,
    },
    ToolUpdate {
        id: String,
        updates: serde_json::Value,
    },
    ToolToggle {
        id: String,
        enabled: bool,
    },

    // Metrics mutations
    MetricsUpdate {
        key: String,
        value: MetricValue,
    },

    // Log mutations
    LogAdd {
        entry: LogEntry,
    },
    LogsPrune {
        before: DateTime<Utc>,
    },

    // Error mutations
    ErrorAdd {
        error: ErrorState,
    },
    ErrorResolve {
        id: String,
    },

    // Loading state mutations
    LoadingSet {
        key: String,
        loading: bool,
    },
}

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
    pub fn read_state(&self) -> std::sync::RwLockReadGuard<AppState> {
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
                state.metrics.insert(key, value);
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