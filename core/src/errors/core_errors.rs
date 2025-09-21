/*!
 * Core Application Errors
 *
 * Application-wide error types and conversion utilities.
 */

use thiserror::Error;

/// Core application error types
#[derive(Debug, Error)]
pub enum CoreError {
    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("Service error: {0}")]
    Service(String),

    #[error("State error: {0}")]
    State(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Authentication error: {0}")]
    Authentication(String),

    #[error("Authorization error: {0}")]
    Authorization(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Resource already exists: {0}")]
    AlreadyExists(String),

    #[error("External service error: {0}")]
    External(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    Database(String),
}

/// Result type alias for core operations
pub type CoreResult<T> = Result<T, CoreError>;

/// Trait for converting domain errors to core errors
pub trait IntoCoreError {
    fn into_core_error(self) -> CoreError;
}

/// Error context utility for better error messages
pub struct ErrorContext {
    pub operation: String,
    pub details: Option<serde_json::Value>,
}

impl ErrorContext {
    pub fn new(operation: &str) -> Self {
        Self {
            operation: operation.to_string(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}

/// Extension trait for adding context to errors
pub trait ErrorContextExt<T> {
    fn with_context(self, context: ErrorContext) -> CoreResult<T>;
}

impl<T, E> ErrorContextExt<T> for Result<T, E>
where
    E: Into<CoreError>,
{
    fn with_context(self, context: ErrorContext) -> CoreResult<T> {
        self.map_err(|e| {
            let core_error = e.into();
            match context.details {
                Some(details) => CoreError::Internal(format!(
                    "Operation '{}' failed: {} - Details: {}",
                    context.operation, core_error, details
                )),
                None => CoreError::Internal(format!(
                    "Operation '{}' failed: {}",
                    context.operation, core_error
                )),
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_core_error_display() {
        let error = CoreError::Configuration("Invalid setting".to_string());
        assert_eq!(error.to_string(), "Configuration error: Invalid setting");
    }

    #[test]
    fn test_error_context() {
        let context = ErrorContext::new("test_operation")
            .with_details(serde_json::json!({"key": "value"}));

        assert_eq!(context.operation, "test_operation");
        assert!(context.details.is_some());
    }

    #[test]
    fn test_error_context_ext() {
        let result: Result<i32, std::io::Error> = Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "File not found"
        ));

        let context = ErrorContext::new("read_file");
        let core_result = result.with_context(context);

        assert!(core_result.is_err());
        let error_msg = core_result.unwrap_err().to_string();
        assert!(error_msg.contains("read_file"));
        assert!(error_msg.contains("File not found"));
    }
}