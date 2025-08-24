fn main() {
    // 2-Phase Build Strategy - Automatic based on PyOxidizer artifacts
    // Following tauri-plugin-python approach
    
    let pyoxidizer_config = std::path::Path::new("target/pyembedded/pyo3-build-config-file.txt");
    
    if pyoxidizer_config.exists() {
        // Production build: PyOxidizer embedded Python detected
        println!("cargo:warning=🚀 Production Build: Using PyOxidizer embedded Python");
        println!("cargo:rerun-if-changed=target/pyembedded/pyo3-build-config-file.txt");
        
        // Additional linking for embedded Python libraries
        println!("cargo:rustc-link-search=native=target/pyembedded");
        
        #[cfg(target_os = "windows")]
        {
            println!("cargo:rustc-link-search=native=target/pyembedded/lib");
        }
    } else {
        // Development build: System Python/venv via PyO3
        println!("cargo:warning=🔧 Development Build: Using system Python via PyO3");
        println!("cargo:warning=For production: Generate artifacts with 'pyoxidizer generate-python-embedding-artifacts pyembedded'");
    }
    
    tauri_build::build()
}
