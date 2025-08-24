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

}

impl Default for PythonContext {
    fn default() -> Self {
        Self::new().expect("Failed to create PythonContext")
    }
}