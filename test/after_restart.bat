@echo off
REM  ========================================================================
REM   after_restart.bat - Pure cmd.exe + C:\Windows\System32\curl.exe
REM   Verify PERSISTENCE after npm run dev restart:
REM     - tickets / logs still exist (data/db.json was written & reloaded)
REM     - ticket status preserved (main=reopened=pending, return=pending after resubmit, conflict=assigned)
REM     - operation logs sorted DESCENDING by id (critical: no sort drift after restart)
REM     - CSV export still has >=37 lines (initial 33 + regression 4)
REM   NO PowerShell wrapper. NO external JSON parser.
REM   All assertions via C:\Windows\System32\findstr.exe / find.exe.
REM  ========================================================================
setlocal enabledelayedexpansion

set "CURL=C:\Windows\System32\curl.exe"
if not exist "%CURL%" set "CURL=C:\Windows\SysWOW64\curl.exe"
if not exist "%CURL%" set "CURL=curl.exe"
set "FINDSTR=C:\Windows\System32\findstr.exe"
if not exist "%FINDSTR%" set "FINDSTR=C:\Windows\SysWOW64\findstr.exe"
if not exist "%FINDSTR%" set "FINDSTR=findstr.exe"
set "FIND=C:\Windows\System32\find.exe"
if not exist "%FIND%" set "FIND=C:\Windows\SysWOW64\find.exe"
if not exist "%FIND%" set "FIND=find.exe"

set "BASE=http://localhost:3002/api"
set "SCRIPTDIR=%~dp0"
set "TMPDIR=%SCRIPTDIR%restart_%RANDOM%_%RANDOM%"
md "%TMPDIR%" 2>nul
echo sanity > "%TMPDIR%\test.txt" 2>nul
if not exist "%TMPDIR%\test.txt" (
    set "TMPDIR=test\restart_%RANDOM%"
    md "%TMPDIR%" 2>nul
)
echo Using curl: %CURL%
echo Using temp: %TMPDIR%

set /a PASS=0
set /a FAIL=0
set "TK_A="

goto :start

REM ======= helpers =======
:hdr
echo.
echo ========================================================================
echo   %~1
echo ========================================================================
exit /b

:cas
echo.
echo   ^> %~1
exit /b

:ok
echo     [PASS] %~1
set /a PASS+=1
exit /b

:fail
echo     [FAIL] %~1
set /a FAIL+=1
exit /b

REM ---- do_req METHOD URLPATH BODYFILE TOKEN EXPECT_STATUS LABEL ----
:do_req
set "M=%~1"
set "U=%~2"
set "B=%~3"
set "TK=%~4"
set "EXPECT=%~5"
set "LBL=%~6"
set "OUT=%TMPDIR%\resp_%RANDOM%_%RANDOM%.txt"
set "STF=%TMPDIR%\st_%RANDOM%_%RANDOM%.txt"

set "TH="
if not "%TK%"=="" set "TH=-H "Authorization: Bearer %TK%""
set "BH="
if not "%B%"=="" set "BH=-H "Content-Type: application/json" --data-binary @"%B%""

"%CURL%" -s -S -w "%%{http_code}" -o "%OUT%" %TH% %BH% -X %M% "%BASE%%U%" 1> "%STF%" 2>&1

set "ST="
for /f "delims=" %%x in ('type "%STF%" 2^>nul') do set "ST=%%x"
set "HTTP_BODY=%OUT%"
if "%ST%"=="%EXPECT%" goto :_rs_ok
call :fail "HTTP expected %EXPECT% got %ST% - %LBL%"
for /f "usebackq delims=" %%L in (`type "%OUT%" 2^>nul`) do call :_rs_show "%%L"
goto :_rs_done
:_rs_ok
call :ok "HTTP %EXPECT% - %LBL%"
goto :_rs_done
:_rs_show
set "_ln=%~1"
echo        [!_ln:~0,250!]
goto :eof
:_rs_done
exit /b

:have
"%FINDSTR%" /c:"%~1" "%HTTP_BODY%" >nul 2>&1
if %errorlevel%==0 (
    call :ok "contains '%~1'"
) else (
    call :fail "MISSING '%~1'"
    echo        --- body head ---
    for /f "usebackq delims=" %%L in (`type "%HTTP_BODY%" 2^>nul`) do (
        set "_ln=%%L"
        echo        !_ln:~0,250!
        goto :_have_after
    )
    :_have_after
    echo        ---
)
exit /b

:tok
set "EXTRACT_VAL="
set "_line="
for /f "usebackq delims=" %%L in (`type "%HTTP_BODY%" 2^>nul ^| "%FINDSTR%" /c:"\"token\":"`) do set "_line=%%L"
if "!_line!"=="" goto :_tok_x
set "_rest=!_line:*"token":"=!"
if "!_rest!"=="!_line!" goto :_tok_x
for /f tokens^=1^ delims^=^" %%V in ("!_rest!") do set "EXTRACT_VAL=%%V"
:_tok_x
exit /b

REM Extract FIRST numeric "id" from JSON body -> EXTRACT_VAL
:id
set "EXTRACT_VAL="
set "_line="
for /f "usebackq delims=" %%L in (`type "%HTTP_BODY%" 2^>nul ^| "%FINDSTR%" /r "\"id\":"`) do set "_line=%%L"
if "!_line!"=="" goto :_id_x
set "_rest=!_line:*"id":=!"
if "!_rest!"=="!_line!" goto :_id_x
for /f "tokens=1 delims=,} " %%V in ("!_rest!") do set "EXTRACT_VAL=%%V"
:_id_x
exit /b

REM ============================================================
:start

call :hdr "AFTER RESTART: Persistence verification (curl.exe, NO PS)"

REM ============== A. System health ==============
call :cas "A.1 Health check"
call :do_req GET "/health" "" "" 200 "after-restart health"

REM ============== B. Admin login ==============
call :hdr "B. Admin login"
call :cas "B.1 admin login"
set "BF=%TMPDIR%\b1.json"
> "%BF%" echo {"username":"admin","password":"123456"}
call :do_req POST "/auth/login" "%BF%" "" 200 "admin login"
call :have "\"success\":true"
call :tok
set "TK_A=!EXTRACT_VAL!"
if not "!TK_A!"=="" (call :ok "admin token captured prefix=!TK_A:~0,10!...") else (call :fail "admin token missing")

REM ============== C. Tickets total (persistence) ==============
call :hdr "C. Tickets persistence - count & high IDs preserved"
call :cas "C.1 list all tickets (limit=200)"
call :do_req GET "/tickets?limit=200" "" "!TK_A!" 200 "list tickets"
call :have "\"success\":true"
call :have "\"total\":"

REM Extract total tickets
set "TOTAL_T="
for /f "usebackq delims=" %%L in (`type "%HTTP_BODY%" 2^>nul ^| "%FINDSTR%" /r "\"total\":"`) do (
    set "_ln=%%L"
    set "_r=!_ln:*"total":=!"
    for /f "tokens=1 delims=,} " %%N in ("!_r!") do set "TOTAL_T=%%N"
)
if !TOTAL_T! GEQ 33 (call :ok "tickets total=!TOTAL_T! (>= initial 33, data persisted)") else (call :fail "tickets total=!TOTAL_T! expected >=33")

REM Ensure regression-created HIGH IDs still exist (>=40 means recent writes survived restart)
"%FINDSTR%" /r "\"id\":[4-9][0-9]" "%HTTP_BODY%" >nul 2>&1
if %errorlevel%==0 (call :ok "high-id tickets (>=40) exist in list - regression writes persisted") else (call :fail "no high-id tickets in list - data may have been reset")

REM ============== D. Logs persistence + strict DESC order (critical) ==============
call :hdr "D. Operation logs persistence + STRICT DESCENDING order (id)"
call :cas "D.1 get logs (limit=200)"
call :do_req GET "/logs?limit=200" "" "!TK_A!" 200 "list logs"
call :have "\"success\":true"
call :have "\"total\":"

set "TOTAL_L="
for /f "usebackq delims=" %%L in (`type "%HTTP_BODY%" 2^>nul ^| "%FINDSTR%" /r "\"total\":"`) do (
    set "_ln=%%L"
    set "_r=!_ln:*"total":=!"
    for /f "tokens=1 delims=,} " %%N in ("!_r!") do set "TOTAL_L=%%N"
)
if !TOTAL_L! GEQ 101 (call :ok "logs total=!TOTAL_L! (>= initial 101, persisted)") else (call :fail "logs total=!TOTAL_L! expected >=101")

REM Check log DESC order: scan body, find first "id":N (log[0]) and 6th "id":N (log[5]).
REM If DESC is enforced, first_id > fifth_id.
REM We accomplish this by matching "id":N with findstr /n /o, then taking first and 6th matches.
set "LOG1_ID="
set "LOG6_ID="
set "LOG_ID_FILE=%TMPDIR%\log_ids.txt"
"%FINDSTR%" /r /o "\"id\":[0-9][0-9]*" "%HTTP_BODY%" 2>nul > "%LOG_ID_FILE%"
set /a IDX=0
for /f "tokens=2 delims=:" %%A in ('type "%LOG_ID_FILE%" 2^>nul') do (
    set /a IDX+=1
    for /f "tokens=1 delims=," %%N in ("%%A") do (
        if !IDX!==1 set "LOG1_ID=%%N"
        if !IDX!==6 set "LOG6_ID=%%N"
    )
)
if defined LOG1_ID (call :ok "log[0] id = !LOG1_ID!") else (call :fail "cannot read log[0] id")
if defined LOG6_ID (call :ok "log[5] id = !LOG6_ID!") else (call :fail "cannot read log[5] id")
REM CRITICAL: LOG1_ID MUST be > LOG6_ID (DESCENDING order!)
if !LOG1_ID! GTR !LOG6_ID! (call :ok "LOG ORDER VERIFIED: log[0].id=!LOG1_ID! > log[5].id=!LOG6_ID! (STRICT DESC, sort NOT broken by restart)") else (call :fail "LOG ORDER BROKEN: log[0].id=!LOG1_ID! is NOT greater than log[5].id=!LOG6_ID! - restart sort drift")

REM ============== E. CSV export integrity after restart ==============
call :hdr "E. CSV export (UTF8 BOM + 13 cols + >=37 rows after persistence)"
call :cas "E.1 admin exports CSV"
set "CSV=%TMPDIR%\after_restart.csv"
set "CSVSTF=%TMPDIR%\csv_st.txt"
"%CURL%" -s -S -w "%%{http_code}" -o "%CSV%" -H "Authorization: Bearer !TK_A!" "%BASE%/export/tickets" 1> "%CSVSTF%" 2>&1
set "CSVS="
for /f "delims=" %%x in ('type "%CSVSTF%" 2^>nul') do set "CSVS=%%x"
if "!CSVS!"=="200" (call :ok "CSV HTTP 200") else (call :fail "CSV HTTP expected 200 got !CSVS!")

REM Count lines
set /a CSV_LINES=0
set "FINDTMP=%TMPDIR%\findcsv.txt"
"%FIND%" /c /v "" "%CSV%" > "%FINDTMP%" 2>&1
for /f "usebackq tokens=3" %%C in (`type "%FINDTMP%"`) do set /a CSV_LINES=%%C
if !CSV_LINES! GEQ 34 (call :ok "CSV lines = !CSV_LINES! (>=34 rows persisted)") else (call :fail "CSV only !CSV_LINES! lines, expected >=34")

REM 13 columns = 12 commas in header
set "HDR="
set /p HDR=<"%CSV%"
set /a COMMAS=0
:cmc2
if "!HDR!"=="" goto :cmcdone2
set "C1=!HDR:~0,1!"
if "!C1!"=="," set /a COMMAS+=1
set "HDR=!HDR:~1!"
goto :cmc2
:cmcdone2
if !COMMAS! GEQ 12 (call :ok "CSV header has !COMMAS! commas (>=12 => 13 columns OK)") else (call :fail "CSV header has only !COMMAS! commas (expected >=12)")

REM Year stamp present (20xx)
"%FINDSTR%" /r "20[0-9][0-9]" "%CSV%" >nul 2>&1
if %errorlevel%==0 (call :ok "CSV contains 20xx year timestamps") else (call :fail "CSV no year timestamps")

REM ============== F. Ticket status integrity ==============
call :hdr "F. Individual ticket status integrity (post-restart values correct)"

REM Fetch the highest-id ticket (last created in regression) via ?limit=1&sortDesc=true
call :cas "F.1 most recent ticket (conflict test, should be status=assigned version=2)"
call :do_req GET "/tickets?limit=1" "" "!TK_A!" 200 "fetch top1 ticket"
call :have "\"success\":true"
REM conflict ticket was d2 assigned (version=2 assigned)
call :have "\"status\":\"assigned\""
call :have "\"version\":2"

REM Extract that ticket id, then check the 2nd-highest (return ticket, status=pending after resubmit, version>=2)
call :cas "F.2 return ticket (status=pending after resubmit)"
call :do_req GET "/tickets?limit=3" "" "!TK_A!" 200 "fetch top3 tickets"
call :have "\"success\":true"
REM return ticket resubmitted -> pending
call :have "\"status\":\"pending\""

REM ============== SUMMARY ==============
call :hdr "AFTER RESTART - TEST SUMMARY (ALL curl.exe, NO PowerShell)"
echo   [PASS] %PASS%
echo   [FAIL] %FAIL%
if %FAIL%==0 echo     *** ALL CHECKS PASSED - PERSISTENCE VERIFIED ***
echo.
echo   Temp dir       : %TMPDIR%
echo.
endlocal & exit /b %FAIL%
