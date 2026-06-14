@echo off
REM ========================================================================
REM  Community Repair Dispatch - Regression Test (PURE curl.exe batch)
REM  All HTTP via C:\Windows\System32\curl.exe. JSON body hardcoded per call
REM  (no variable echo -> no quote escaping corruption).
REM  JSON assertions via C:\Windows\System32\findstr.exe.
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
REM Use directory relative to this script (NOT system TEMP) to avoid write permission issues
set "SCRIPTDIR=%~dp0"
set "TMPDIR=%SCRIPTDIR%tmp_%RANDOM%_%RANDOM%"
md "%TMPDIR%" 2>nul
REM Verify we can write
echo sanity > "%TMPDIR%\test.txt" 2>nul
if not exist "%TMPDIR%\test.txt" (
    echo ERROR: Cannot write to temp dir %TMPDIR%
    echo Falling back to current dir test\tmp...
    set "TMPDIR=test\tmp_%RANDOM%"
    md "%TMPDIR%" 2>nul
)
echo Using curl: %CURL%
echo Using temp: %TMPDIR%

set /a PASS=0
set /a FAIL=0
set "TK_R1="  & set "TK_D1=" & set "TK_D2="
set "TK_M1="  & set "TK_A1="
set "MAIN_TID="   & set "RETURN_TID="  & set "CONFLICT_TID="
set "CSV_SNAP="

REM ===================== helpers =====================
goto :start

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

REM ============================================================
REM  :do_req  METHOD  URLPATH  BODYFILE(or "")  TOKEN  EXPECT_STATUS  LABEL
REM  uses last BODYFILE: set by :mkbody
REM ============================================================
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

REM extract last line = status code
set "ST="
for /f "delims=" %%x in ('type "%STF%" 2^>nul') do set "ST=%%x"
set "HTTP_BODY=%OUT%"
REM ---- check status match ----
if "%ST%"=="%EXPECT%" goto :_req_statusok
call :fail "HTTP expected %EXPECT% got %ST% - %LBL%"
REM show body preview (safe - no pipe or parens in label code)
for /f "usebackq delims=" %%L in (`type "%OUT%" 2^>nul`) do call :_showbody "%%L"
goto :_req_done

:_req_statusok
call :ok "HTTP %EXPECT% - %LBL%"
goto :_req_done

:_showbody
set "_ln=%~1"
echo        [!_ln:~0,250!]
goto :eof

:_req_done
exit /b

REM assert body contains string %1
:have
"%FINDSTR%" /c:"%~1" "%HTTP_BODY%" >nul 2>&1
if %errorlevel%==0 (
    call :ok "contains '%~1'"
) else (
    call :fail "MISSING '%~1'"
    echo        --- body first 250 chars:
    for /f "usebackq delims=" %%L in (`type "%HTTP_BODY%" 2^>nul`) do (
        set "_ln=%%L"
        echo        !_ln:~0,250!
        goto :_after_body_have
    )
    :_after_body_have
    echo        ---
)
exit /b

REM extract value of "token":"..." -> EXTRACT_VAL
REM JSON has nested: {"success":true,"data":{"token":"tk_XXX",...}}
REM We find the literal "token":" pattern, take substring between next pair of quotes
:tok
set "EXTRACT_VAL="
set "_line="
for /f "usebackq delims=" %%L in (`type "%HTTP_BODY%" 2^>nul ^| "%FINDSTR%" /c:"\"token\":"`) do set "_line=%%L"
if "!_line!"=="" goto :_tok_done
REM Now chop from left after "token":" (length=9)
set "_rest=!_line:*"token":"=!"
if "!_rest!"=="!_line!" goto :_tok_done
REM Now _rest starts with token_value"...", take until first "
for /f tokens^=1^ delims^=^" %%V in ("!_rest!") do set "EXTRACT_VAL=%%V"
:_tok_done
exit /b

REM extract first numeric "id" value -> EXTRACT_VAL
REM JSON may have: {"success":true,"data":{"ticket":{"id":34,"status":"pending",...}}}
:id
set "EXTRACT_VAL="
set "_line="
for /f "usebackq delims=" %%L in (`type "%HTTP_BODY%" 2^>nul ^| "%FINDSTR%" /r "\"id\":"`) do set "_line=%%L"
if "!_line!"=="" goto :_id_done
REM chop from left after first occurrence of "id":
set "_rest=!_line:*"id":=!"
if "!_rest!"=="!_line!" goto :_id_done
REM now _rest starts with number, take until first non-digit delimiter (, or } or space)
for /f "tokens=1 delims=,} " %%V in ("!_rest!") do set "EXTRACT_VAL=%%V"
:_id_done
exit /b

REM ============================================================
:start

call :hdr "0. System health (curl.exe - direct absolute path)"
call :cas "0.1 GET /api/health"
call :do_req GET "/health" "" "" 200 "health"

call :hdr "1. Login and role permissions"

REM 1.1 resident1
call :cas "1.1 resident1 login"
set "BF=%TMPDIR%\b11.json"
> "%BF%" echo {"username":"resident1","password":"123456"}
call :do_req POST "/auth/login" "%BF%" "" 200 "login resident1"
call :have "\"success\":true"
call :tok
set "TK_R1=!EXTRACT_VAL!"
if not "!TK_R1!"=="" (call :ok "captured token prefix !TK_R1:~0,12!...") else (call :fail "token extraction failed")

REM 1.2 dispatcher1
call :cas "1.2 dispatcher1 login"
set "BF=%TMPDIR%\b12.json"
> "%BF%" echo {"username":"dispatcher1","password":"123456"}
call :do_req POST "/auth/login" "%BF%" "" 200 "login dispatcher1"
call :tok & set "TK_D1=!EXTRACT_VAL!"
if not "!TK_D1!"=="" (call :ok "d1 token OK") else (call :fail "d1 token missing")

REM 1.3 dispatcher2
call :cas "1.3 dispatcher2 login (for conflict)"
set "BF=%TMPDIR%\b13.json"
> "%BF%" echo {"username":"dispatcher2","password":"123456"}
call :do_req POST "/auth/login" "%BF%" "" 200 "login dispatcher2"
call :tok & set "TK_D2=!EXTRACT_VAL!"
if not "!TK_D2!"=="" (call :ok "d2 token OK") else (call :fail "d2 token missing")

REM 1.4 repair1
call :cas "1.4 repair1 login"
set "BF=%TMPDIR%\b14.json"
> "%BF%" echo {"username":"repair1","password":"123456"}
call :do_req POST "/auth/login" "%BF%" "" 200 "login repair1"
call :tok & set "TK_M1=!EXTRACT_VAL!"
if not "!TK_M1!"=="" (call :ok "m1 token OK") else (call :fail "m1 token missing")

REM 1.5 admin
call :cas "1.5 admin login"
set "BF=%TMPDIR%\b15.json"
> "%BF%" echo {"username":"admin","password":"123456"}
call :do_req POST "/auth/login" "%BF%" "" 200 "login admin"
call :tok & set "TK_A1=!EXTRACT_VAL!"
if not "!TK_A1!"=="" (call :ok "admin token OK") else (call :fail "admin token missing")

REM 1.6 wrong password -> 401
call :cas "1.6 wrong password MUST 401"
set "BF=%TMPDIR%\b16.json"
> "%BF%" echo {"username":"resident1","password":"wrongpass"}
call :do_req POST "/auth/login" "%BF%" "" 401 "wrong password 401"

REM 1.7 resident assign -> 403
call :cas "1.7 resident assigns ticket -> MUST 403"
set "BF=%TMPDIR%\b17.json"
> "%BF%" echo {"repairId":5,"version":1}
call :do_req PUT "/tickets/1/assign" "%BF%" "!TK_R1!" 403 "resident assign denied"

REM 1.8 resident logs -> 403
call :cas "1.8 resident reads logs -> MUST 403"
call :do_req GET "/logs" "" "!TK_R1!" 403 "resident logs denied"

REM 1.9 repair reopen -> 403
call :cas "1.9 repair reopens -> MUST 403"
call :do_req PUT "/tickets/1/reopen" "" "!TK_M1!" 403 "repair reopen denied"

REM 1.10 dispatcher list repairs
call :cas "1.10 dispatcher lists repair workers"
call :do_req GET "/users?role=repair" "" "!TK_D1!" 200 "dispatcher list repairs"
call :have "\"success\":true"

call :hdr "2. MAIN FLOW Create - Assign - Process - Close"

REM 2.1 no address -> 400
call :cas "2.1 no address -> 400"
set "BF=%TMPDIR%\b21.json"
> "%BF%" echo {"title":"t","category":"water","address":"","description":"d"}
call :do_req POST "/tickets" "%BF%" "!TK_R1!" 400 "no address 400"

REM 2.2 no category -> 400
call :cas "2.2 no category -> 400"
set "BF=%TMPDIR%\b22.json"
> "%BF%" echo {"title":"t","category":"","address":"a","description":"d"}
call :do_req POST "/tickets" "%BF%" "!TK_R1!" 400 "no category 400"

REM 2.3 create main ticket
call :cas "2.3 SUCCESS create Kitchen faucet ticket"
set "BF=%TMPDIR%\b23.json"
> "%BF%" echo {"title":"Kitchen faucet leaking","category":"water","address":"B3U2R201","description":"dripping under sink"}
call :do_req POST "/tickets" "%BF%" "!TK_R1!" 200 "create main"
call :have "\"success\":true"
call :id
set "MAIN_TID=!EXTRACT_VAL!"
if not "!MAIN_TID!"=="" (call :ok "main_ticket_id=!MAIN_TID!") else (call :fail "failed to extract ticket id")

REM 2.4 verify status=pending version=1
call :cas "2.4 verify status=pending version=1"
call :do_req GET "/tickets/!MAIN_TID!" "" "!TK_R1!" 200 "get main ticket"
call :have "\"status\":\"pending\""
call :have "\"version\":1"

REM 2.5 assign to repair1
call :cas "2.5 dispatcher assigns to repair1 (v1)"
set "BF=%TMPDIR%\b25.json"
> "%BF%" echo {"repairId":5,"version":1}
call :do_req PUT "/tickets/!MAIN_TID!/assign" "%BF%" "!TK_D1!" 200 "assign ticket"
call :have "\"success\":true"

REM 2.6 verify assigned v2
call :cas "2.6 verify assigned + version=2"
call :do_req GET "/tickets/!MAIN_TID!" "" "!TK_D1!" 200 "verify assigned"
call :have "\"status\":\"assigned\""
call :have "\"version\":2"

REM 2.7 fill process result
call :cas "2.7 repair fills process result"
set "BF=%TMPDIR%\b27.json"
> "%BF%" echo {"result":"Replaced ceramic cartridge and tested for leaks - all OK"}
call :do_req PUT "/tickets/!MAIN_TID!/process" "%BF%" "!TK_M1!" 200 "fill process result"
call :have "\"success\":true"

REM 2.8 close ticket
call :cas "2.8 repair closes ticket"
call :do_req PUT "/tickets/!MAIN_TID!/close" "" "!TK_M1!" 200 "close ticket"
call :have "\"success\":true"

REM 2.9 verify closed + processResult
call :cas "2.9 verify closed + processResult present"
call :do_req GET "/tickets/!MAIN_TID!" "" "!TK_R1!" 200 "verify closed"
call :have "\"status\":\"closed\""
call :have "Replaced ceramic cartridge"

call :hdr "3. RETURN FLOW + close-without-result 400"

REM 3.1 create return ticket
call :cas "3.1 create return ticket"
set "BF=%TMPDIR%\b31.json"
> "%BF%" echo {"title":"Hall light flickers","category":"electric","address":"B2F3","description":"flickering light"}
call :do_req POST "/tickets" "%BF%" "!TK_R1!" 200 "create return ticket"
call :id & set "RETURN_TID=!EXTRACT_VAL!"
if not "!RETURN_TID!"=="" (call :ok "return_ticket_id=!RETURN_TID!") else (call :fail "no return_ticket_id")

REM 3.2 dispatcher returns ticket
call :cas "3.2 dispatcher returns ticket"
set "BF=%TMPDIR%\b32.json"
> "%BF%" echo {"reason":"Missing unit number please specify"}
call :do_req PUT "/tickets/!RETURN_TID!/return" "%BF%" "!TK_D1!" 200 "return ticket"
call :have "\"success\":true"

REM 3.3 verify status=returned
call :cas "3.3 verify status=returned"
call :do_req GET "/tickets/!RETURN_TID!" "" "!TK_R1!" 200 "verify returned"
call :have "\"status\":\"returned\""

REM 3.4 resubmit
call :cas "3.4 resident resubmits with full address"
set "BF=%TMPDIR%\b34.json"
> "%BF%" echo {"title":"Hall light flickers","category":"electric","address":"B2U3F3-E","description":"still flickering"}
call :do_req PUT "/tickets/!RETURN_TID!/resubmit" "%BF%" "!TK_R1!" 200 "resubmit"
call :have "\"success\":true"

REM 3.5 verify status=pending
call :cas "3.5 verify status back to pending"
call :do_req GET "/tickets/!RETURN_TID!" "" "!TK_R1!" 200 "verify pending after resubmit"
call :have "\"status\":\"pending\""

REM 3.6 close without processResult -> 400
call :cas "3.6 FAIL: close ticket w/o processResult -> MUST 400"
set "BF=%TMPDIR%\b36a.json"
> "%BF%" echo {"title":"CloseTestBat","category":"water","address":"x","description":"y"}
call :do_req POST "/tickets" "%BF%" "!TK_R1!" 200 "create close-test ticket"
call :id & set "CTID=!EXTRACT_VAL!"
set "BF=%TMPDIR%\b36b.json"
> "%BF%" echo {"repairId":5,"version":1}
call :do_req PUT "/tickets/!CTID!/assign" "%BF%" "!TK_D1!" 200 "preassign close-test"
call :do_req PUT "/tickets/!CTID!/close" "" "!TK_M1!" 400 "close-without-result 400"

call :hdr "4. OPTIMISTIC LOCK 409 + conflict:true TRIPLE CHECK"

REM 4.1 create conflict ticket
call :cas "4.1 create conflict test ticket"
set "BF=%TMPDIR%\b41.json"
> "%BF%" echo {"title":"BAT409 Conflict Test","category":"water","address":"bat-conflict-addr","description":"optimistic lock check via pure curl bat"}
call :do_req POST "/tickets" "%BF%" "!TK_R1!" 200 "create conflict ticket"
call :id & set "CONFLICT_TID=!EXTRACT_VAL!"
if not "!CONFLICT_TID!"=="" (call :ok "conflict_ticket_id=!CONFLICT_TID!") else (call :fail "no conflict ticket id")

REM 4.2 dispatcher2 wins
call :cas "4.2 dispatcher2 WINS (assigns with version=1)"
set "BF=%TMPDIR%\b42.json"
> "%BF%" echo {"repairId":5,"version":1}
call :do_req PUT "/tickets/!CONFLICT_TID!/assign" "%BF%" "!TK_D2!" 200 "d2 assign success"
call :have "\"success\":true"
call :have "\"version\":2"

REM 4.3 dispatcher1 with STALE version=1 -> STRICT 3 ASSERTIONS
call :cas "4.3 dispatcher1 STALE v=1 ---- TRIPLE ASSERTION: 409 + conflict:true + success:false"
set "BF=%TMPDIR%\b43.json"
> "%BF%" echo {"repairId":6,"version":1}
REM --- do call manually to preserve HTTP_BODY ---
set "OUT=%TMPDIR%\resp_43.txt"
set "STF=%TMPDIR%\st_43.txt"
"%CURL%" -s -S -w "%%{http_code}" -o "%OUT%" -H "Authorization: Bearer !TK_D1!" -H "Content-Type: application/json" --data-binary @"%BF%" -X PUT "%BASE%/tickets/!CONFLICT_TID!/assign" > "%STF%" 2>NUL
set "ST="
for /f "delims=" %%x in ('type "%STF%" 2^>nul') do set "ST=%%x"
set "HTTP_BODY=%OUT%"

REM ASSERTION 1/3: HTTP 409
if "%ST%"=="409" (
    call :ok "ASSERTION 1 PASS - HTTP status = 409"
) else (
    call :fail "ASSERTION 1 FAIL - expected HTTP 409 got %ST%"
)
REM ASSERTION 2/3: body contains "conflict":true
"%FINDSTR%" /c:"\"conflict\":true" "%OUT%" >nul 2>&1
if %errorlevel%==0 (
    call :ok "ASSERTION 2 PASS - body contains conflict:true"
) else (
    call :fail "ASSERTION 2 FAIL - body missing conflict:true"
    echo        ---------- full body ----------
    type "%OUT%" 2>nul
    echo        ------------------------------
)
REM ASSERTION 3/3: body contains "success":false
"%FINDSTR%" /c:"\"success\":false" "%OUT%" >nul 2>&1
if %errorlevel%==0 (
    call :ok "ASSERTION 3 PASS - body contains success:false"
) else (
    call :fail "ASSERTION 3 FAIL - body missing success:false"
)

call :hdr "5. ADMIN Logs + Reopen + CSV export"

REM 5.1 get logs
call :cas "5.1 get operation logs"
call :do_req GET "/logs?limit=500" "" "!TK_A1!" 200 "admin logs"
call :have "\"success\":true"
call :have "\"action\":\"create_ticket\""
call :have "\"action\":\"assign_ticket\""
call :have "\"action\":\"close_ticket\""

REM 5.2 reopen main ticket
call :cas "5.2 admin reopens closed main ticket (#!MAIN_TID!)"
call :do_req PUT "/tickets/!MAIN_TID!/reopen" "" "!TK_A1!" 200 "reopen main"
call :have "\"success\":true"

REM 5.3 verify reopened status = pending
call :cas "5.3 verify reopened status = pending"
call :do_req GET "/tickets/!MAIN_TID!" "" "!TK_A1!" 200 "verify reopened"
call :have "\"status\":\"pending\""

REM 5.4 CSV export
call :cas "5.4 admin exports CSV (13 cols + year stamp + snapshot save)"
set "CSV=%TMPDIR%\export.csv"
set "CSVSTF=%TMPDIR%\csv_st.txt"
"%CURL%" -s -S -w "%%{http_code}" -o "%CSV%" -H "Authorization: Bearer !TK_A1!" "%BASE%/export/tickets" 1> "%CSVSTF%" 2>&1
set "CSVS="
for /f "delims=" %%x in ('type "%CSVSTF%" 2^>nul') do set "CSVS=%%x"
if "!CSVS!"=="200" (call :ok "CSV HTTP 200") else (call :fail "CSV HTTP expected 200 got !CSVS!")
REM count lines (use find /c /v "" - robust to large files, UTF8, BOM)
REM find /c output format in any locale: "---------- DRIVE\PATH\FILE.CSV: N"
REM We write find output to a temp file first, then parse it with tokens=3 (1=------, 2=PATH:, 3=N)
set /a CSV_LINES=0
set "FINDTMP=%TMPDIR%\findcsv.txt"
"%FIND%" /c /v "" "%CSV%" > "%FINDTMP%" 2>&1
for /f "usebackq tokens=3" %%C in (`type "%FINDTMP%"`) do set /a CSV_LINES=%%C
if !CSV_LINES! GEQ 2 (call :ok "CSV lines = !CSV_LINES! (>= 2 OK)") else (call :fail "CSV only !CSV_LINES! lines")
REM count commas in first line -> need >= 12 for 13 cols
set "HDR="
set /p HDR=<"%CSV%"
REM strip BOM if any (UTF8 BOM = EF BB BF, may appear as extra chars)
if not "!HDR!"=="" (
    REM heuristic: if first char is not letter/digit, strip 1 char
    set "FC=!HDR:~0,1!"
    for /f "tokens=* delims=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" %%C in ("!FC!") do if not "%%C"=="" set "HDR=!HDR:~1!"
)
set /a COMMAS=0
:cmc
if "!HDR!"=="" goto :cmcdone
set "C1=!HDR:~0,1!"
if "!C1!"=="," set /a COMMAS+=1
set "HDR=!HDR:~1!"
goto :cmc
:cmcdone
if !COMMAS! GEQ 12 (call :ok "CSV header has !COMMAS! commas (>= 12 => 13 columns OK)") else (call :fail "CSV header has only !COMMAS! commas")
REM year stamp present
"%FINDSTR%" /r "20[0-9][0-9]" "%CSV%" >nul 2>&1
if %errorlevel%==0 (call :ok "CSV contains 20xx year stamps") else (call :fail "CSV no year stamps")
REM save snapshot to SCRIPTDIR\exports
if not "%SCRIPTDIR%"=="" (md "%SCRIPTDIR%exports" 2>nul) else (md "test\exports" 2>nul)
set "CSV_SNAP=%SCRIPTDIR%exports\snap_bat_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.csv"
set "CSV_SNAP=!CSV_SNAP: =0!"
copy /y "%CSV%" "!CSV_SNAP!" >nul 2>&1
if exist "!CSV_SNAP!" (call :ok "CSV snapshot saved to !CSV_SNAP!") else (call :fail "CSV snapshot save failed")

call :hdr "6. PRE-RESTART SNAPSHOTS"

call :cas "6.1 snapshot total tickets"
call :do_req GET "/tickets?limit=200" "" "!TK_A1!" 200 "snapshot tickets"
call :have "\"total\":"
call :cas "6.2 snapshot total logs"
call :do_req GET "/logs?limit=500" "" "!TK_A1!" 200 "snapshot logs"
call :have "\"total\":"

REM ===================== SUMMARY =====================
echo.
echo ========================================================================
echo   TEST SUMMARY ^(ALL requests via %CURL% -- NO PowerShell wrapper^)
echo ========================================================================
echo   [PASS] !PASS!
if !FAIL! EQU 0 (echo   [FAIL] !FAIL!   ^(ALL TESTS PASSED^)) else (echo   [FAIL] !FAIL!)
echo.
echo   SNAPSHOT:
echo     Main ticket    : #!MAIN_TID!  (closed -reopened- pending)
echo     Return ticket  : #!RETURN_TID!  (returned -resubmitted- pending)
echo     Conflict ticket: #!CONFLICT_TID!  (409 conflict:true triple-check done)
echo     CSV snapshot   : !CSV_SNAP!
echo     Temp dir       : %TMPDIR%
echo.
echo   NEXT: restart npm run dev (Ctrl+C then rerun), then: test\after_restart.bat
echo.

REM cleanup temp
rmdir /s /q "%TMPDIR%" 2>nul

exit /b !FAIL!
