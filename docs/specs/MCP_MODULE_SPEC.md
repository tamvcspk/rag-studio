# MCP Module Specification

## Overview

The MCP (Model Context Protocol) Module is a sandboxed subprocess component of RAG Studio that provides secure, isolated execution of external tool integrations while maintaining high performance and reliability. It serves as the primary interface for AI agents and IDE clients to interact with RAG Studio's knowledge bases, pipelines, and administrative functions.

## Architecture

### Process Isolation
- **Subprocess Execution**: Runs as isolated subprocess for security and hot-swap capabilities
- **Sandbox Security**: 
  - Linux: seccomp filters for system call restriction
  - macOS: AppArmor-equivalent sandboxing
  - Windows: JobObject containment
- **Policy Engine**: Cedar-lite based capability policy enforcement
- **Default-Deny Permissions**: All operations require explicit permission grants
- **Optional In-Process Mode**: Available for low-latency operations during development

### Communication Architecture
- **Transport Layer**: Unix Domain Socket (UDS) with Axum HTTP server
- **Authentication**: SO_PEERCRED for process authentication + token headers
- **Protocol Support**:@
  - MCP stdio (required): Standard MCP protocol over stdin/stdout
  - HTTP /invoke (optional): REST-like interface with air-gapped blocking
- **Schema Versioning**: RPC schema versioning with backward compatibility
- **Circuit Breaker**: Resilience patterns with backpressure limits

## Core Components

### 1. Tool Registry & Handlers
```rust
pub struct ToolRegistry {
    handlers: HashMap<String, Box<dyn ToolHandler>>,
    permissions: PolicyEngine,
    capabilities: CapabilityMatrix,
}
```

**Responsibilities**:
- Dynamic tool binding and registration
- Behavior-driven tool execution
- Capability-based access control
- Permission escalation handling with user prompts

**Tool Categories**:
- `rag.*` - RAG search and answer operations
- `kb.*` - Knowledge base management operations  
- `admin.*` - Administrative and system functions

### 2. JSON-Schema Validation & Limits
```rust
pub struct InputValidator {
    schemas: HashMap<String, JsonSchema>,
    limits: ValidationLimits,
    fuzzing_protection: AntiDosGuards,
}
```

**Features**:
- Fuzz-resistant input validation
- Size and complexity limits enforcement
- Type safety guarantees
- Structured error responses
- Performance monitoring with tracing spans

**Validation Limits**:
- Maximum input size: 10MB
- Maximum nesting depth: 32 levels
- Maximum array length: 10,000 items
- Request timeout: 30 seconds

### 3. Dispatcher
```rust
pub struct Dispatcher {
    executor: ParallelExecutor,
    backpressure: BackpressureController,
    circuit_breaker: CircuitBreaker,
}
```

**Capabilities**:
- Parallel dispatch for hybrid tool calls
- Backpressure management with semaphore-based limits
- Circuit breaker pattern for fault tolerance
- Request queuing and load balancing
- Timeout handling and cancellation

### 4. OutboundPort Client
```rust
pub struct OutboundPortClient {
    http_client: AxumClient,
    auth: AuthManager,
    cache: LocalCache,
    schema: SchemaVersionManager,
}
```

**Features**:
- UDS/Axum client for Manager communication
- Local caching for frequent queries (LRU with TTL)
- Automatic retry with exponential backoff
- Schema version negotiation
- Connection pooling and keep-alive

**Cache Strategy**:
- KB metadata: 5 minute TTL
- Tool schemas: 1 hour TTL  
- User permissions: 15 minute TTL
- Maximum cache size: 100MB

### 5. Logging Adapter
```rust
pub struct LoggingAdapter {
    tracer: TracingSubscriber,
    outbound_sink: LogSink,
    structured_events: EventProcessor,
}
```

**Logging Pipeline**:
- Structured span collection with trace_id propagation
- Cross-process log forwarding to Manager
- Event correlation and context preservation
- Performance metrics collection (P50/P95 latencies)
- Error aggregation and alerting

## API Contract

### Core KB Operations

#### `kb.hybrid_search`
```json
{
  "method": "kb.hybrid_search",
  "params": {
    "collection": "string",
    "query": "string", 
    "top_k": "number",
    "filters": {
      "product": "string?",
      "version": "string?",
      "semverRange": "string?"
    },
    "cache_ttl": "number?"
  }
}
```
**Response**: Array of `Hit{chunk_id, score, snippet, citation, meta}`

#### `kb.answer`
```json
{
  "method": "kb.answer",
  "params": {
    "query": "string",
    "filters": "object?",
    "model": "string?"
  }
}
```
**Response**: `{text, citations[], confidence?}`

#### `kb.get_document`
```json
{
  "method": "kb.get_document", 
  "params": {
    "doc_id": "string",
    "range": "string?"
  }
}
```
**Response**: `Document{metadata, chunks?, license?}`

#### `kb.resolve_citations`
```json
{
  "method": "kb.resolve_citations",
  "params": {
    "chunk_ids": "string[]"
  }
}
```
**Response**: Array of `Citation{title, anchor/URL, license?, version?}`

#### `kb.stats`
```json
{
  "method": "kb.stats",
  "params": {
    "collection": "string?",
    "version": "string?"
  }
}
```
**Response**: `Stats{size, versions, embedder_version, health, eval_scores?}`

#### `kb.list_collections`
```json
{
  "method": "kb.list_collections",
  "params": {
    "filters": "object?"
  }
}
```
**Response**: Array of `KB{name, version, pinned?, flows?}`

#### `kb.compose_flow`
```json
{
  "method": "kb.compose_flow",
  "params": {
    "flow_id": "string",
    "params": "object?"
  }
}
```
**Response**: `{results, citations[]}`

### Administrative Operations

#### `admin.get_status`
```json
{
  "method": "admin.get_status",
  "params": {}
}
```
**Response**: `{status, version, uptime, health_checks}`

#### `admin.get_metrics`
```json
{
  "method": "admin.get_metrics", 
  "params": {
    "scope": "string?",
    "timerange": "string?"
  }
}
```
**Response**: `{metrics, histograms, counters}`

## Security Model

### Capability-Based Access Control
```rust
pub enum Capability {
    ReadKnowledgeBase(String),
    WriteKnowledgeBase(String), 
    ExecuteFlow(String),
    AdminAccess(AdminPermission),
    NetworkAccess(NetworkScope),
}
```

### Permission Matrix
| Operation | Default | Escalation Required | User Prompt |
|-----------|---------|---------------------|-------------|
| `kb.hybrid_search` | Allow | No | No |
| `kb.answer` | Allow | No | No |
| `kb.get_document` | Allow | No | No |
| `kb.list_collections` | Allow | No | No |
| `kb.compose_flow` | Deny | Yes | "Allow flow execution?" |
| `admin.*` | Deny | Yes | "Allow admin access?" |

### Sandbox Restrictions
- **Filesystem**: Read-only access to KB data directory only
- **Network**: Blocked in air-gapped mode, limited in normal mode
- **Process**: Cannot spawn child processes
- **Memory**: 512MB limit per subprocess
- **CPU**: 50% CPU limit per subprocess

## Performance Specifications

### Latency Targets
- Simple queries (`kb.list_collections`): <10ms P95
- Search operations (`kb.hybrid_search`): <100ms P95  
- Complex operations (`kb.answer`): <2000ms P95
- Administrative operations: <500ms P95

### Throughput Requirements
- Concurrent requests: 100 requests/second
- Parallel tool execution: Up to 10 concurrent operations
- Cache hit ratio: >80% for frequent operations
- Memory usage: <512MB per subprocess

### Reliability Metrics
- Availability: 99.9% uptime
- Error rate: <0.1% for well-formed requests
- Circuit breaker threshold: 5 failures in 60 seconds
- Recovery time: <5 seconds after failure resolution

## Resource Management

### Memory Management
```rust
pub struct ResourceLimits {
    max_memory: usize,        // 512MB
    max_request_size: usize,  // 10MB
    max_response_size: usize, // 100MB
    max_concurrent: usize,    // 100 requests
}
```

### Connection Management
- Connection pooling: 10 connections to Manager
- Keep-alive timeout: 60 seconds
- Idle connection timeout: 300 seconds
- Maximum connection lifetime: 1 hour

### Cache Management
- Local cache size: 100MB maximum
- Cache eviction: LRU with TTL-based expiry
- Cache warming: Proactive loading of frequently accessed data
- Cache invalidation: Event-driven based on Manager notifications

## Error Handling

### Error Categories
```rust
pub enum McpError {
    ValidationError(String),
    PermissionDenied(String),
    ResourceNotFound(String),
    ServiceUnavailable(String),
    InternalError(String),
    Timeout(Duration),
}
```

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "query",
      "reason": "exceeds maximum length"
    },
    "request_id": "uuid",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Recovery Strategies
- Automatic retry with exponential backoff
- Circuit breaker activation on repeated failures
- Graceful degradation with cached responses
- Failover to read-only mode during outages

## Monitoring & Observability

### Metrics Collection
- Request latency histograms (P50, P95, P99)
- Throughput counters by endpoint
- Error rate tracking by error type
- Cache hit/miss ratios
- Resource utilization (CPU, memory, connections)

### Tracing
- Distributed tracing with trace_id propagation
- Span collection for request lifecycle
- Cross-process correlation with Manager
- Performance bottleneck identification

### Health Checks
- Endpoint: `/health`
- Checks: Database connectivity, cache availability, resource limits
- Response time: <100ms
- Status codes: 200 (healthy), 503 (unhealthy)

## Configuration

### Runtime Configuration
```toml
[mcp]
subprocess = true
sandbox_enabled = true
max_memory_mb = 512
max_concurrent_requests = 100
request_timeout_seconds = 30

[mcp.security]
air_gapped_mode = false
default_deny = true
escalation_prompts = true

[mcp.performance]
cache_size_mb = 100
connection_pool_size = 10
circuit_breaker_threshold = 5

[mcp.logging]
level = "info"
structured_output = true
trace_propagation = true
```

### Hot Reload Support
- Configuration changes without restart
- Tool registry updates via Manager
- Permission policy updates
- Cache eviction on configuration changes

## Testing Strategy

### Unit Testing
- Tool handler validation
- Input/output schema compliance
- Permission enforcement
- Error handling coverage

### Integration Testing
- End-to-end MCP protocol flows
- Manager communication testing
- Subprocess isolation verification
- Performance benchmark validation

### Security Testing
- Penetration testing of sandbox boundaries
- Fuzz testing of input validation
- Permission escalation attempt detection
- Denial-of-service resilience testing

## Deployment Considerations

### Subprocess Management
- Automatic restart on crashes
- Graceful shutdown handling
- Process health monitoring
- Resource leak detection

### Hot-Swap Capability
- Zero-downtime updates
- Version compatibility checks
- Rollback mechanisms
- State preservation during updates

### Cross-Platform Compatibility
- Windows JobObject support
- Linux seccomp integration
- macOS sandbox compliance
- Unified configuration interface

## Future Enhancements

### Planned Features
- Multi-tenant isolation
- Plugin architecture for custom tools
- Advanced caching strategies
- Machine learning-based optimization

### Extensibility Points
- Custom tool handler interfaces
- Pluggable authentication mechanisms
- Configurable validation rules
- Custom logging adapters

This specification provides the foundation for implementing a secure, high-performance MCP module that meets RAG Studio's requirements for external tool integration while maintaining strong isolation and security boundaries.