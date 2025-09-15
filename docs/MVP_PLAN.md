# RAG Studio MVP Plan

**Version:** 1.0
**Date:** September 15, 2025
**Status:** Planning Phase

## Executive Summary

This document outlines the Minimum Viable Product (MVP) implementation plan for RAG Studio, a local-first, no-code/low-code application for building and operating personal Retrieval-Augmented Generation (RAG) systems. The MVP focuses on delivering core RAG functionality with a desktop application built on Tauri, Angular 20+, and Rust.

## Current State Analysis ✅

### COMPLETED FOUNDATIONS
- ✅ Angular 20+ frontend with standalone components and modern architecture
- ✅ Tauri v2 desktop framework setup
- ✅ Rust backend with PyO3 Python integration
- ✅ Complete component library (atomic/semantic/composite architecture)
- ✅ Design token system with SCSS and CSS custom properties
- ✅ MCP server foundation with basic structure
- ✅ Project builds successfully (879KB bundle, needs optimization)

### EXISTING COMPONENTS
- ✅ 60+ UI components in 3-tier architecture
- ✅ Dashboard, Tools, Knowledge Bases, Pipelines, Flows, Settings pages
- ✅ Toast notifications, dialogs, forms, navigation
- ✅ Main layout with sidebar
- ✅ Tauri commands for Python integration and MCP server management

## MVP Implementation Roadmap

### Phase 1: Core Backend Infrastructure 🚧
**Priority: CRITICAL | Estimated: 2-3 weeks**

#### 1.1 Database & Storage Layer
- [ ] **SQLite Setup**: Split databases (app_meta.db + events.db) with Diesel ORM
  - Implement async WAL mode for performance
  - Create migration system for schema versioning
  - Add backup and restore functionality
- [ ] **LanceDB Integration**: Vector database for embeddings storage
  - Async writes with atomic promotion
  - Generation-based garbage collection
  - ANN search optimization
- [ ] **Storage Service**: Local filesystem with quotas and ZIP pack management
  - 1-5GB configurable quotas
  - Auto-prune functionality with checksums
  - ZIP-based export/import system
- [ ] **Migration System**: Database schema versioning
  - Forward/backward compatible migrations
  - Data integrity validation

#### 1.2 State Management (Actor-based)
- [ ] **StateManager**: Actor system with mpsc channels per domain
  - Separate actors for KBs, Runs, Metrics
  - Batched persistence (1s intervals)
  - In-memory buffers with pagination
- [ ] **Event Sourcing**: Critical events in events.db for undo/redo
  - ACID event storage in SQLite
  - Event replay for state reconstruction
  - Full undo/redo support
- [ ] **Cache Service**: Memory TTL with dashmap, layered caching strategy
  - Request/Feature/Document level caching
  - TTL eviction with invalidation hooks
  - Generation ID tracking
- [ ] **Real-time Updates**: Tauri events for frontend state sync
  - Delta emission for UI updates
  - Optimistic updates with rollback

#### 1.3 Python Integration Enhancement
- [ ] **Embedding Service**: Out-of-process worker via UDS/bincode
  - Warm-pool pre-fork for performance
  - Health-check and rotation
  - Batch processing (32-64 items)
- [ ] **PyO3 Async**: Implement async patterns with pyo3-async crate
  - GIL release for concurrent operations
  - Timeout-based Rust fallbacks
  - Error propagation improvements
- [ ] **AI Functions**: Sentence-Transformers, FAISS, reranking models
  - Cross-encoder batch processing
  - Sequence length guards
  - Model warm-up and caching
- [ ] **Error Handling**: Comprehensive error propagation Python→Rust→Angular
  - Rich error context
  - User-friendly error messages
  - Recovery suggestions

### Phase 2: Knowledge Base Core 🎯
**Priority: HIGH | Estimated: 3-4 weeks**

#### 2.1 KB Data Model & API
- [ ] **KB Schema**: Collections, documents, chunks, metadata
  - Versioned content repositories
  - Document fingerprinting for deltas
  - Metadata enrichment pipeline
- [ ] **Versioning System**: KB versions with atomic promotion
  - Zero-copy promotion via symlinks
  - Rollback to previous versions
  - Epoch-based garbage collection
- [ ] **Ingest Pipeline**: fetch→parse→chunk→embed→index workflow
  - Parallel ETL processing with Tokio
  - Retry/backoff for failed operations
  - Progress tracking and reporting
- [ ] **Hybrid Search**: Vector (LanceDB) + BM25 (Rust implementation)
  - Parallel search execution
  - Adaptive candidate sets
  - Merge scoring algorithms

#### 2.2 MCP Server Implementation
- [ ] **Tool Registry**: `kb.*` tools for search, management, stats
  - `kb.hybrid_search` - Combined vector/lexical search
  - `kb.answer` - Full RAG with LLM integration
  - `kb.get_document` - Document retrieval
  - `kb.resolve_citations` - Citation resolution
  - `kb.stats` - Collection statistics
  - `kb.list_collections` - KB enumeration
- [ ] **Security Sandbox**: Subprocess isolation with seccomp/AppArmor
  - Default-deny permissions
  - Capability policy enforcement
  - Escalation prompts for privileged operations
- [ ] **JSON Schema Validation**: Fuzz-resistant input validation
  - Input limits and sanitization
  - Tracing spans for debugging
  - Comprehensive error reporting
- [ ] **Performance**: <100ms retrieval target with monitoring
  - P50/P95 latency tracking
  - Backpressure via semaphores
  - Circuit breaker patterns

#### 2.3 Citations & Quality
- [ ] **Mandatory Citations**: All responses include source citations
  - "No citation → no answer" policy
  - Citation enrichment with metadata
  - License information tracking
- [ ] **License Tracking**: Document licensing information
  - License detection and storage
  - Compliance reporting
  - Attribution requirements
- [ ] **Evaluation Gates**: Recall@k metrics, drift detection
  - Smoke tests for quality assurance
  - Statistical drift monitoring
  - Performance regression detection
- [ ] **Quality Assurance**: Smoke tests before index promotion
  - Automated quality checks
  - Manual review workflows
  - Quality score tracking

### Phase 3: Frontend Integration 📱
**Priority: HIGH | Estimated: 2-3 weeks**

#### 3.1 Knowledge Base Management UI
- [ ] **KB List View**: Display collections with metadata
  - Sortable/filterable collection grid
  - Status indicators and health metrics
  - Quick actions (search, delete, export)
- [ ] **Create KB Wizard**: Multi-step creation workflow
  - Document source selection
  - Configuration options (chunk size, embedding model)
  - Progress tracking with cancellation
- [ ] **Document Upload**: Drag-drop interface with progress
  - Bulk upload support
  - File type validation
  - Real-time progress indicators
- [ ] **Search Interface**: Query input with filters and results
  - Auto-complete and suggestions
  - Filter by collection, date, type
  - Result ranking and sorting

#### 3.2 Real-time Features
- [ ] **Live Status**: Ingest progress, server health, metrics
  - Real-time status dashboard
  - Health check indicators
  - Resource usage monitoring
- [ ] **Activity Logs**: Recent operations and system events
  - Filterable activity timeline
  - Event details and context
  - Export and search functionality
- [ ] **Performance Metrics**: Query latency, cache hit rates
  - Performance charts and trends
  - Alerting for degradation
  - Historical performance data
- [ ] **Error Handling**: User-friendly error messages and recovery
  - Contextual error explanations
  - Suggested recovery actions
  - Error reporting mechanism

#### 3.3 Settings & Configuration
- [ ] **Server Management**: Start/stop MCP server, health checks
  - Service control interface
  - Configuration management
  - Log viewing and debugging
- [ ] **KB Configuration**: Embedding models, chunk size, search params
  - Model selection and configuration
  - Performance tuning options
  - Preview and testing tools
- [ ] **System Settings**: Storage quotas, cache settings, logging
  - Resource management controls
  - Logging level configuration
  - Backup and restore options
- [ ] **Air-gapped Mode**: Network blocking toggle
  - Outbound connection control
  - Security status indicators
  - Compliance reporting

### Phase 4: Tools & Flows Foundation 🔧
**Priority: MEDIUM | Estimated: 2-3 weeks**

#### 4.1 Tool System
- [ ] **Tool Registry**: Dynamic MCP endpoint registration
  - Tool discovery and registration
  - Version management
  - Capability declarations
- [ ] **Tool Cards**: UI for tool configuration and testing
  - Parameter input forms
  - Test execution environment
  - Result visualization
- [ ] **Parameter Validation**: JSON schema for tool inputs
  - Real-time validation
  - Error highlighting
  - Auto-completion support
- [ ] **Tool Testing**: Integration testing interface
  - Unit test execution
  - Performance benchmarking
  - Regression testing

#### 4.2 Basic Flow Composition
- [ ] **Flow Designer**: Visual pipeline builder (simplified)
  - Drag-drop interface
  - Connection validation
  - Flow visualization
- [ ] **Tool Chaining**: Connect KB search → AI model → response
  - Data flow validation
  - Type checking
  - Error propagation
- [ ] **Flow Execution**: Run flows with progress tracking
  - Step-by-step execution
  - Pause and resume capability
  - Debug mode with inspection
- [ ] **Result Display**: Show flow outputs with citations
  - Rich result formatting
  - Citation tracking
  - Export functionality

### Phase 5: Production Readiness 🚀
**Priority: MEDIUM | Estimated: 1-2 weeks**

#### 5.1 Performance Optimization
- [ ] **Bundle Size**: Reduce 879KB→<500KB via lazy loading
  - Route-based code splitting
  - Dynamic imports for heavy components
  - Tree shaking optimization
- [ ] **Caching Strategy**: Implement request/feature/document layers
  - Multi-level cache hierarchy
  - Intelligent cache invalidation
  - Cache warming strategies
- [ ] **Async Operations**: Non-blocking UI with background processing
  - Web Workers for heavy computation
  - Progressive data loading
  - Optimistic UI updates
- [ ] **Memory Management**: Efficient resource usage patterns
  - Memory leak detection
  - Resource cleanup
  - Garbage collection tuning

#### 5.2 Security & Reliability
- [ ] **Input Sanitization**: XSS/injection prevention
  - Content Security Policy
  - Input validation and encoding
  - Safe HTML rendering
- [ ] **Error Recovery**: Graceful degradation and retry logic
  - Circuit breaker patterns
  - Fallback mechanisms
  - Retry with exponential backoff
- [ ] **Backup System**: Automatic KB and settings backup
  - Scheduled backups
  - Incremental backup strategy
  - Restore verification
- [ ] **Audit Logging**: Security-relevant event tracking
  - Security event detection
  - Compliance logging
  - Forensic capabilities

#### 5.3 Deployment & Distribution
- [ ] **PyOxidizer**: Embedded Python for portable builds
  - Self-contained distribution
  - Cross-platform compatibility
  - Dependency bundling
- [ ] **Installer**: One-click setup with dependencies
  - Installation wizard
  - Dependency verification
  - Uninstallation support
- [ ] **Documentation**: User guide and API documentation
  - Interactive tutorials
  - API reference
  - Troubleshooting guides
- [ ] **Testing Suite**: Comprehensive test coverage
  - Unit test coverage >80%
  - Integration test scenarios
  - Performance benchmarks

## Technical Debt & Optimizations

### Immediate Fixes Needed
- [ ] **Bundle Size**: Address 379KB over budget warning
  - Analyze bundle composition
  - Implement lazy loading
  - Optimize dependencies
- [ ] **CSS Optimization**: Fix 13 components exceeding 4KB SCSS budget
  - Refactor large stylesheets
  - Extract common styles
  - Use CSS custom properties
- [ ] **Rust Warnings**: Remove dead code in mcp_server.rs
  - Clean up unused methods
  - Remove deprecated code
  - Improve code organization
- [ ] **Type Safety**: Ensure full TypeScript coverage
  - Add missing type annotations
  - Enable strict mode
  - Fix any types

### Architecture Improvements
- [ ] **Zoneless Change Detection**: Remove Zone.js dependency
  - Migrate to OnPush strategy
  - Use manual change detection
  - Optimize rendering performance
- [ ] **Signal Migration**: Replace remaining BehaviorSubjects
  - Convert observables to signals
  - Update reactive patterns
  - Improve type safety
- [ ] **Control Flow**: Use @if/@for/@switch consistently
  - Replace structural directives
  - Update templates
  - Improve readability
- [ ] **Tree Shaking**: Optimize Lucide icon imports
  - Use selective imports
  - Remove unused icons
  - Optimize bundle size

## Success Criteria

### MVP Definition ✅
**A functional RAG Studio that can:**
1. ✅ Create and manage knowledge bases
2. ✅ Ingest documents with chunking and embedding
3. ✅ Perform hybrid search (vector + BM25) with citations
4. ✅ Expose functionality via MCP server
5. ✅ Provide desktop UI for all operations
6. ✅ Run air-gapped with no internet dependency
7. ✅ Achieve <100ms search performance target

### Performance Targets
- **Search Latency**: <100ms P50, <200ms P95
- **Bundle Size**: <500KB initial load
- **Memory Usage**: <50MB idle, <200MB active
- **Startup Time**: <3 seconds cold start

### Quality Gates
- **Test Coverage**: >80% unit tests, critical path integration tests
- **Security**: No XSS/injection vulnerabilities, secure citations
- **Reliability**: <1% error rate, graceful failure recovery
- **Documentation**: Complete API docs and user guide

## Risk Assessment

### High Risk Items
- **Python Integration Complexity**: PyO3 async patterns may require significant debugging
- **Performance Targets**: <100ms search latency is aggressive for hybrid search
- **Bundle Size**: Current 879KB needs 43% reduction to meet targets

### Mitigation Strategies
- **Incremental Development**: Build and test each component independently
- **Performance Monitoring**: Implement benchmarking early in development
- **Fallback Plans**: Rust-only implementations for critical performance paths

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| Phase 1 | 2-3 weeks | Backend infrastructure, state management |
| Phase 2 | 3-4 weeks | Knowledge base core, MCP server |
| Phase 3 | 2-3 weeks | Frontend integration, real-time features |
| Phase 4 | 2-3 weeks | Tools system, basic flows |
| Phase 5 | 1-2 weeks | Production readiness, optimization |
| **Total** | **10-15 weeks** | **Complete MVP** |

## Conclusion

This MVP plan provides a structured approach to delivering RAG Studio's core functionality while maintaining architectural integrity. The phased approach ensures incremental value delivery with clear milestones and success criteria. Focus areas include performance optimization, security hardening, and user experience refinement to create a production-ready local-first RAG application.