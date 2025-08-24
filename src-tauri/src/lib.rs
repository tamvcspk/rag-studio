mod python_integration;

use python_integration::PythonContext;
use std::sync::OnceLock;

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

// Direct function call for mathematical operations using reorganized module
#[tauri::command]
fn rust_call_python_direct(x: i32, y: i32) -> Result<String, String> {
    let python_ctx = get_python_context();
    python_ctx.call_calculation(x, y)
}

// RAG search simulation using reorganized module
#[tauri::command] 
fn rust_call_rag_search(query: &str) -> Result<String, String> {
    let python_ctx = get_python_context();
    python_ctx.call_rag_search(query)
}

// New command to get Python system information for debugging
#[tauri::command]
fn get_python_system_info() -> Result<String, String> {
    let python_ctx = get_python_context();
    python_ctx.get_system_info()
}

// Enhanced commands demonstrating Python library capabilities

#[tauri::command]
fn test_python_libraries() -> Result<String, String> {
    let python_ctx = get_python_context();
    python_ctx.call_python_function("demo_external_libraries", &[])
}

#[tauri::command]
fn advanced_python_text_processing(text: String) -> Result<String, String> {
    let python_ctx = get_python_context();
    python_ctx.call_python_function("advanced_text_processing", &[&text])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            rust_call_python, 
            rust_call_python_direct, 
            rust_call_rag_search,
            get_python_system_info,
            test_python_libraries,
            advanced_python_text_processing
        ])
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
    
    #[test]
    fn test_python_system_info() {
        let ctx = get_python_context();
        let result = ctx.get_system_info();
        
        match result {
            Ok(info_json) => {
                println!("✅ Python system info test successful");
                println!("System info: {}", info_json);
                assert!(info_json.contains("python_version"));
            },
            Err(e) => {
                println!("❌ Python system info test failed: {}", e);
                panic!("Python system info failed: {}", e);
            }
        }
    }

    #[test] 
    fn test_python_libraries() {
        let ctx = get_python_context();
        let result = ctx.call_python_function("demo_external_libraries", &[]);
        
        match result {
            Ok(libs_json) => {
                println!("✅ Python libraries test successful");
                println!("Libraries result: {}", libs_json);
                assert!(libs_json.contains("timestamp"));
                assert!(libs_json.contains("tests"));
            },
            Err(e) => {
                println!("❌ Python libraries test failed: {}", e);
                panic!("Python libraries test failed: {}", e);
            }
        }
    }
}
