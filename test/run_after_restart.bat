@echo off
REM  ========================================================================
REM   run_after_restart.bat - Runner that STARTS npm run dev in background,
REM   waits for it to be ready, THEN CALLS after_restart.bat.
REM   This ensures server + tests run in the SAME cmd.exe process
REM   (same network namespace / sandbox) so curl.exe can actually reach :3002.
REM   All commands are still cmd.exe native + curl.exe -- NO PowerShell.
REM  ========================================================================
setlocal enabledelayedexpansion

set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo ========================================================================
echo   RUNNER: Starting npm run dev in background...
echo ========================================================================
echo.

REM Kill any existing stray node/nodemon/tsx first (clean slate for "restart" test)
taskkill /IM tsx.exe /F >nul 2>&1
taskkill /IM nodemon.exe /F >nul 2>&1
taskkill /IM node.exe /FI "WINDOWTITLE eq *zzz*" /F >nul 2>&1
timeout 3 > nul

REM Start server in background of SAME cmd process (shared network!)
start "dev_server" /B /D "%CD%" npm run dev > "%SCRIPTDIR%server_start.log" 2>&1

echo   Server launched via START /B (shared network sandbox)
echo   Waiting 15 seconds for port 3002 to come up...
timeout 15 > nul
echo.

REM Sanity check: curl health once
echo   Preflight health check...
C:\Windows\System32\curl.exe -s --connect-timeout 5 http://localhost:3002/api/health > "%SCRIPTDIR%_preflight.json" 2>nul
type "%SCRIPTDIR%_preflight.json"
echo.
echo.

echo ========================================================================
echo   RUNNER: Now calling test\after_restart.bat
echo ========================================================================
echo.

call "%SCRIPTDIR%after_restart.bat"
set "RV=%errorlevel%"

echo.
echo ========================================================================
echo   RUNNER COMPLETED. after_restart exit=%RV%
echo   (server process still running in background)
echo ========================================================================
endlocal & exit /b %RV%
