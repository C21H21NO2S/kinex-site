@echo off
setlocal EnableExtensions
title KineX Site - http://localhost:5180
cd /d "%~dp0"

set "URL=http://localhost:5180"
set "PROBE=try { Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5180' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [KineX] Node.js was not found. Install Node.js 20 or newer, then run this file again.
  pause
  exit /B 1
)

rem Already running? Just open the browser.
powershell.exe -NoProfile -Command "%PROBE%"
if not errorlevel 1 (
  echo [KineX] The site is already running. Opening %URL% ...
  start "" "%URL%"
  timeout /T 2 >nul
  exit /B 0
)

if not exist "node_modules\" (
  echo [KineX] First run: installing dependencies ...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo [KineX] npm install failed. See the messages above.
    pause
    exit /B 1
  )
)

rem Open the browser as soon as the server answers (waits up to 30 seconds).
start "" /B powershell.exe -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5180' -TimeoutSec 1 | Out-Null; Start-Process '%URL%'; break } catch { Start-Sleep -Milliseconds 500 } }"

echo ========================================
echo   KineX promo site
echo   %URL%
echo   Close this window to stop the server.
echo ========================================
echo.
call npm.cmd run dev
echo.
echo [KineX] The server has stopped.
pause
