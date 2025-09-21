/*!
 * Input Validation for MCP Tools
 *
 * MVP: Basic JSON Schema validation with size limits.
 * Upgrade path: Fuzz-resistant validation, capability policies.
 */

use anyhow::{Result, anyhow};
use serde_json::Value;
use std::collections::HashMap;
use tracing::debug;

use crate::protocol::ToolCall;

/// Input validator for MCP tool calls
pub struct InputValidator {
    max_query_length: usize,
    max_chunk_ids: usize,
    max_json_size: usize,
}

impl InputValidator {
    pub fn new() -> Result<Self> {
        Ok(Self {
            max_query_length: 10_000,   // 10KB query limit
            max_chunk_ids: 1_000,       // Max 1000 chunk IDs per request
            max_json_size: 1_000_000,   // 1MB JSON payload limit
        })
    }

    /// Validate a tool call
    pub fn validate_tool_call(&self, call: &ToolCall) -> Result<()> {
        debug!("Validating tool call: {}", call.name);

        // Basic size validation
        self.validate_json_size(&call.arguments)?;

        // Tool-specific validation
        match call.name.as_str() {
            "kb.hybrid_search" => self.validate_hybrid_search(call),
            "kb.get_document" => self.validate_get_document(call),
            "kb.resolve_citations" => self.validate_resolve_citations(call),
            "kb.stats" => self.validate_stats(call),
            "kb.list_collections" => self.validate_list_collections(call),
            _ => Err(anyhow!("Unknown tool: {}", call.name)),
        }
    }

    /// Validate JSON payload size
    fn validate_json_size(&self, args: &HashMap<String, Value>) -> Result<()> {
        let json_size = serde_json::to_string(args)
            .map(|s| s.len())
            .unwrap_or(0);

        if json_size > self.max_json_size {
            return Err(anyhow!(
                "JSON payload too large: {} bytes (max: {})",
                json_size,
                self.max_json_size
            ));
        }

        Ok(())
    }

    /// Validate hybrid search parameters
    fn validate_hybrid_search(&self, call: &ToolCall) -> Result<()> {
        // Validate required fields
        let collection = call.arguments.get("collection")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing required field: collection"))?;

        let query = call.arguments.get("query")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing required field: query"))?;

        // Validate collection name
        if collection.is_empty() || collection.len() > 100 {
            return Err(anyhow!("Invalid collection name length"));
        }

        if !collection.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
            return Err(anyhow!("Invalid collection name characters"));
        }

        // Validate query
        if query.is_empty() {
            return Err(anyhow!("Query cannot be empty"));
        }

        if query.len() > self.max_query_length {
            return Err(anyhow!(
                "Query too long: {} characters (max: {})",
                query.len(),
                self.max_query_length
            ));
        }

        // Validate top_k
        if let Some(top_k) = call.arguments.get("top_k").and_then(|v| v.as_i64()) {
            if top_k < 1 || top_k > 100 {
                return Err(anyhow!("top_k must be between 1 and 100"));
            }
        }

        // Validate cache_ttl
        if let Some(ttl) = call.arguments.get("cache_ttl").and_then(|v| v.as_i64()) {
            if ttl < 0 || ttl > 86400 {
                return Err(anyhow!("cache_ttl must be between 0 and 86400 seconds"));
            }
        }

        Ok(())
    }

    /// Validate get document parameters
    fn validate_get_document(&self, call: &ToolCall) -> Result<()> {
        let doc_id = call.arguments.get("doc_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing required field: doc_id"))?;

        // Validate doc_id
        if doc_id.is_empty() || doc_id.len() > 255 {
            return Err(anyhow!("Invalid doc_id length"));
        }

        // Basic sanitization check
        if doc_id.contains("..") || doc_id.contains("/") || doc_id.contains("\\") {
            return Err(anyhow!("Invalid doc_id: contains path traversal characters"));
        }

        // Validate range if provided
        if let Some(range) = call.arguments.get("range") {
            if let Some(range_obj) = range.as_object() {
                if let (Some(start), Some(end)) = (
                    range_obj.get("start").and_then(|v| v.as_i64()),
                    range_obj.get("end").and_then(|v| v.as_i64()),
                ) {
                    if start < 0 || end < 0 || start > end {
                        return Err(anyhow!("Invalid range: start and end must be non-negative and start <= end"));
                    }

                    if end - start > 1_000_000 {
                        return Err(anyhow!("Range too large: max 1MB"));
                    }
                }
            }
        }

        Ok(())
    }

    /// Validate resolve citations parameters
    fn validate_resolve_citations(&self, call: &ToolCall) -> Result<()> {
        let chunk_ids = call.arguments.get("chunk_ids")
            .and_then(|v| v.as_array())
            .ok_or_else(|| anyhow!("Missing required field: chunk_ids"))?;

        // Validate chunk_ids count
        if chunk_ids.is_empty() {
            return Err(anyhow!("chunk_ids cannot be empty"));
        }

        if chunk_ids.len() > self.max_chunk_ids {
            return Err(anyhow!(
                "Too many chunk_ids: {} (max: {})",
                chunk_ids.len(),
                self.max_chunk_ids
            ));
        }

        // Validate each chunk_id
        for (i, chunk_id) in chunk_ids.iter().enumerate() {
            let id_str = chunk_id.as_str()
                .ok_or_else(|| anyhow!("chunk_ids[{}] must be a string", i))?;

            if id_str.is_empty() || id_str.len() > 255 {
                return Err(anyhow!("Invalid chunk_id[{}] length", i));
            }

            // Basic sanitization
            if id_str.contains("..") || id_str.contains("/") || id_str.contains("\\") {
                return Err(anyhow!("Invalid chunk_id[{}]: contains invalid characters", i));
            }
        }

        Ok(())
    }

    /// Validate stats parameters
    fn validate_stats(&self, call: &ToolCall) -> Result<()> {
        // Collection is optional
        if let Some(collection) = call.arguments.get("collection").and_then(|v| v.as_str()) {
            if collection.is_empty() || collection.len() > 100 {
                return Err(anyhow!("Invalid collection name length"));
            }

            if !collection.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
                return Err(anyhow!("Invalid collection name characters"));
            }
        }

        // Version is optional
        if let Some(version) = call.arguments.get("version").and_then(|v| v.as_i64()) {
            if version < 0 {
                return Err(anyhow!("Version must be non-negative"));
            }
        }

        Ok(())
    }

    /// Validate list collections parameters
    fn validate_list_collections(&self, call: &ToolCall) -> Result<()> {
        // All parameters are optional, just validate filters if present
        if let Some(filters) = call.arguments.get("filters") {
            if !filters.is_object() {
                return Err(anyhow!("filters must be an object"));
            }
        }

        Ok(())
    }

    /// Sanitize string input (basic MVP implementation)
    pub fn sanitize_string(input: &str) -> String {
        input
            .chars()
            .filter(|c| !c.is_control() || *c == '\n' || *c == '\r' || *c == '\t')
            .take(10_000) // Truncate to max length
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_validator_creation() {
        let validator = InputValidator::new();
        assert!(validator.is_ok());
    }

    #[test]
    fn test_hybrid_search_validation_success() {
        let validator = InputValidator::new().unwrap();

        let mut args = HashMap::new();
        args.insert("collection".to_string(), json!("test_kb"));
        args.insert("query".to_string(), json!("test query"));
        args.insert("top_k".to_string(), json!(10));

        let call = ToolCall {
            name: "kb.hybrid_search".to_string(),
            arguments: args,
        };

        let result = validator.validate_tool_call(&call);
        assert!(result.is_ok());
    }

    #[test]
    fn test_hybrid_search_validation_missing_fields() {
        let validator = InputValidator::new().unwrap();

        let call = ToolCall {
            name: "kb.hybrid_search".to_string(),
            arguments: HashMap::new(),
        };

        let result = validator.validate_tool_call(&call);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Missing required field"));
    }

    #[test]
    fn test_hybrid_search_validation_invalid_top_k() {
        let validator = InputValidator::new().unwrap();

        let mut args = HashMap::new();
        args.insert("collection".to_string(), json!("test_kb"));
        args.insert("query".to_string(), json!("test query"));
        args.insert("top_k".to_string(), json!(1000)); // Too large

        let call = ToolCall {
            name: "kb.hybrid_search".to_string(),
            arguments: args,
        };

        let result = validator.validate_tool_call(&call);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("top_k must be between"));
    }

    #[test]
    fn test_get_document_validation_success() {
        let validator = InputValidator::new().unwrap();

        let mut args = HashMap::new();
        args.insert("doc_id".to_string(), json!("doc_123"));

        let call = ToolCall {
            name: "kb.get_document".to_string(),
            arguments: args,
        };

        let result = validator.validate_tool_call(&call);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_document_validation_path_traversal() {
        let validator = InputValidator::new().unwrap();

        let mut args = HashMap::new();
        args.insert("doc_id".to_string(), json!("../../../etc/passwd"));

        let call = ToolCall {
            name: "kb.get_document".to_string(),
            arguments: args,
        };

        let result = validator.validate_tool_call(&call);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("path traversal"));
    }

    #[test]
    fn test_resolve_citations_validation_success() {
        let validator = InputValidator::new().unwrap();

        let mut args = HashMap::new();
        args.insert("chunk_ids".to_string(), json!(["chunk_1", "chunk_2", "chunk_3"]));

        let call = ToolCall {
            name: "kb.resolve_citations".to_string(),
            arguments: args,
        };

        let result = validator.validate_tool_call(&call);
        assert!(result.is_ok());
    }

    #[test]
    fn test_resolve_citations_validation_empty_array() {
        let validator = InputValidator::new().unwrap();

        let mut args = HashMap::new();
        args.insert("chunk_ids".to_string(), json!([]));

        let call = ToolCall {
            name: "kb.resolve_citations".to_string(),
            arguments: args,
        };

        let result = validator.validate_tool_call(&call);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));
    }

    #[test]
    fn test_string_sanitization() {
        let input = "Normal text\x00with\x01control\x02chars\tand\nnewlines";
        let sanitized = InputValidator::sanitize_string(input);
        assert!(!sanitized.contains('\x00'));
        assert!(!sanitized.contains('\x01'));
        assert!(!sanitized.contains('\x02'));
        assert!(sanitized.contains('\t'));
        assert!(sanitized.contains('\n'));
    }

    #[test]
    fn test_json_size_validation() {
        let validator = InputValidator::new().unwrap();

        // Create a large JSON payload
        let large_string = "x".repeat(2_000_000); // 2MB string
        let mut args = HashMap::new();
        args.insert("large_field".to_string(), json!(large_string));

        let result = validator.validate_json_size(&args);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("JSON payload too large"));
    }

    #[test]
    fn test_unknown_tool_validation() {
        let validator = InputValidator::new().unwrap();

        let call = ToolCall {
            name: "unknown.tool".to_string(),
            arguments: HashMap::new(),
        };

        let result = validator.validate_tool_call(&call);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Unknown tool"));
    }
}