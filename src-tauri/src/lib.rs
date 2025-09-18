mod python_integration;
mod mcp_server;

use python_integration::PythonContext;
use mcp_server::McpServerManager;
use std::sync::{OnceLock, Mutex};
use serde_json::Value;

// Global Python context instance using OnceLock for thread-safe lazy initialization
static PYTHON_CONTEXT: OnceLock<PythonContext> = OnceLock::new();

// Global MCP server manager instance
static MCP_SERVER: OnceLock<Mutex<McpServerManager>> = OnceLock::new();

fn get_python_context() -> &'static PythonContext {
    PYTHON_CONTEXT.get_or_init(|| {
        PythonContext::new().expect("Failed to initialize Python context")
    })
}

fn get_mcp_server() -> &'static Mutex<McpServerManager> {
    MCP_SERVER.get_or_init(|| {
        Mutex::new(McpServerManager::new())
    })
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Clean Rust -> Python call using reorganized module
#[tauri::command]
fn rust_call_python(name: &str) -> Result<String, String> {
    let python_ctx = get_python_context();
    python_ctx.call_greeting(name)
}


// MCP server management commands

#[tauri::command]
async fn start_mcp_server() -> Result<String, String> {
    let mcp_server = get_mcp_server();
    let mut server = mcp_server.lock().unwrap();
    
    match server.start() {
        Ok(_) => Ok("MCP server started successfully".to_string()),
        Err(e) => Err(format!("Failed to start MCP server: {}", e))
    }
}

#[tauri::command]
async fn stop_mcp_server() -> Result<String, String> {
    let mcp_server = get_mcp_server();
    let mut server = mcp_server.lock().unwrap();
    
    match server.stop() {
        Ok(_) => Ok("MCP server stopped successfully".to_string()),
        Err(e) => Err(format!("Failed to stop MCP server: {}", e))
    }
}

#[tauri::command]
fn get_mcp_status() -> String {
    let mcp_server = get_mcp_server();
    let server = mcp_server.lock().unwrap();
    format!("{:?}", server.get_status())
}

#[tauri::command]
fn get_mcp_healthcheck() -> Result<Value, String> {
    let mcp_server = get_mcp_server();
    let server = mcp_server.lock().unwrap();
    server.healthcheck()
}

#[tauri::command]
fn get_mcp_service_info() -> Value {
    let mcp_server = get_mcp_server();
    let server = mcp_server.lock().unwrap();
    server.get_service_info()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            rust_call_python, 
            start_mcp_server,
            stop_mcp_server,
            get_mcp_status,
            get_mcp_healthcheck,
            get_mcp_service_info
        ])
        .setup(|_app| {
            println!("RAG Studio application initialized. Use the UI to manage MCP server.");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_python_integration() {
        let ctx = get_python_context();
        let result = ctx.call_greeting("Test");
        
        match result {
            Ok(message) => {
                println!("✅ Python integration test successful: {}", message);
                assert!(message.contains("Test"));
                assert!(message.contains("Python"));
            },
            Err(e) => {
                println!("❌ Python integration test failed: {}", e);
                panic!("Python integration failed: {}", e);
            }
        }
    }
    
}
