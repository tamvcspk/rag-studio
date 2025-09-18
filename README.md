# Tauri + Angular

This template should help get you started developing with Tauri and Angular.

## Project structure (short)

See the canonical project layout in `docs/designs/CORE_DESIGN.md` for the full recommended workspace tree. In short the repository contains:

- `src/` - Angular frontend (WebView content)
- `src-tauri/` - Tauri Rust backend (Manager, IPC, PyO3 integration)
- `core/` - Shared Rust library crate for core logic and service traits
- `mcp/` and `embedding-worker/` - subprocess crates for MCP and embedding worker (MVP use stdin/stdout JSON)

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) + [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template).
