@echo off
echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   VoidLink APK Build                  ║
echo  ╚═══════════════════════════════════════╝
echo.

:: Check Node
node --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Node.js not found. Install from nodejs.org
    pause & exit /b 1
)

:: Check EAS
eas --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo Installing EAS CLI...
    npm install -g eas-cli
)

echo [1/3] Installing dependencies...
call npm install
IF ERRORLEVEL 1 (echo [ERROR] npm install failed & pause & exit /b 1)

echo.
echo [2/3] Logging into Expo...
echo  (Create a free account at expo.dev if you don't have one)
echo.
call eas login

echo.
echo [3/3] Building APK...
echo  This will take 5-10 minutes in the cloud.
echo  You'll get a download link when done.
echo.
call eas build --platform android --profile preview --non-interactive

echo.
echo  ✓ Build submitted! Check your email or expo.dev for the download link.
echo  Install the APK on your phone, then connect to your VoidLink server.
echo.
pause
