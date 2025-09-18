mod python_integration;

use python_integration::PythonContext;
use std::sync::OnceLock;
// Import our core crate
use rag_core::{SqlService, SqlConfig};

// Global Python context instance using OnceLock for thread-safe lazy initialization
static PYTHON_CONTEXT: OnceLock<PythonContext> = OnceLock::new();

fn get_python_context() -> &'static PythonContext {
    PYTHON_CONTEXT.get_or_init(|| {
        PythonContext::new().expect("Failed to initialize Python context")
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

#[tauri::command]
async fn test_sql_setup() -> Result<String, String> {
    // Create a test SQL configuration
    let config = SqlConfig::new_mvp("./test_app.db");

    // Initialize SQL service
    let sql_service = SqlService::new(config).await
        .map_err(|e| format!("Failed to create SQL service: {}", e))?;

    // Run migrations
    sql_service.run_migrations().await
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    // Test health check
    let health = sql_service.health_check().await
        .map_err(|e| format!("Failed to get health metrics: {}", e))?;

    Ok(format!("SQL Service initialized successfully. Database size: {} bytes, MVP mode: {}",
               health.app_db_size, !health.is_split_database))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            rust_call_python,
            test_sql_setup
        ])
        .setup(|_app| {
            println!("RAG Studio application initialized.");
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
