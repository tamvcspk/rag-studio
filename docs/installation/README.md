# Installation Documentation

This directory contains comprehensive setup and installation guides for RAG Studio with LanceDB integration.

## 📚 Available Guides

### [Quick Start Guide](./Quick_Start.md) ⚡
**For experienced developers** - Get up and running in 30 minutes
- Prerequisites check
- Fast setup commands
- Build and test scripts
- Troubleshooting quick fixes

### [Windows Build Setup Guide](./Windows_Build_Setup.md) 📖
**Complete step-by-step guide** - Comprehensive Windows setup
- Visual Studio Build Tools installation
- vcpkg setup and configuration
- Native dependency management (cmake, NASM, protobuf)
- Environment variable configuration
- Build verification and testing

## 🎯 Choose Your Path

| Your Situation | Recommended Guide |
|----------------|-------------------|
| **New to the project** | Start with [Windows Build Setup Guide](./Windows_Build_Setup.md) |
| **Have Rust + VS Build Tools** | Use [Quick Start Guide](./Quick_Start.md) |
| **Build is failing** | Check troubleshooting in either guide |
| **Setting up CI/CD** | Use automation scripts from [Windows Build Setup Guide](./Windows_Build_Setup.md) |

## 🚀 One-Liner Setup

For the truly impatient (requires Git, PowerShell, and admin rights):

```powershell
# This downloads and runs the setup script
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/your-repo/setup-windows.ps1'))
```

⚠️ **Security Note**: Only run scripts from trusted sources. Review the script content first.

## 📋 What Gets Installed

The setup process installs these components:

### Core Development Tools
- **Rust toolchain** (rustc, cargo)
- **Visual Studio Build Tools** (MSVC compiler)
- **Git** (version control)

### Native Build Dependencies
- **CMake** (build system generator)
- **NASM** (assembler for crypto libraries)
- **vcpkg** (C++ package manager)

### C++ Libraries (via vcpkg)
- **Protobuf** (protocol buffers)
- **OpenSSL** (cryptography)

### Project Dependencies
- **LanceDB** (vector database)
- **Tantivy** (full-text search)
- **Arrow** (columnar data format)

## 🔧 Build Requirements

### System Requirements
- **OS**: Windows 10/11 (x64)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 8GB free space
- **Network**: Internet connection for initial setup

### Performance Expectations
- **First build**: 30-60 minutes ⏳
- **Incremental builds**: 2-5 minutes ⚡
- **Clean builds**: 10-20 minutes 🔄

## 🆘 Getting Help

### Common Issues
1. **Long build times** → Normal for first build with native dependencies
2. **cmake/NASM not found** → Check PATH environment variables
3. **vcpkg errors** → Verify installation and integration
4. **Arrow version conflicts** → Gracefully handled in current implementation

### Support Resources
- **Troubleshooting sections** in both guides
- **Verification scripts** to check your setup
- **Build environment validation** tools
- **Project issue tracker** for unresolved problems

## 🎓 Understanding the Build

### Why So Complex?
RAG Studio integrates several advanced technologies:
- **Vector databases** require native performance
- **Cryptographic libraries** need specialized assemblers
- **Cross-language integration** (Rust ↔ Python ↔ C++)
- **Windows-specific** build toolchain requirements

### Architecture Overview
```
RAG Studio (Rust)
├── LanceDB (Native C++)
│   ├── Arrow (Columnar data)
│   ├── AWS LC (Cryptography) ← Requires NASM
│   └── Protobuf (Serialization)
├── Tantivy (Pure Rust) ✅
└── Python Integration (PyO3)
```

### Build Process
1. **Cargo** manages Rust dependencies
2. **vcpkg** provides C++ libraries
3. **Build tools** compile native dependencies
4. **Linker** combines everything into final binary

## 📈 Future Improvements

### Planned Enhancements
- **Docker-based builds** for consistency
- **Pre-compiled binaries** for common configurations
- **Automatic environment detection** and setup
- **Build caching** for faster CI/CD

### Version Compatibility
- **Current status**: LanceDB integration with Arrow version conflicts gracefully handled
- **Future target**: Full LanceDB activation when Arrow ecosystem aligns
- **Fallback**: Proven Tantivy + in-memory vector implementation

---

## 🚀 Ready to Build?

1. **New to the project?** → [Windows Build Setup Guide](./Windows_Build_Setup.md)
2. **Want to go fast?** → [Quick Start Guide](./Quick_Start.md)
3. **Need help?** → Check troubleshooting sections

Happy building! 🎉