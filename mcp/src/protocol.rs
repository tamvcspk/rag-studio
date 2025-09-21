/*!
 * MCP Protocol Implementation
 *
 * JSON-RPC 2.0 over stdin/stdout for MVP simplicity.
 * Upgrade path to UDS/HTTP transport post-MVP.
 */

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// JSON-RPC 2.0 Request
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct McpRequest {
    pub jsonrpc: String,
    pub method: String,
    pub params: Value,
    pub id: Option<Value>,
}

/// JSON-RPC 2.0 Response
#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum McpResponse {
    Success {
        jsonrpc: String,
        result: Value,
        id: Option<Value>,
    },
    Error {
        jsonrpc: String,
        error: JsonRpcError,
        id: Option<Value>,
    },
}

impl McpResponse {
    pub fn success(id: Option<Value>, result: Value) -> Self {
        Self::Success {
            jsonrpc: "2.0".to_string(),
            result,
            id,
        }
    }

    pub fn error(id: Option<Value>, error: JsonRpcError) -> Self {
        Self::Error {
            jsonrpc: "2.0".to_string(),
            error,
            id,
        }
    }
}

/// JSON-RPC 2.0 Error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    pub data: Option<Value>,
}

impl JsonRpcError {
    pub fn parse_error(message: &str) -> Self {
        Self {
            code: -32700,
            message: "Parse error".to_string(),
            data: Some(Value::String(message.to_string())),
        }
    }

    pub fn invalid_request(message: &str) -> Self {
        Self {
            code: -32600,
            message: "Invalid Request".to_string(),
            data: Some(Value::String(message.to_string())),
        }
    }

    pub fn method_not_found(method: &str) -> Self {
        Self {
            code: -32601,
            message: "Method not found".to_string(),
            data: Some(Value::String(format!("Method '{}' not found", method))),
        }
    }

    pub fn invalid_params(message: &str) -> Self {
        Self {
            code: -32602,
            message: "Invalid params".to_string(),
            data: Some(Value::String(message.to_string())),
        }
    }

    pub fn internal_error(message: &str) -> Self {
        Self {
            code: -32603,
            message: "Internal error".to_string(),
            data: Some(Value::String(message.to_string())),
        }
    }

    pub fn tool_error(message: &str) -> Self {
        Self {
            code: -32000,
            message: "Tool execution error".to_string(),
            data: Some(Value::String(message.to_string())),
        }
    }
}

/// Tool call request (MCP standard)
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ToolCall {
    pub name: String,
    pub arguments: HashMap<String, Value>,
}

/// Tool call result (MCP standard)
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ToolResult {
    pub content: Vec<ToolContent>,
    pub isError: Option<bool>,
}

impl ToolResult {
    pub fn success(content: Vec<ToolContent>) -> Self {
        Self {
            content,
            isError: Some(false),
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            content: vec![ToolContent::text(message)],
            isError: Some(true),
        }
    }
}

/// Tool content (MCP standard)
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ToolContent {
    #[serde(rename = "type")]
    pub content_type: String,
    pub text: String,
}

impl ToolContent {
    pub fn text(text: &str) -> Self {
        Self {
            content_type: "text".to_string(),
            text: text.to_string(),
        }
    }

    pub fn json(data: &Value) -> Self {
        Self {
            content_type: "text".to_string(),
            text: serde_json::to_string_pretty(data).unwrap_or_default(),
        }
    }
}

/// Tool definition (MCP standard)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub inputSchema: Value,
}

impl ToolDefinition {
    pub fn new(name: &str, description: &str, schema: Value) -> Self {
        Self {
            name: name.to_string(),
            description: description.to_string(),
            inputSchema: schema,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_json_rpc_request_parsing() {
        let json = r#"{"jsonrpc":"2.0","method":"test","params":{},"id":"1"}"#;
        let request: McpRequest = serde_json::from_str(json).unwrap();

        assert_eq!(request.jsonrpc, "2.0");
        assert_eq!(request.method, "test");
        assert_eq!(request.id, Some(Value::String("1".to_string())));
    }

    #[test]
    fn test_success_response_serialization() {
        let response = McpResponse::success(
            Some(Value::String("1".to_string())),
            serde_json::json!({"result": "ok"}),
        );

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"jsonrpc\":\"2.0\""));
        assert!(json.contains("\"result\""));
    }

    #[test]
    fn test_error_response_serialization() {
        let error = JsonRpcError::method_not_found("test_method");
        let response = McpResponse::error(Some(Value::String("1".to_string())), error);

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"error\""));
        assert!(json.contains("-32601"));
    }

    #[test]
    fn test_tool_call_parsing() {
        let json = r#"{"name":"kb.search","arguments":{"query":"test","top_k":10}}"#;
        let tool_call: ToolCall = serde_json::from_str(json).unwrap();

        assert_eq!(tool_call.name, "kb.search");
        assert_eq!(tool_call.arguments.len(), 2);
    }

    #[test]
    fn test_tool_result_creation() {
        let result = ToolResult::success(vec![
            ToolContent::text("Test result"),
            ToolContent::json(&serde_json::json!({"count": 5})),
        ]);

        assert_eq!(result.isError, Some(false));
        assert_eq!(result.content.len(), 2);
    }
}