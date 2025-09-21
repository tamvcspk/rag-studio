/*!
 * MCP Tool Registry
 *
 * Implements the kb.* tool set for RAG operations.
 * MVP: Basic tool registration and execution.
 * Upgrade path: Dynamic tool loading, capability policies.
 */

use std::collections::HashMap;
use serde_json::{json, Value};
use anyhow::{Result, anyhow};
use tracing::{debug, error, info};

use crate::protocol::{ToolDefinition, ToolCall, ToolResult, ToolContent};

/// Tool registry for managing available MCP tools
pub struct ToolRegistry {
    tools: HashMap<String, ToolDefinition>,
}

impl ToolRegistry {
    pub fn new() -> Result<Self> {
        let mut registry = Self {
            tools: HashMap::new(),
        };

        // Register KB tools (MVP set)
        registry.register_kb_tools()?;

        info!("Tool registry initialized with {} tools", registry.tools.len());
        Ok(registry)
    }

    /// Register all knowledge base tools
    fn register_kb_tools(&mut self) -> Result<()> {
        // kb.hybrid_search - Core hybrid search functionality
        self.register_tool(ToolDefinition::new(
            "kb.hybrid_search",
            "Search knowledge bases using hybrid vector + BM25 search with citations",
            json!({
                "type": "object",
                "properties": {
                    "collection": {
                        "type": "string",
                        "description": "Knowledge base collection name"
                    },
                    "query": {
                        "type": "string",
                        "description": "Search query text"
                    },
                    "top_k": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 100,
                        "default": 10,
                        "description": "Number of results to return"
                    },
                    "filters": {
                        "type": "object",
                        "description": "Optional filters for search"
                    },
                    "cache_ttl": {
                        "type": "integer",
                        "description": "Cache TTL in seconds"
                    }
                },
                "required": ["collection", "query"]
            }),
        ));

        // kb.get_document - Document retrieval
        self.register_tool(ToolDefinition::new(
            "kb.get_document",
            "Retrieve a specific document by ID with optional range selection",
            json!({
                "type": "object",
                "properties": {
                    "doc_id": {
                        "type": "string",
                        "description": "Document ID to retrieve"
                    },
                    "range": {
                        "type": "object",
                        "properties": {
                            "start": {"type": "integer", "minimum": 0},
                            "end": {"type": "integer", "minimum": 0}
                        },
                        "description": "Optional range selection (start, end)"
                    }
                },
                "required": ["doc_id"]
            }),
        ));

        // kb.resolve_citations - Citation resolution
        self.register_tool(ToolDefinition::new(
            "kb.resolve_citations",
            "Resolve citations for given chunk IDs with license information",
            json!({
                "type": "object",
                "properties": {
                    "chunk_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Array of chunk IDs to resolve citations for"
                    }
                },
                "required": ["chunk_ids"]
            }),
        ));

        // kb.stats - KB statistics and health
        self.register_tool(ToolDefinition::new(
            "kb.stats",
            "Get knowledge base statistics and health metrics",
            json!({
                "type": "object",
                "properties": {
                    "collection": {
                        "type": "string",
                        "description": "Specific collection name (optional)"
                    },
                    "version": {
                        "type": "integer",
                        "description": "Specific version (optional)"
                    }
                }
            }),
        ));

        // kb.list_collections - List available KBs
        self.register_tool(ToolDefinition::new(
            "kb.list_collections",
            "List all available knowledge base collections",
            json!({
                "type": "object",
                "properties": {
                    "filters": {
                        "type": "object",
                        "description": "Optional filters for collection listing"
                    }
                }
            }),
        ));

        Ok(())
    }

    /// Register a new tool
    fn register_tool(&mut self, tool: ToolDefinition) {
        debug!("Registering tool: {}", tool.name);
        self.tools.insert(tool.name.clone(), tool);
    }

    /// List all available tools
    pub fn list_tools(&self) -> Vec<ToolDefinition> {
        self.tools.values().cloned().collect()
    }

    /// Execute a tool call
    pub async fn execute_tool(&self, call: &ToolCall, outbound_url: &str) -> Result<ToolResult> {
        debug!("Executing tool: {} with args: {:?}", call.name, call.arguments);

        match call.name.as_str() {
            "kb.hybrid_search" => self.execute_hybrid_search(call, outbound_url).await,
            "kb.get_document" => self.execute_get_document(call, outbound_url).await,
            "kb.resolve_citations" => self.execute_resolve_citations(call, outbound_url).await,
            "kb.stats" => self.execute_stats(call, outbound_url).await,
            "kb.list_collections" => self.execute_list_collections(call, outbound_url).await,
            _ => Err(anyhow!("Unknown tool: {}", call.name)),
        }
    }

    /// Execute hybrid search tool
    async fn execute_hybrid_search(&self, call: &ToolCall, outbound_url: &str) -> Result<ToolResult> {
        let collection = call.arguments.get("collection")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing required parameter: collection"))?;

        let query = call.arguments.get("query")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing required parameter: query"))?;

        let top_k = call.arguments.get("top_k")
            .and_then(|v| v.as_i64())
            .unwrap_or(10) as usize;

        let filters = call.arguments.get("filters").cloned();

        debug!("Hybrid search: collection={}, query={}, top_k={}", collection, query, top_k);

        // MVP: Call outbound RPC to RAG core services
        let request_body = json!({
            "method": "kb.hybrid_search",
            "params": {
                "collection": collection,
                "query": query,
                "top_k": top_k,
                "filters": filters
            }
        });

        match self.call_outbound_rpc(outbound_url, request_body).await {
            Ok(response) => {
                let default_results = Value::Array(vec![]);
                let results = response.get("results").unwrap_or(&default_results);

                // Format results with mandatory citations
                let formatted_results = if let Value::Array(results_array) = results {
                    results_array.iter()
                        .map(|result| {
                            let chunk_id = result.get("chunk_id").and_then(|v| v.as_str()).unwrap_or("unknown");
                            let score = result.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let content = result.get("content").and_then(|v| v.as_str()).unwrap_or("");
                            let default_citation = json!({});
                            let citation = result.get("citation").unwrap_or(&default_citation);

                            format!(
                                "Result {}: {} (score: {:.3})\nCitation: {}\n---",
                                chunk_id, content, score,
                                serde_json::to_string_pretty(citation).unwrap_or_default()
                            )
                        })
                        .collect::<Vec<_>>()
                        .join("\n\n")
                } else {
                    "No results found".to_string()
                };

                Ok(ToolResult::success(vec![
                    ToolContent::text(&formatted_results),
                    ToolContent::json(results),
                ]))
            }
            Err(e) => {
                error!("Hybrid search failed: {}", e);
                Ok(ToolResult::error(&format!("Search failed: {}", e)))
            }
        }
    }

    /// Execute get document tool
    async fn execute_get_document(&self, call: &ToolCall, outbound_url: &str) -> Result<ToolResult> {
        let doc_id = call.arguments.get("doc_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing required parameter: doc_id"))?;

        let range = call.arguments.get("range").cloned();

        debug!("Get document: doc_id={}, range={:?}", doc_id, range);

        let request_body = json!({
            "method": "kb.get_document",
            "params": {
                "doc_id": doc_id,
                "range": range
            }
        });

        match self.call_outbound_rpc(outbound_url, request_body).await {
            Ok(response) => {
                Ok(ToolResult::success(vec![
                    ToolContent::json(&response),
                ]))
            }
            Err(e) => Ok(ToolResult::error(&format!("Failed to get document: {}", e))),
        }
    }

    /// Execute resolve citations tool
    async fn execute_resolve_citations(&self, call: &ToolCall, outbound_url: &str) -> Result<ToolResult> {
        let chunk_ids = call.arguments.get("chunk_ids")
            .and_then(|v| v.as_array())
            .ok_or_else(|| anyhow!("Missing required parameter: chunk_ids"))?;

        debug!("Resolve citations for {} chunks", chunk_ids.len());

        let request_body = json!({
            "method": "kb.resolve_citations",
            "params": {
                "chunk_ids": chunk_ids
            }
        });

        match self.call_outbound_rpc(outbound_url, request_body).await {
            Ok(response) => {
                Ok(ToolResult::success(vec![
                    ToolContent::json(&response),
                ]))
            }
            Err(e) => Ok(ToolResult::error(&format!("Failed to resolve citations: {}", e))),
        }
    }

    /// Execute stats tool
    async fn execute_stats(&self, call: &ToolCall, outbound_url: &str) -> Result<ToolResult> {
        let collection = call.arguments.get("collection").and_then(|v| v.as_str());
        let version = call.arguments.get("version").and_then(|v| v.as_i64());

        debug!("Get stats: collection={:?}, version={:?}", collection, version);

        let request_body = json!({
            "method": "kb.stats",
            "params": {
                "collection": collection,
                "version": version
            }
        });

        match self.call_outbound_rpc(outbound_url, request_body).await {
            Ok(response) => {
                Ok(ToolResult::success(vec![
                    ToolContent::json(&response),
                ]))
            }
            Err(e) => Ok(ToolResult::error(&format!("Failed to get stats: {}", e))),
        }
    }

    /// Execute list collections tool
    async fn execute_list_collections(&self, call: &ToolCall, outbound_url: &str) -> Result<ToolResult> {
        let filters = call.arguments.get("filters").cloned();

        debug!("List collections with filters: {:?}", filters);

        let request_body = json!({
            "method": "kb.list_collections",
            "params": {
                "filters": filters
            }
        });

        match self.call_outbound_rpc(outbound_url, request_body).await {
            Ok(response) => {
                Ok(ToolResult::success(vec![
                    ToolContent::json(&response),
                ]))
            }
            Err(e) => Ok(ToolResult::error(&format!("Failed to list collections: {}", e))),
        }
    }

    /// Call outbound RPC service (placeholder for MVP)
    async fn call_outbound_rpc(&self, _outbound_url: &str, request: Value) -> Result<Value> {
        // MVP: Placeholder implementation
        // This would make HTTP/UDS calls to the Manager's outbound RPC server
        debug!("Outbound RPC call: {}", request);

        // For MVP, return mock responses
        match request.get("method").and_then(|v| v.as_str()) {
            Some("kb.hybrid_search") => Ok(json!({
                "results": [
                    {
                        "chunk_id": "chunk_1",
                        "document_id": "doc_1",
                        "kb_id": "test_kb",
                        "score": 0.95,
                        "content": "This is a sample search result from the knowledge base.",
                        "snippet": "This is a sample search result...",
                        "metadata": {"source": "mvp"},
                        "citation": {
                            "title": "Sample Document",
                            "source_path": "/documents/sample.md",
                            "license": "MIT",
                            "version": "1",
                            "anchor": "chunk_1"
                        }
                    }
                ]
            })),
            Some("kb.stats") => Ok(json!({
                "collection_name": "test_kb",
                "version": 1,
                "document_count": 100,
                "chunk_count": 1000,
                "size_bytes": 1024000,
                "health_score": 0.95,
                "embedder_version": "sentence-transformers/all-MiniLM-L6-v2",
                "last_updated": chrono::Utc::now().to_rfc3339()
            })),
            Some("kb.list_collections") => Ok(json!({
                "collections": [
                    {
                        "id": "test_kb_1",
                        "name": "Test Knowledge Base 1",
                        "version": 1,
                        "status": "Active",
                        "description": "Sample KB for testing",
                        "health_score": 0.95,
                        "pinned": false,
                        "flows": []
                    }
                ]
            })),
            _ => Ok(json!({
                "status": "ok",
                "message": "MVP placeholder response"
            })),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_registry_creation() {
        let registry = ToolRegistry::new().unwrap();
        assert!(!registry.tools.is_empty());
        assert!(registry.tools.contains_key("kb.hybrid_search"));
        assert!(registry.tools.contains_key("kb.get_document"));
        assert!(registry.tools.contains_key("kb.resolve_citations"));
        assert!(registry.tools.contains_key("kb.stats"));
        assert!(registry.tools.contains_key("kb.list_collections"));
    }

    #[test]
    fn test_list_tools() {
        let registry = ToolRegistry::new().unwrap();
        let tools = registry.list_tools();
        assert_eq!(tools.len(), 5); // kb.* tools

        let tool_names: Vec<&str> = tools.iter().map(|t| t.name.as_str()).collect();
        assert!(tool_names.contains(&"kb.hybrid_search"));
        assert!(tool_names.contains(&"kb.get_document"));
    }

    #[tokio::test]
    async fn test_hybrid_search_execution() {
        let registry = ToolRegistry::new().unwrap();

        let mut args = HashMap::new();
        args.insert("collection".to_string(), json!("test_kb"));
        args.insert("query".to_string(), json!("test query"));
        args.insert("top_k".to_string(), json!(5));

        let call = ToolCall {
            name: "kb.hybrid_search".to_string(),
            arguments: args,
        };

        let result = registry.execute_tool(&call, "http://localhost:3000").await;
        assert!(result.is_ok());

        let tool_result = result.unwrap();
        assert_eq!(tool_result.isError, Some(false));
        assert!(!tool_result.content.is_empty());
    }

    #[tokio::test]
    async fn test_invalid_tool_execution() {
        let registry = ToolRegistry::new().unwrap();

        let call = ToolCall {
            name: "invalid.tool".to_string(),
            arguments: HashMap::new(),
        };

        let result = registry.execute_tool(&call, "http://localhost:3000").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_missing_required_params() {
        let registry = ToolRegistry::new().unwrap();

        let call = ToolCall {
            name: "kb.hybrid_search".to_string(),
            arguments: HashMap::new(), // Missing required params
        };

        let result = registry.execute_tool(&call, "http://localhost:3000").await;
        assert!(result.is_err());
    }
}