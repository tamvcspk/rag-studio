# Quick Start Guide - Windows

## TL;DR - Fast Setup

For experienced developers who want to get building quickly:

### 1. Prerequisites Check
```powershell
# Verify you have these installed:
rustc --version     # Rust toolchain
cl                  # Visual Studio Build Tools
git --version       # Git
```

### 2. Install Tools (if missing)
```powershell
# Install missing tools
winget install Rustlang.Rustup         # Rust
winget install Kitware.CMake           # CMake
winget install nasm.nasm               # NASM assembler
```

### 3. Setup vcpkg (One-time)
```powershell
# Clone and build vcpkg
cd C:\
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg
.\bootstrap-vcpkg.bat

# Install native dependencies
.\vcpkg install protobuf:x64-windows openssl:x64-windows

# Set environment variables
[Environment]::SetEnvironmentVariable("VCPKG_ROOT", "C:\vcpkg", "User")
[Environment]::SetEnvironmentVariable("VCPKG_DEFAULT_TRIPLET", "x64-windows", "User")
```

### 4. Build RAG Studio
```powershell
# Clone project
git clone <repo-url>
cd rag-studio

# Set build environment and build
$env:PATH = "$env:PATH;C:\Program Files\CMake\bin;C:\vcpkg\installed\x64-windows\tools\protobuf;C:\Program Files\NASM"
$env:PROTOC = "C:\vcpkg\installed\x64-windows\tools\protobuf\protoc.exe"
$env:CMAKE = "C:\Program Files\CMake\bin\cmake.exe"
$env:VCPKG_ROOT = "C:\vcpkg"

cargo build --package rag-core
```

**Expected time**: 30-60 minutes for first build.

---

## Build Script

Save this as `build.ps1` in your project root:

```powershell
#!/usr/bin/env pwsh
# RAG Studio Build Script for Windows

Write-Host "🚀 Building RAG Studio with LanceDB integration..." -ForegroundColor Green

# Environment setup
$env:PATH = "$env:PATH;C:\Program Files\CMake\bin;C:\vcpkg\installed\x64-windows\tools\protobuf;C:\Program Files\NASM"
$env:PROTOC = "C:\vcpkg\installed\x64-windows\tools\protobuf\protoc.exe"
$env:CMAKE = "C:\Program Files\CMake\bin\cmake.exe"
$env:VCPKGRS_DYNAMIC = "1"
$env:VCPKGRS_TRIPLET = "x64-windows"
$env:VCPKG_ROOT = "C:\vcpkg"

Write-Host "📋 Environment configured" -ForegroundColor Yellow

# Build
Write-Host "🔨 Starting build..." -ForegroundColor Yellow
$buildStart = Get-Date

try {
    cargo build --package rag-core
    $buildEnd = Get-Date
    $duration = $buildEnd - $buildStart

    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "⏱️  Build time: $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
```

Usage: `.\build.ps1`

---

## Test Script

Save this as `test.ps1`:

```powershell
#!/usr/bin/env pwsh
# RAG Studio Test Script

Write-Host "🧪 Running RAG Studio tests..." -ForegroundColor Green

# Environment setup (same as build)
$env:PATH = "$env:PATH;C:\Program Files\CMake\bin;C:\vcpkg\installed\x64-windows\tools\protobuf;C:\Program Files\NASM"
$env:PROTOC = "C:\vcpkg\installed\x64-windows\tools\protobuf\protoc.exe"
$env:CMAKE = "C:\Program Files\CMake\bin\cmake.exe"
$env:VCPKG_ROOT = "C:\vcpkg"

Write-Host "📋 Running unit tests..." -ForegroundColor Yellow
cargo test --package rag-core --lib

Write-Host "📋 Running integration tests..." -ForegroundColor Yellow
cargo test --package rag-core --test vector_integration

Write-Host "✅ All tests completed!" -ForegroundColor Green
```

Usage: `.\test.ps1`

---

## Troubleshooting Quick Fixes

### Build Fails with "cmake not found"
```powershell
# Find and add cmake to PATH
$env:PATH = "$env:PATH;C:\Program Files\CMake\bin"
$env:CMAKE = "C:\Program Files\CMake\bin\cmake.exe"
```

### Build Fails with "NASM command not found"
```powershell
# Find NASM and add to PATH
Get-ChildItem -Path "C:\" -Filter "nasm.exe" -Recurse -ErrorAction SilentlyContinue
# Then add the found path to PATH, for example:
$env:PATH = "$env:PATH;C:\Program Files\NASM"
```

### Build Fails with "protoc not found"
```powershell
# Verify vcpkg protobuf installation
cd C:\vcpkg
.\vcpkg list protobuf
$env:PROTOC = "C:\vcpkg\installed\x64-windows\tools\protobuf\protoc.exe"
```

### Very Slow Build
This is normal for the first build (30-60 minutes). Subsequent builds are much faster.

---

## Development Workflow

### Daily Development
```powershell
# Quick check (fast)
cargo check --package rag-core

# Build and test
.\build.ps1 && .\test.ps1

# Run specific test
cargo test --package rag-core test_vector_db_config_creation
```

### Clean Build
```powershell
cargo clean
.\build.ps1
```

---

## IDE Setup

### VS Code
Install these extensions:
- **rust-analyzer**: Rust language support
- **CodeLLDB**: Debugging support

Add to `.vscode/settings.json`:
```json
{
    "rust-analyzer.cargo.features": "all",
    "rust-analyzer.checkOnSave.command": "check",
    "terminal.integrated.env.windows": {
        "VCPKG_ROOT": "C:\\vcpkg",
        "PROTOC": "C:\\vcpkg\\installed\\x64-windows\\tools\\protobuf\\protoc.exe",
        "CMAKE": "C:\\Program Files\\CMake\\bin\\cmake.exe"
    }
}
```

### IntelliJ/CLion
1. Install **Rust Plugin**
2. Configure **Cargo** settings to use proper environment
3. Set environment variables in **Run Configurations**

---

For complete setup instructions, see [Windows_Build_Setup.md](./Windows_Build_Setup.md).