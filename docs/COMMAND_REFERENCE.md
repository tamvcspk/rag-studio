# Command Reference

This document provides a comprehensive reference for all development commands, Tauri commands, and operational procedures in RAG Studio.

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

### Production Setup
- `scripts/setup-production.bat` - Setup PyOxidizer artifacts for production build
- `scripts/clean-production.bat` - Clean production build artifacts
- Production builds use embedded Python via PyOxidizer for portability
- Development uses system Python for faster iteration

### Testing Commands

#### Core Service Testing (Rust)
- `cargo test --lib` - Run unit tests from `core/` directory
- `cargo test --test sql_integration` - Run SQL service integration tests
- `cargo test --test vector_integration` - Run vector service integration tests
- `cargo test --test state_manager_integration` - Run state management integration tests

#### Tauri Backend Testing
- `cargo test` - Run tests from `src-tauri/` directory
- `cargo test test_python_integration` - Run specific Python integration test

#### Angular Frontend Testing
- `ng test` - Run Angular component tests (when test runner is configured)

## Tauri Commands

The application exposes several Tauri commands for frontend-backend communication:

### Core System Commands
- `greet(name: &str)` - Basic Rust greeting for testing
- `rust_call_python(name: &str)` - Python greeting function via PyO3

### MCP Server Management
- `start_mcp_server()` - Start the MCP server instance
- `stop_mcp_server()` - Stop the MCP server instance
- `get_mcp_status()` - Get current MCP server status
- `get_mcp_healthcheck()` - Health check for MCP server
- `get_mcp_service_info()` - Service information for MCP server

The MCP server exposes tool sets:
- `rag.*` - RAG search and answer operations
- `kb.*` - Knowledge base management
- `admin.*` - Administrative functions

## KB API Contract

The Knowledge Base module exposes these key operations via MCP with StateManager actor integration:

### Search and Retrieval
- `kb.hybrid_search(collection, query, top_k, filters, cache_ttl?)` → Hit[{chunk_id, score, snippet, citation, meta}]
  - Combines vector and lexical search with adaptive reranking
  - Supports filtering by product/version/semverRange with pre-filtering
  - Returns chunks with scores, snippets, citations, and metadata
  - Adaptive candidate sets, backfill on no results, configurable Top-N

- `kb.answer(query, filters?, model?)` → {text, citations[], confidence?}
  - Full RAG answer generation with LLM integration via async Embedding Worker
  - Mandatory citation requirement with configurable "no citation → no answer" policies

### Document Management
- `kb.get_document(doc_id, range?)` → Document {metadata, chunks?, license?}
  - Document retrieval with optional range selection

- `kb.resolve_citations(chunk_ids)` → Citation[{title, anchor/URL, license?, version?}]
  - Citation resolution with title, anchor/URL, license, version info

### Collection Management
- `kb.stats(collection/version)` → Stats {size, versions, embedder_version, health, eval_scores?}
  - Collection statistics and health metrics from StateManager actors

- `kb.list_collections(filters?)` → KB[{name, version, pinned?, flows?}]
  - Collection enumeration with metadata from StateManager

### Flow Composition
- `kb.compose_flow(flow_id, params?)` → {results, citations[]}
  - Flow composition for complex multi-step operations

*All APIs proxy StateManager actors with schema versioning in RPC, enriched errors, and evaluation gates for write/maintenance operations.*

## Git Workflow Commands

### Standard Git Operations
- `git status` - Check repository status
- `git add .` - Stage all changes
- `git commit -m "message"` - Commit changes with message
- `git push` - Push to remote repository

### Branch Management
- `git checkout -b feature-branch` - Create and switch to new branch
- `git checkout main` - Switch to main branch
- `git merge feature-branch` - Merge feature branch to current branch

### Development Workflow
1. Create feature branch from main
2. Make changes and test
3. Run `cargo test` and `npm run build` to verify
4. Commit changes with descriptive message
5. Push branch and create pull request

## Environment Setup Commands

### Windows Environment
See `docs/installation/Quick_Start.md` and `docs/installation/Windows_Build_Setup.md` for detailed setup instructions.

#### Prerequisites Check
```powershell
rustc --version     # Rust toolchain
cl                  # Visual Studio Build Tools
git --version       # Git
```

#### Install Tools (if missing)
```powershell
winget install Rustlang.Rustup         # Rust
winget install Kitware.CMake           # CMake
winget install nasm.nasm               # NASM assembler
```

## Performance Monitoring Commands

### Rust Performance
- `cargo bench` - Run benchmarks for critical path optimization
- `cargo flamegraph` - Generate flame graphs for performance profiling

### Build Optimization
- `cargo build --release` - Build optimized release version
- `npm run build --prod` - Build production Angular bundle

## Debugging Commands

### Rust Debugging
- `cargo check` - Check code without building
- `cargo clippy` - Run Rust linter
- `cargo fmt` - Format Rust code

### Frontend Debugging
- `ng lint` - Run Angular linter
- `ng build --watch` - Build with watch mode for development

## Configuration Commands

### Environment Variables
- Set `RUST_LOG=debug` for detailed logging
- Set `RUST_BACKTRACE=1` for stack traces
- Configure `VCPKG_ROOT` for Windows builds

### Hot-Reload Configuration
- TOML configuration via notify crate for development efficiency
- Config files automatically reload during development

## Troubleshooting Commands

### Clean Build
```bash
# Clean Rust artifacts
cargo clean

# Clean Node modules
rm -rf node_modules
npm install

# Clean Tauri build
npm run tauri build -- --clean
```

### Reset Development Environment
```bash
# Reset git state (caution: loses uncommitted changes)
git reset --hard HEAD
git clean -fd

# Rebuild from scratch
cargo clean && npm run tauri dev
```

For detailed troubleshooting guides, see:
- `docs/installation/Quick_Start.md`
- `docs/installation/Windows_Build_Setup.md`