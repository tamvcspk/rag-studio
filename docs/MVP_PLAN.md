# RAG Studio MVP Plan

**Version:** 1.0
**Date:** September 15, 2025
**Status:** Planning Phase

## Executive Summary

This document outlines the Minimum Viable Product (MVP) implementation plan for RAG Studio, a local-first, no-code/low-code application for building and operating personal Retrieval-Augmented Generation (RAG) systems. The MVP focuses on delivering core RAG functionality with a desktop application built on Tauri, Angular 20+, and Rust.

## Project Layout Requirements

The canonical project layout is documented in `docs/designs/CORE_DESIGN.md`. **CRITICAL for MVP**: The following structure MUST be implemented:

```
rag-studio/
├── src/                    # Angular 20+ frontend
├── src-tauri/             # Tauri Rust main process
├── core/                  # Shared Rust crate (types, state, services)
├── mcp/                   # MCP server subprocess (✅ implemented)
└── embedding-worker/      # Python AI subprocess (🚫 MISSING - REQUIRED FOR MVP)
```

**IMPORTANT**: The `embedding-worker/` subprocess is NOT optional - it's a core requirement for proper process isolation, security, and Python AI functionality. The current integrated PyO3 approach is a **temporary deviation** that must be replaced with the proper subprocess architecture.

## Current State Analysis ✅

### COMPLETED FOUNDATIONS
- ✅ Angular 20+ frontend with standalone components and modern architecture
- ✅ Tauri v2 desktop framework setup
- ⚠️ **Rust backend with integrated PyO3** (temporary - needs embedding worker subprocess)
- ✅ Complete component library (atomic/semantic/composite architecture)
- ✅ Design token system with SCSS and CSS custom properties
- ✅ MCP server subprocess with proper process isolation
- ✅ Project builds successfully (993KB bundle, needs optimization)

### MISSING CRITICAL COMPONENTS
- 🚫 **Embedding Worker Subprocess**: Current PyO3 integration violates MVP architecture
- 🚫 **Process Isolation for AI**: Python AI functions lack proper subprocess isolation
- 🚫 **Robust Process Management**: No health checks, restarts, or process monitoring for AI functions

### ARCHITECTURAL IMPROVEMENTS IDENTIFIED
- ⚠️ **KB Creation - Pipeline Integration**: Current KB creation wizard duplicates Pipeline ETL functionality
  - **Problem**: Separate implementations for KB creation and Pipeline processing
  - **Solution**: Use Pipeline templates for KB creation (local-folder, web-docs, github, pdf templates)
  - **Benefits**: Eliminates code duplication, unified error handling, enhanced flexibility
  - **Status**: Documented in CORE_DESIGN.md, requires implementation

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

#### 1.2 State Management (Simplified MVP)
- [ ] **AppState**: Shared state with Arc<RwLock<AppState>> pattern
  - Simple HashMap storage for KBs, Runs, Metrics
  - Service injection via Manager DI
  - Clear upgrade path to actor system post-MVP
- [ ] **Persistence**: Basic SQLite storage with async operations
  - Single app_meta.db for MVP (split to events.db post-MVP)
  - Periodic saves and load-on-startup pattern
  - Event sourcing preparation (schema ready, not implemented)
- [ ] **Cache Service**: Simple memory caching with dashmap TTL
  - Basic request-level caching
  - TTL-based eviction
  - Upgrade to layered caching post-MVP
- [ ] **Real-time Updates**: Tauri events for frontend state sync
  - Direct state change notifications
  - Debounced updates for performance
  - NgRx store integration

#### 1.3 Python Integration (Embedding Worker Subprocess)
- [ ] **Embedding Worker Module**: Separate `embedding-worker/` subprocess crate
  - **CRITICAL**: Must be implemented as separate subprocess, not integrated PyO3
  - Independent Cargo workspace member with own Cargo.toml
  - Subprocess lifecycle management (start, stop, restart, health checks)
  - Process isolation for security and stability
- [ ] **Communication Protocol**: JSON over stdin/stdout for MVP
  - Request/response message format with unique IDs
  - Batch processing capabilities for multiple embeddings
  - Error handling and timeout management
  - Clear upgrade path to UDS/bincode for production
- [ ] **AI Functions**: Core embedding and reranking functionality
  - Sentence-Transformers model loading and caching
  - Batch embedding generation with configurable models
  - Cross-encoder reranking for search results
  - Model switching and warm-pool management
- [ ] **Process Management**: Robust subprocess handling
  - Automatic restart on crashes or hangs
  - Health check pings and process monitoring
  - Graceful shutdown with cleanup
  - Resource usage monitoring and limits
- [ ] **Error Handling**: Structured error propagation across process boundary
  - JSON error responses with context
  - Process failure recovery mechanisms
  - Timeout handling with fallback strategies
  - Detailed logging for debugging

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
- [ ] **KB Creation Pipeline System**: Unified ETL workflow for both KB creation and data processing
  - **ARCHITECTURAL INTEGRATION**: KB creation uses Pipeline templates instead of separate wizard
  - Pipeline Step Types: `fetch`, `parse`, `normalize`, `chunk`, `annotate`, `embed`, `index`, `eval`, `pack`
  - New `pack` step type for KB creation from pipeline output
  - Template-based workflows for different content sources
  - Parallel ETL processing with Tokio
  - Retry/backoff for failed operations
  - Progress tracking and reporting
  - Unified error handling across KB creation and general data processing
- [ ] **Hybrid Search**: Vector (LanceDB) + BM25 (Rust implementation)
  - Parallel search execution
  - Adaptive candidate sets
  - Merge scoring algorithms

#### 2.2 MCP Server Implementation (Simplified MVP)
- [ ] **Tool Registry**: Basic `kb.*` tools via stdio MCP protocol
  - `kb.hybrid_search` - Vector/lexical search combination
  - `kb.get_document` - Document retrieval
  - `kb.stats` - Collection statistics
  - `kb.list_collections` - KB enumeration
  - Basic tool validation and registration
- [ ] **Security**: Basic subprocess isolation
  - Process isolation (no shared memory)
  - JSON communication over stdio
  - Basic input validation and sanitization
  - Upgrade to full sandbox (seccomp/AppArmor) post-MVP
- [ ] **Communication**: Simple JSON-based protocol
  - Stdio-based MCP implementation
  - Schema versioning with serde tags
  - Basic error handling and recovery
  - Clear upgrade path to UDS/HTTP post-MVP
- [ ] **Performance**: Target <100ms retrieval with basic monitoring
  - Simple latency tracking
  - Basic performance metrics
  - Upgrade to full P50/P95 monitoring post-MVP

#### 2.3 Model Management System
- [ ] **ModelService Integration**: Dynamic model lifecycle management via DI services
  - Integrate with existing embedding worker subprocess for model loading/unloading
  - `Arc<DashMap<String, ModelMetadata>>` for concurrent model metadata access
  - LRU memory management in embedding worker (2GB default limit)
  - Storage quota management with auto-cleanup (50% disk usage, 2GB minimum free)
- [ ] **Dynamic Model Discovery**: Support multiple model sources
  - **Bundled Models**: Ship with lightweight model (all-MiniLM-L6-v2, ~90MB) for offline operation
  - **Local Discovery**: Auto-scan `./models/`, `~/.cache/huggingface/`, user directories
  - **Manual Import**: Drag-drop model files with auto-detection of format and metadata
  - **HuggingFace Integration**: Search and download models (Phase 3 enhancement)
- [ ] **Model Metadata & Validation**: Comprehensive model information system
  - Model metadata (dimensions, size, performance metrics, compatibility)
  - SHA-256 checksum verification for integrity
  - Model status tracking (available, downloading, error, not_downloaded)
  - Pipeline pre-validation to ensure model availability before execution
- [ ] **Enhanced KB Creation**: Dynamic model selection in KB workflows
  - Replace hardcoded `EmbeddingModel` enum with dynamic model registry
  - Model selector in KB creation with real-time availability status
  - Fallback model support for pipeline reliability
  - Model performance recommendations based on content type

#### 2.4 Citations & Quality
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
- [ ] **KB Creation via Pipeline Templates**: Unified creation workflow using Pipeline system
  - **ARCHITECTURAL CHANGE**: KB creation replaces wizard with Pipeline template instantiation
  - Content source selection via predefined Pipeline templates:
    - Local Folder Template (local-folder → fetch → parse → chunk → embed → index → pack)
    - Web Documentation Template (web-crawler → parse → normalize → chunk → embed → index → pack)
    - GitHub Repository Template (git-clone → parse → chunk → embed → index → pack)
    - PDF Collection Template (pdf-parse → normalize → chunk → embed → index → pack)
  - **Dynamic Embedding Model Selection**: Real-time model availability with download options
    - Model selector with performance characteristics (dimensions, speed, accuracy)
    - "Download missing model" option integrated into KB creation flow
    - Model recommendations based on content type and size
    - Fallback model suggestions for reliability
  - Pipeline execution with real-time progress tracking
  - Unified error handling and retry logic via Pipeline system
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

#### 3.4 Models Management UI
- [ ] **Models Library**: Grid view of installed and available models
  - Model cards with metadata (size, dimensions, performance, source)
  - Status indicators (available, downloading, error) with progress tracking
  - Storage usage visualization with cleanup controls
  - Model comparison table (speed vs accuracy trade-offs)
- [ ] **HuggingFace Integration**: Search and download models from HuggingFace hub
  - Model search with filtering by type, size, and performance
  - Model preview with description, examples, and benchmarks
  - Background downloading with pause/resume/cancel capabilities
  - Download progress tracking with bandwidth management
- [ ] **Local Model Management**: Import and organize user models
  - Drag-drop interface for manual model import
  - Auto-detection of model format and metadata extraction
  - Local directory scanning and model discovery
  - Model validation and compatibility checking
- [ ] **ModelsStore (NgRx Signals)**: Reactive state management for model operations
  - Real-time model status updates via Tauri events
  - Computed signals for available models, recommendations, and storage usage
  - Background operations (download, import, delete) with proper error handling
  - Integration with existing KB creation and pipeline workflows

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
- **Embedding Worker Architecture Gap**: Current integrated PyO3 violates MVP subprocess architecture
- **Process Management Complexity**: Subprocess lifecycle, health checks, and error recovery
- **Performance Targets**: <100ms search latency is aggressive for hybrid search across process boundaries
- **Bundle Size**: Current 993KB needs 50% reduction to meet targets
- **Python Subprocess Communication**: JSON protocol performance and reliability at scale

### Mitigation Strategies
- **Incremental Development**: Build and test each component independently
- **Performance Monitoring**: Implement benchmarking early in development
- **Fallback Plans**: Rust-only implementations for critical performance paths

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| Phase 1 | 2-3 weeks | Backend infrastructure, state management |
| Phase 2 | 3-4 weeks | Knowledge base core, MCP server, model management system |
| Phase 3 | 2-3 weeks | Frontend integration, real-time features, models UI |
| Phase 4 | 2-3 weeks | Tools system, basic flows |
| Phase 5 | 1-2 weeks | Production readiness, optimization |
| **Total** | **10-15 weeks** | **Complete MVP** |

## Conclusion

This MVP plan provides a structured approach to delivering RAG Studio's core functionality while maintaining architectural integrity. The phased approach ensures incremental value delivery with clear milestones and success criteria. Focus areas include performance optimization, security hardening, and user experience refinement to create a production-ready local-first RAG application.