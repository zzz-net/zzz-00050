@echo off
setlocal enabledelayedexpansion
set "CURL=C:\Windows\System32\curl.exe"
set "BASE=http://localhost:3002/api"
set "TDIR=%~dp0t_%RANDOM%"
md "%TDIR%" 2>nul
set "OUT=%TDIR%\resp.txt"
set "STF=%TDIR%\status.txt"
set "TH="
set "BH="

echo Running curl with exact regression format...
echo CMDLINE: "%CURL%" -s -S -w "%%{http_code}" -o "%OUT%" %TH% %BH% -X GET "%BASE%/health" 1^> "%STF%" 2^>^&1

"%CURL%" -s -S -w "%%{http_code}" -o "%OUT%" %TH% %BH% -X GET "%BASE%/health" 1> "%STF%" 2>&1

echo done. errorlevel=%errorlevel%
echo.
echo ----STF----
type "%STF%"
echo ----END STF----
echo.
echo ----OUT----
type "%OUT%"
echo ----END OUT----
exit /b 0
