/*!
 * Application State Definitions
 *
 * Core state structures and data types for the application.
 */

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

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