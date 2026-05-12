@echo off
SETLOCAL EnableDelayedExpansion

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   VoidLink Windows Build Script       ║
echo  ║   Builds VoidLink.exe + installer     ║
echo  ╚═══════════════════════════════════════╝
echo.

:: Check Python
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python not found. Install from python.org
    pause & exit /b 1
)

:: Check pip
pip --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] pip not found.
    pause & exit /b 1
)

echo [1/5] Installing build dependencies...
pip install -r requirements-desktop.txt --quiet
IF ERRORLEVEL 1 (echo [ERROR] Failed to install desktop deps & pause & exit /b 1)

echo [2/5] Installing backend dependencies...
pip install -r ..\backend\requirements.txt --quiet
IF ERRORLEVEL 1 (echo [ERROR] Failed to install backend deps & pause & exit /b 1)

echo [3/5] Generating icon...
python icon_gen.py
IF ERRORLEVEL 1 (echo [WARNING] Icon generation failed, using default)

echo [4/5] Building VoidLink.exe with PyInstaller...
pyinstaller voidlink.spec --noconfirm --clean
IF ERRORLEVEL 1 (echo [ERROR] PyInstaller build failed & pause & exit /b 1)

echo [5/5] Done!
echo.
echo  Output: dist\VoidLink.exe
echo.
echo  To build the installer:
echo   1. Install Inno Setup from jrsoftware.org
echo   2. Open ..\installer\voidlink_setup.iss
echo   3. Press Ctrl+F9 to compile
echo   4. Installer will be at ..\installer\output\VoidLink-Setup-1.0.0.exe
echo.

IF EXIST "dist\VoidLink.exe" (
    echo  ✓ VoidLink.exe built successfully!
    echo  Size:
    for %%A in ("dist\VoidLink.exe") do echo    %%~zA bytes
)

pause
