@echo off
title Bridgebox Voice - App
echo Starting Bridgebox Voice...

:: Kill any existing process on port 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Start Vite dev server in background
cd /d "c:\dev\github\business\Bridgebox Voice_Simple"
start /min "" cmd /c "npm run dev"

:: Wait for server to be ready
echo Waiting for server to start...
timeout /t 4 /nobreak >nul

:: Try opening until server responds
:WAIT
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto WAIT
)

:: Open in default browser
start "" "http://localhost:5173"
echo Bridgebox Voice is running at http://localhost:5173
