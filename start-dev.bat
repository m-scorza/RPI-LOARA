@echo off
cd /d "%~dp0"
set "NODEDIR=%USERPROFILE%\Downloads\node-v25.9.0-win-x64\node-v25.9.0-win-x64"
set "PATH=%NODEDIR%;%PATH%"

echo === Checking Node.js ===
node -v
if %errorlevel% neq 0 (
    echo ERROR: node.exe not found. Check NODEDIR path in this bat file.
    pause & exit /b 1
)

echo === Installing dependencies ===
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause & exit /b 1
)

echo === Starting dev server ===
call npm run dev
pause
