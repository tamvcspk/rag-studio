# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RAG Studio is a local-first, no-code/low-code application for building and operating personal Retrieval-Augmented Generation (RAG) systems. It's built using Tauri with an Angular frontend and Rust backend (with PyO3 for Python AI integration), designed to manage knowledge bases, pipelines, tools, and flows while exposing functionality via a single Model Context Protocol (MCP) server.

## Architecture

This is a hybrid Tauri application with two main components:

### Frontend (Angular)
- Located in `src/` directory
- Angular 20+ with standalone components
- Radix-inspired design system for UI consistency
- Lucide Icons for consistent iconography (3,300+ icons, MIT license, tree-shakeable)
- Uses SCSS for styling with CSS custom properties for theming
- Served on port 1420 during development

### Backend (Rust/Tauri)
- Located in `src-tauri/` directory  
- Tauri v2 application with Rust backend
- Integration with Python AI components via PyO3
- SQLite for metadata storage, file-based for indexes/packs
- Single MCP server for external integrations

## Development Commands

### Frontend Development
- `npm run start` - Start Angular development server on port 1420
- `npm run build` - Build Angular application for production
- `npm run watch` - Build with watch mode for development
- `ng` - Angular CLI commands

### Tauri Development  
- `npm run tauri dev` - Start Tauri development mode (builds frontend + backend)
- `npm run tauri build` - Build production Tauri application
- `npm run tauri` - Access Tauri CLI commands

### Full Application
- Development: Run `npm run tauri dev` to start both frontend and backend
- The Tauri config automatically runs `npm run start` before dev and `npm run build` before build

## Key Technologies

- **Tauri v2**: Desktop application framework with tray icon support
- **Angular 20+**: Frontend framework with standalone components and Angular CDK (DragDrop, Overlay, Dialog)
- **Radix-inspired Design System**: Consistent UI components and design tokens
- **Lucide Icons**: Icon system with 3,300+ icons
- **Rust 1.80+**: Backend with Axum (async server), Tokio (concurrency), Diesel ORM
- **PyO3**: Python integration for AI/ML components (embedding, reranking)
- **SQLite with Diesel**: Database for metadata and registry
- **FAISS/Sentence-Transformers**: Vector search and embeddings (Python via PyO3)
- **Custom Rust BM25**: Lexical search implementation (migrated from Python rank_bm25)

## Project Structure

- `src/`: Angular frontend application
- `src-tauri/`: Rust backend and Tauri configuration
- `docs/`: Technical documentation (SRS, SDD)
- `angular.json`: Angular workspace configuration
- `tauri.conf.json`: Tauri application configuration

## Core Concepts

- **Knowledge Base (KB)**: Versioned content repositories for RAG retrieval that have been ingested, chunked, embedded, and indexed
- **Pipeline**: Automated workflows for data ingestion and indexing (fetch → parse → normalize → chunk → annotate → embed → index → eval → pack)
- **Tools**: Dynamic MCP endpoints for external AI model integration with configurable parameters
- **Flow**: End-to-end RAG processes combining tools, KBs, pipelines, and schedules into complete workflows
- **MCP Server**: Single Axum-based server exposing `rag.*`, `kb.*`, and `admin.*` tool sets (migrated from FastAPI)
- **Scheduler**: Tokio-based background job scheduling with cron/rrule support, retry/backoff, and exclusion rules
- **Pack Management**: ZIP-based export/import system with YAML manifests and checksums for sharing components

## Development Notes

- The application is designed to run air-gapped with no internet dependency after setup
- Focus on local-first operation with strong data security
- All citations are required in RAG responses
- The backend migrated from Python/FastAPI to Rust/Axum for 4-10x performance improvement while retaining Python for AI components via PyO3
- Expected performance gains: MCP Server (4-10x resource efficiency), Orchestrator (3-4x faster), Scheduler (2-100x faster), BM25 (200-500x faster)
- Air-gapped operation supported with no internet dependency post-setup
- Headless mode via system tray icon (show/hide UI, background operation)
- One-click portable startup with bundled dependencies

## Python Integration Architecture

The application uses PyO3 for seamless Rust-Python integration:

- **Python Context**: Located in `src-tauri/src/python_integration.rs`
- **Python Functions**: Located in `src-tauri/python/rag_functions.py`
- **Caching**: Uses `OnceLock` for thread-safe lazy initialization
- **Module Loading**: Cached Python code compilation for performance
- **Error Handling**: Comprehensive error propagation from Python to Rust

Key Python integration patterns:
- Initialize Python context once using `OnceLock`
- Cache compiled Python modules to avoid repeated I/O
- Use `Python::with_gil()` for all Python operations
- Convert Python results to JSON strings for consistent data exchange

## Tauri Commands

The application exposes several Tauri commands for frontend-backend communication:

### Core RAG Operations
- `rust_call_rag_search(query: &str)` - RAG search with hybrid BM25 + vector search
- `advanced_python_text_processing(text: String)` - Text processing for pipeline operations

### System Integration
- `greet(name: &str)` - Basic Rust greeting
- `rust_call_python(name: &str)` - Python greeting function
- `rust_call_python_direct(x: i32, y: i32)` - Mathematical operations
- `get_python_system_info()` - Python system information
- `test_python_libraries()` - External library testing (FAISS, Sentence-Transformers)

### MCP Server Management
- Tool registration and activation/deactivation
- Knowledge base management and versioning
- Pipeline orchestration and scheduling
- Flow composition and execution

## Performance Considerations

The architecture is designed for optimal performance with significant improvements from migration:

- **Rust Backend**: Core operations migrated from Python for 3-10x performance improvement
  - MCP Server: 4-10x resource efficiency (13% → 3% CPU, 55MB → 3.5MB memory)
  - Orchestrator: 3-4x faster concurrency with Tokio vs Python concurrent.futures
  - Scheduler: 2-100x faster event handling with Tokio timers vs APScheduler
  - BM25: 200-500x faster scoring with native Rust vs Python rank_bm25
- **PyO3 Integration**: AI-specific operations (embedding, reranking) remain in Python but called efficiently
- **Caching**: Module compilation and data caching to reduce overhead
- **Hybrid Search**: Rust BM25 + Python FAISS vector search with reranking
- **Concurrent Processing**: Tokio-based async runtime for scheduling and orchestration
- **Memory Efficiency**: Static caching with `OnceLock` for shared resources

## Security Features

- **Air-gapped Mode**: Block outbound network connections via Axum hooks when enabled
- **Default-deny Permissions**: Filesystem, network, and process access controls with escalation prompts
- **Local-first**: All operations work without internet connectivity post-setup
- **Data Privacy**: No external data transmission in air-gapped mode
- **Mandatory Citations**: All RAG responses include citations with configurable "no citation → no answer" policy
- **Secrets Management**: Encrypted at rest using Rust `ring` crate (optional)
- **Log Redaction**: Comprehensive redaction of sensitive information in logs

## Testing

The Rust backend includes comprehensive tests:
- Python integration tests in `src-tauri/src/lib.rs:81-138`
- Run tests with `cargo test` from the `src-tauri/` directory
- Tests verify Python context initialization, system info, and library functionality

## Development Guidelines

### General Guidelines

- Only use absolute positioning when necessary. Opt for responsive and well-structured layouts using CSS Grid and Flexbox
- Refactor code as you go to keep the codebase clean and maintainable
- Keep file sizes small and organize helper functions and components in their own files
- Follow the established Angular and Rust project structure conventions
- Maintain separation of concerns between frontend (Angular) and backend (Rust/Python)
- Always handle errors gracefully with proper error propagation from Python through Rust to Angular

### Angular Frontend Guidelines

- Use Radix-inspired design system components consistently throughout the application
- Follow Angular standalone component patterns (Angular 20+)
- Use Lucide Icons for all iconography (3,300+ icons, tree-shakeable)
- Implement atomic, semantic, and composite component architecture:
  - Atomic: RagButton, RagBadge, RagSpinner, RagIcon, etc.
  - Semantic: RagCard, RagFormField, RagSearchInput, etc.
  - Composite: ToolCard, PipelineDesigner, CreateToolWizard, etc.
- Use SCSS with CSS custom properties for theming (light/dark mode support)
- Implement responsive layouts that work across different screen sizes
- Keep components focused and use services for business logic
- Use TypeScript strictly with proper type definitions
- Follow Angular best practices for dependency injection and lifecycle management
- Use Angular CDK for advanced UI patterns (DragDrop, Overlay, Dialog)

### Rust Backend Guidelines

- Use `OnceLock` for thread-safe lazy initialization of shared resources
- Cache Python modules to avoid repeated compilation overhead
- Always use `Python::with_gil()` for Python operations in PyO3 integration
- Convert Python results to JSON strings for consistent data exchange
- Implement comprehensive error handling with proper error propagation
- Use Tokio async runtime efficiently for concurrent operations
- Follow Rust ownership and borrowing principles strictly

### Security Guidelines

- Never log or expose sensitive data, especially in air-gapped mode
- Implement proper input validation for all user inputs
- Follow the principle of least privilege for filesystem and network access
- Ensure all citations are included in RAG responses for transparency
- Validate all data exchanges between frontend, Rust backend, and Python components

### Performance Guidelines

- Cache frequently accessed data appropriately
- Use lazy loading for heavy operations
- Implement efficient vector search with proper indexing
- Minimize Python-Rust boundary crossings where possible
- Use appropriate data structures for different use cases (SQLite for metadata, file-based for large data)
- Profile and optimize critical paths in the RAG pipeline