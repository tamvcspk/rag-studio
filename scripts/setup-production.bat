@echo off
REM RAG Studio - Setup for Production Build
REM Generates PyOxidizer artifacts so that npm run tauri build uses embedded Python

echo ========================================
echo RAG Studio - Production Setup
echo Generating PyOxidizer artifacts...
echo ========================================

REM Ensure we're in the right directory
cd /d "%~dp0\.."

REM Activate virtual environment for PyOxidizer
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo ❌ Virtual environment required for PyOxidizer
    echo Run: python -m venv venv && venv\Scripts\activate.bat && pip install pyoxidizer
    exit /b 1
)

REM Install PyOxidizer if not available
python -c "import pyoxidizer" 2>nul
if errorlevel 1 (
    echo Installing PyOxidizer and dependencies...
    pip install pyoxidizer requests numpy
)

REM Generate PyOxidizer artifacts
cd src-tauri
if exist "target\pyembedded\pyo3-build-config-file.txt" (
    echo ✅ PyOxidizer artifacts already exist
) else (
    echo Generating PyOxidizer embedding artifacts...
    pyoxidizer generate-python-embedding-artifacts target\pyembedded
    
    if errorlevel 1 (
        echo ❌ Failed to generate PyOxidizer artifacts!
        exit /b 1
    )
    
    echo ✅ PyOxidizer artifacts generated successfully
)

echo.
echo ========================================
echo 🚀 Production build ready!
echo.
echo Now when you run:
echo   npm run tauri dev   ^(uses system Python^)
echo   npm run tauri build ^(uses embedded Python^)
echo ========================================