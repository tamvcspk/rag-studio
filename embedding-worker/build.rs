fn main() {
    // Embedding Worker Build Script
    // Supports PyOxidizer embedded Python similar to src-tauri

    let pyoxidizer_config = std::path::Path::new("../src-tauri/target/pyembedded/pyo3-build-config-file.txt");

    if pyoxidizer_config.exists() {
        // Production build: Use PyOxidizer embedded Python from src-tauri
        println!("cargo:warning=🚀 Embedding Worker: Using PyOxidizer embedded Python");
        println!("cargo:rerun-if-changed=../src-tauri/target/pyembedded/pyo3-build-config-file.txt");

        // Link to the same embedded Python as src-tauri
        println!("cargo:rustc-link-search=native=../src-tauri/target/pyembedded");

        #[cfg(target_os = "windows")]
        {
            println!("cargo:rustc-link-search=native=../src-tauri/target/pyembedded/lib");
        }
    } else {
        // Development build: Use system Python/venv via PyO3
        println!("cargo:warning=🔧 Embedding Worker: Using system Python via PyO3");
        println!("cargo:warning=For production: Generate artifacts with 'pyoxidizer generate-python-embedding-artifacts' in src-tauri");
    }
}