@echo off
REM LocalBolt — One-command setup + start (Windows)

echo.
echo   ⚡ LocalBolt — Encrypted P2P File Transfer
echo.

REM ── Check Rust ─────────────────────────────────────────────────────────
where cargo >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   Rust not found. Please install from https://rustup.rs
    echo   After installing, restart this terminal and run start.bat again.
    pause
    exit /b 1
)

REM ── Check Node.js ──────────────────────────────────────────────────────
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   Node.js not found. Please install from https://nodejs.org
    echo   After installing, restart this terminal and run start.bat again.
    pause
    exit /b 1
)

REM ── Install web dependencies ───────────────────────────────────────────
if not exist "web\node_modules" (
    echo   Installing web dependencies...
    cd web && npm install --silent && cd ..
    echo.
)

REM ── Build signal server (first run only) ───────────────────────────────
if not exist "signal\target\release\localbolt-signal.exe" (
    echo   Building signaling server (first run, takes ~30s^)...
    cd signal && cargo build --release && cd ..
    echo.
)

REM ── Start signaling server ─────────────────────────────────────────────
echo   Starting signaling server on port 3001...
start /B cmd /C "cd signal && cargo run --release 2>nul"

timeout /t 3 /nobreak >nul

REM ── Start web app ──────────────────────────────────────────────────────
echo   Starting web app on port 8080...
echo.
echo   ┌─────────────────────────────────────────┐
echo   │                                         │
echo   │   Open http://localhost:8080             │
echo   │   in your browser                       │
echo   │                                         │
echo   │   Open on two devices, click Devices,   │
echo   │   and start transferring files.          │
echo   │                                         │
echo   └─────────────────────────────────────────┘
echo.

cd web && npx vite --host --port 8080
