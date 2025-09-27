/*!
 * Domain Modules
 *
 * Business logic organized by domain following domain-driven design principles.
 * Each module contains its own service, models, schema, and error types.
 */

pub mod kb;
pub mod pipeline;

// Future domain modules:
// pub mod auth;
// pub mod flow;

// Re-export commonly used domain types
pub use kb::{KbService, KbServiceImpl, KbError, KbConfig, DocumentInfo, KbStats, KbInfo};
pub use pipeline::{
    PipelineService, PipelineServiceImpl, PipelineError, PipelineResult,
    Pipeline, PipelineRun, PipelineTemplate, ETLStepType, PipelineStatus,
    PipelineExecutor, ExecutionContext, StepResult, KB_CREATION_TEMPLATES,
    get_kb_creation_template
};