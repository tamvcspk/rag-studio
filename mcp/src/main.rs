/*!
 * RAG MCP Server - Model Context Protocol Server for RAG Studio
 *
 * MVP Implementation:
 * - JSON-RPC over stdin/stdout for simplicity
 * - Basic subprocess isolation (process boundaries)
 * - Tool registry for kb.* operations
 * - Upgrade path to UDS/Axum with full sandboxing
 */

use std::io::{self, BufRead, BufReader, Write};
use clap::Parser;
use serde_json::Value;
use tracing::{info, error, debug, warn};
use anyhow::{Result, Context};

mod protocol;
mod tools;
mod validation;

use protocol::{McpRequest, McpResponse, JsonRpcError, ToolCall};
use tools::ToolRegistry;
use validation::InputValidator;

/// RAG MCP Server CLI arguments
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Enable debug logging
    #[arg(short, long)]
    debug: bool,

    /// Outbound RPC server URL for accessing RAG services
    #[arg(long, default_value = "http://localhost:3000")]
    outbound_url: String,

    /// Enable air-gapped mode (no outbound connections)
    #[arg(long)]
    air_gapped: bool,

    /// Tool capabilities file (JSON schema)
    #[arg(long)]
    capabilities: Option<String>,
}

/// MCP Server state
pub struct McpServer {
    tool_registry: ToolRegistry,
    validator: InputValidator,
    outbound_url: String,
    air_gapped: bool,
}

impl McpServer {
    pub fn new(outbound_url: String, air_gapped: bool) -> Result<Self> {
        let tool_registry = ToolRegistry::new()?;
        let validator = InputValidator::new()?;

        Ok(Self {
            tool_registry,
            validator,
            outbound_url,
            air_gapped,
        })
    }

    /// Process a single MCP request
    pub async fn process_request(&self, request: McpRequest) -> McpResponse {
        debug!("Processing MCP request: {:?}", request);

        match request.method.as_str() {
            "initialize" => self.handle_initialize(request).await,
            "tools/list" => self.handle_list_tools(request).await,
            "tools/call" => self.handle_tool_call(request).await,
            "ping" => self.handle_ping(request).await,
            _ => McpResponse::error(
                request.id.clone(),
                JsonRpcError::method_not_found(&request.method),
            ),
        }
    }

    /// Handle MCP initialization
    async fn handle_initialize(&self, request: McpRequest) -> McpResponse {
        info!("Initializing MCP server");

        let capabilities = serde_json::json!({
            "tools": {
                "listChanged": false,
                "supportsProgress": false
            },
            "resources": {},
            "prompts": {},
            "logging": {}
        });

        McpResponse::success(request.id, capabilities)
    }

    /// Handle tools list request
    async fn handle_list_tools(&self, request: McpRequest) -> McpResponse {
        debug!("Listing available tools");

        let tools = self.tool_registry.list_tools();
        let tools_array: Vec<Value> = tools.into_iter()
            .map(|tool| serde_json::to_value(tool).unwrap_or_default())
            .collect();

        McpResponse::success(request.id, serde_json::json!({
            "tools": tools_array
        }))
    }

    /// Handle tool call request
    async fn handle_tool_call(&self, request: McpRequest) -> McpResponse {
        let tool_call = match serde_json::from_value::<ToolCall>(request.params.clone()) {
            Ok(call) => call,
            Err(e) => {
                error!("Invalid tool call parameters: {}", e);
                return McpResponse::error(
                    request.id,
                    JsonRpcError::invalid_params(&format!("Invalid tool call: {}", e)),
                );
            }
        };

        debug!("Calling tool: {} with args: {:?}", tool_call.name, tool_call.arguments);

        // Validate input
        if let Err(e) = self.validator.validate_tool_call(&tool_call) {
            warn!("Tool call validation failed: {}", e);
            return McpResponse::error(
                request.id,
                JsonRpcError::invalid_params(&format!("Validation failed: {}", e)),
            );
        }

        // Execute tool
        match self.tool_registry.execute_tool(&tool_call, &self.outbound_url).await {
            Ok(result) => McpResponse::success(request.id, serde_json::to_value(result).unwrap_or_default()),
            Err(e) => {
                error!("Tool execution failed: {}", e);
                McpResponse::error(
                    request.id,
                    JsonRpcError::internal_error(&format!("Tool execution failed: {}", e)),
                )
            }
        }
    }

    /// Handle ping request
    async fn handle_ping(&self, request: McpRequest) -> McpResponse {
        McpResponse::success(request.id, serde_json::json!({
            "pong": true,
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "air_gapped": self.air_gapped
        }))
    }
}

/// Main MCP server loop - JSON-RPC over stdin/stdout
async fn run_stdio_server(server: McpServer) -> Result<()> {
    info!("Starting RAG MCP server on stdio");

    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let reader = BufReader::new(stdin.lock());

    for line in reader.lines() {
        let line = line.context("Failed to read from stdin")?;

        if line.trim().is_empty() {
            continue;
        }

        debug!("Received: {}", line);

        // Parse JSON-RPC request
        let request: McpRequest = match serde_json::from_str(&line) {
            Ok(req) => req,
            Err(e) => {
                error!("Failed to parse JSON-RPC request: {}", e);
                let error_response = McpResponse::error(
                    None,
                    JsonRpcError::parse_error(&format!("Invalid JSON: {}", e)),
                );

                if let Ok(response_json) = serde_json::to_string(&error_response) {
                    writeln!(stdout, "{}", response_json)?;
                    stdout.flush()?;
                }
                continue;
            }
        };

        // Process request
        let response = server.process_request(request).await;

        // Send response
        if let Ok(response_json) = serde_json::to_string(&response) {
            debug!("Sending: {}", response_json);
            writeln!(stdout, "{}", response_json)?;
            stdout.flush()?;
        } else {
            error!("Failed to serialize response");
        }
    }

    info!("MCP server shutting down");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize logging
    let log_level = if args.debug { "debug" } else { "info" };
    tracing_subscriber::fmt()
        .with_env_filter(format!("rag_mcp={},rag_core={}", log_level, log_level))
        .with_target(false)
        .with_ansi(false) // Disable ANSI for clean stdio
        .init();

    info!("RAG MCP Server starting (Version: {})", env!("CARGO_PKG_VERSION"));
    info!("Debug mode: {}", args.debug);
    info!("Air-gapped mode: {}", args.air_gapped);
    info!("Outbound URL: {}", args.outbound_url);

    // Create and run server
    let server = McpServer::new(args.outbound_url.clone(), args.air_gapped)
        .context("Failed to create MCP server")?;

    run_stdio_server(server).await
        .context("MCP server failed")?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_mcp_server_creation() {
        let server = McpServer::new("http://localhost:3000".to_string(), false);
        assert!(server.is_ok());
    }

    #[tokio::test]
    async fn test_ping_request() {
        let server = McpServer::new("http://localhost:3000".to_string(), false).unwrap();

        let request = McpRequest {
            jsonrpc: "2.0".to_string(),
            method: "ping".to_string(),
            params: serde_json::Value::Null,
            id: Some(serde_json::Value::String("test-1".to_string())),
        };

        let response = server.process_request(request).await;

        match response {
            McpResponse::Success { result, .. } => {
                assert!(result.get("pong").and_then(|v| v.as_bool()).unwrap_or(false));
            }
            _ => panic!("Expected success response"),
        }
    }

    #[tokio::test]
    async fn test_invalid_method() {
        let server = McpServer::new("http://localhost:3000".to_string(), false).unwrap();

        let request = McpRequest {
            jsonrpc: "2.0".to_string(),
            method: "invalid_method".to_string(),
            params: serde_json::Value::Null,
            id: Some(serde_json::Value::String("test-2".to_string())),
        };

        let response = server.process_request(request).await;

        match response {
            McpResponse::Error { error, .. } => {
                assert_eq!(error.code, -32601); // Method not found
            }
            _ => panic!("Expected error response"),
        }
    }
}