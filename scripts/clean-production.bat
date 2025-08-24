@echo off
REM RAG Studio - Clean Production Artifacts
REM Removes PyOxidizer artifacts to force development mode

echo ========================================
echo RAG Studio - Clean Production Setup  
echo Removing PyOxidizer artifacts...
echo ========================================

REM Ensure we're in the right directory
cd /d "%~dp0\.."

if exist "src-tauri\target\pyembedded" (
    echo Removing PyOxidizer embedded Python artifacts...
    rmdir /s /q "src-tauri\target\pyembedded"
    echo ✅ PyOxidizer artifacts removed
) else (
    echo ✅ No PyOxidizer artifacts found
)

echo.
echo ========================================
echo 🔧 Development mode ready!
echo.
echo Now when you run:
echo   npm run tauri dev   ^(uses system Python^)
echo   npm run tauri build ^(uses system Python^)
echo ========================================