use pyo3::prelude::*;
use pyo3::types::PyModule;
use std::path::PathBuf;
use std::ffi::CString;
use std::sync::OnceLock;

/// Python integration module using official PyO3 documentation patterns
/// Reference: https://docs.rs/pyo3/latest/pyo3/types/struct.PyModule.html

/// Cached Python code and module data to avoid repeated I/O and compilation
struct CachedPythonData {
    code_cstr: CString,
    filename_cstr: CString,
    module_name_cstr: CString,
}

pub struct PythonContext {
    python_path: PathBuf,
    cached_data: OnceLock<CachedPythonData>,
}

impl PythonContext {
    pub fn new() -> Result<Self, String> {
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        
        let python_path = current_dir.join("python");
        
        Ok(PythonContext { 
            python_path,
            cached_data: OnceLock::new(),
        })
    }

    /// Initialize and cache Python data (called once)
    fn get_cached_data(&self) -> Result<&CachedPythonData, String> {
        // Use a static approach to handle Result in OnceLock
        match self.cached_data.get() {
            Some(data) => Ok(data),
            None => {
                let python_file_path = self.python_path.join("rag_functions.py");
                
                // Only do I/O once during initialization
                let python_code = std::fs::read_to_string(&python_file_path)
                    .map_err(|e| format!("Failed to read Python file {}: {}", python_file_path.display(), e))?;
                
                let code_cstr = CString::new(python_code.clone())
                    .map_err(|e| format!("Failed to convert Python code to CString: {}", e))?;
                
                let filename_cstr = CString::new("rag_functions.py")
                    .map_err(|e| format!("Failed to convert filename to CString: {}", e))?;
                
                let module_name_cstr = CString::new("rag_functions")
                    .map_err(|e| format!("Failed to convert module name to CString: {}", e))?;
                
                let cached_data = CachedPythonData {
                    code_cstr,
                    filename_cstr,
                    module_name_cstr,
                };
                
                // Store it in the OnceLock
                match self.cached_data.set(cached_data) {
                    Ok(_) => Ok(self.cached_data.get().unwrap()),
                    Err(_) => Ok(self.cached_data.get().unwrap()), // Another thread set it
                }
            }
        }
    }

    /// Load the rag_functions module using cached data
    fn load_rag_functions<'py>(&self, py: Python<'py>) -> PyResult<Bound<'py, PyModule>> {
        let cached_data = self.get_cached_data()
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyIOError, _>(e))?;
        
        let code_str = cached_data.code_cstr.to_str()
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid UTF-8 in code: {}", e)))?;
        let filename_str = cached_data.filename_cstr.to_str()
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid UTF-8 in filename: {}", e)))?;
        let module_name_str = cached_data.module_name_cstr.to_str()
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid UTF-8 in module name: {}", e)))?;
            
        PyModule::from_code_bound(
            py,
            code_str,
            filename_str,
            module_name_str
        )
    }


    /// Call a simple greeting function from Python (optimized)
    pub fn call_greeting(&self, name: &str) -> Result<String, String> {
        Python::with_gil(|py| {
            let rag_module = self.load_rag_functions(py)
                .map_err(|e| format!("Failed to load rag_functions: {}", e))?;
            
            let greet_func = rag_module.getattr("greet_from_python")
                .map_err(|e| format!("Failed to get greet_from_python function: {}", e))?;
            
            let result = greet_func.call1((name,))
                .map_err(|e| format!("Failed to call greet_from_python: {}", e))?;
            
            result.extract::<String>()
                .map_err(|e| format!("Failed to extract result: {}", e))
        })
    }

    /// Call mathematical calculation function (optimized)
    pub fn call_calculation(&self, x: i32, y: i32) -> Result<String, String> {
        Python::with_gil(|py| {
            let rag_module = self.load_rag_functions(py)
                .map_err(|e| format!("Failed to load rag_functions: {}", e))?;
            
            let calc_func = rag_module.getattr("calculate_numbers")
                .map_err(|e| format!("Failed to get calculate_numbers function: {}", e))?;
            
            let result = calc_func.call1((x, y))
                .map_err(|e| format!("Failed to call calculate_numbers: {}", e))?;
            
            // Pre-load json module once per GIL session
            let json_module = PyModule::import_bound(py, "json")
                .map_err(|e| format!("Failed to import json module: {}", e))?;
            
            let json_result = json_module.call_method1("dumps", (result,))
                .map_err(|e| format!("Failed to serialize to JSON: {}", e))?;
            
            json_result.extract::<String>()
                .map_err(|e| format!("Failed to extract JSON string: {}", e))
        })
    }

    /// Call RAG search simulation function (optimized)
    pub fn call_rag_search(&self, query: &str) -> Result<String, String> {
        // Pre-define documents to avoid repeated allocation
        let documents = vec![
            "RAG Studio is a powerful tool for building retrieval systems",
            "Python integration with Rust provides excellent performance",
            "Vector search and embeddings are crucial for RAG applications", 
            "Tauri allows building desktop apps with web technologies",
            "PyO3 enables seamless Python-Rust integration"
        ];
        
        Python::with_gil(|py| {
            let rag_module = self.load_rag_functions(py)
                .map_err(|e| format!("Failed to load rag_functions: {}", e))?;
            
            let search_func = rag_module.getattr("rag_search_simulation")
                .map_err(|e| format!("Failed to get rag_search_simulation function: {}", e))?;
            
            let result = search_func.call1((query, documents))
                .map_err(|e| format!("Failed to call rag_search_simulation: {}", e))?;
            
            // Pre-load json module once per GIL session
            let json_module = PyModule::import_bound(py, "json")
                .map_err(|e| format!("Failed to import json module: {}", e))?;
            
            let json_result = json_module.call_method1("dumps", (result,))
                .map_err(|e| format!("Failed to serialize to JSON: {}", e))?;
            
            json_result.extract::<String>()
                .map_err(|e| format!("Failed to extract JSON string: {}", e))
        })
    }

    /// Get Python system information for debugging (optimized)
    pub fn get_system_info(&self) -> Result<String, String> {
        Python::with_gil(|py| {
            let rag_module = self.load_rag_functions(py)
                .map_err(|e| format!("Failed to load rag_functions: {}", e))?;
            
            let info_func = rag_module.getattr("get_system_info")
                .map_err(|e| format!("Failed to get get_system_info function: {}", e))?;
            
            let result = info_func.call0()
                .map_err(|e| format!("Failed to call get_system_info: {}", e))?;
            
            // Pre-load json module once per GIL session
            let json_module = PyModule::import_bound(py, "json")
                .map_err(|e| format!("Failed to import json module: {}", e))?;
            
            let json_result = json_module.call_method1("dumps", (result,))
                .map_err(|e| format!("Failed to serialize to JSON: {}", e))?;
            
            json_result.extract::<String>()
                .map_err(|e| format!("Failed to extract JSON string: {}", e))
        })
    }

    /// Generic method to call Python functions with string arguments
    pub fn call_python_function(&self, function_name: &str, args: &[&str]) -> Result<String, String> {
        Python::with_gil(|py| {
            let rag_module = self.load_rag_functions(py)
                .map_err(|e| format!("Failed to load rag_functions: {}", e))?;
            
            let py_func = rag_module.getattr(function_name)
                .map_err(|e| format!("Failed to get function '{}': {}", function_name, e))?;
            
            // Call function based on argument count
            let result = match args.len() {
                0 => py_func.call0(),
                1 => py_func.call1((args[0],)),
                2 => py_func.call1((args[0], args[1])),
                _ => return Err(format!("Too many arguments for function '{}'", function_name)),
            }.map_err(|e| format!("Failed to call {}: {}", function_name, e))?;
            
            // Convert result to JSON string
            let json_module = PyModule::import_bound(py, "json")
                .map_err(|e| format!("Failed to import json module: {}", e))?;
            
            let json_result = json_module.call_method1("dumps", (result,))
                .map_err(|e| format!("Failed to serialize to JSON: {}", e))?;
            
            json_result.extract::<String>()
                .map_err(|e| format!("Failed to extract JSON string: {}", e))
        })
    }
}

impl Default for PythonContext {
    fn default() -> Self {
        Self::new().expect("Failed to create PythonContext")
    }
}