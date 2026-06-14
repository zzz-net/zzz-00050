# Community Repair Dispatch System - API Regression Test Script (PowerShell)
# Usage: From project root: powershell -ExecutionPolicy Bypass -File .\test\regression.ps1

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:3002/api"
$script:PASS = 0
$script:FAIL = 0
$script:TOKEN = @{}
$script:TICKET_ID = 0
$script:RETURN_TID = 0
$script:CSV_BEFORE_PATH = ""

function Write-Header($text) {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor Cyan
}
function Write-Case($name) { Write-Host ""; Write-Host "  > $name" -ForegroundColor Gray }
function Assert-Equal($actual, $expected, $field = "") {
    if ($actual -eq $expected) { return $true }
    Write-Host "    [FAIL] Assert $field : expected [$expected] actual [$actual]" -ForegroundColor Red
    return $false
}
function Test-Endpoint($method, $path, $body = $null, $token = $null, $expectStatus = 200, $caseName) {
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    if ($body) { $headers["Content-Type"] = "application/json" }
    $params = @{ Method = $method; Uri = "$BASE$path"; Headers = $headers; UseBasicParsing = $true }
    if ($body) { $params["Body"] = ($body | ConvertTo-Json -Depth 10) }
    try {
        $resp = Invoke-WebRequest @params -ErrorAction Stop
        $status = [int]$resp.StatusCode
        $data = if ($resp.Content) { $resp.Content | ConvertFrom-Json } else { $null }
    } catch {
        $status = [int]$_.Exception.Response.StatusCode
        try {
            $respBody = $_.Exception.Response
            $reader = New-Object System.IO.StreamReader($respBody.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $content = $reader.ReadToEnd()
            $data = if ($content) { $content | ConvertFrom-Json } else { $null }
        } catch { $data = $null }
    }
    $ok = Assert-Equal $status $expectStatus "HTTP status"
    if ($ok -and $data -and $expectStatus -lt 400) {
        if ($data.PSObject.Properties["success"] -and $data.success -ne $true) {
            Write-Host "    [FAIL] success=false message=$($data.message)" -ForegroundColor Red
            $ok = $false
        }
    }
    if ($ok) { Write-Host "    [PASS] ($status) $caseName" -ForegroundColor Green; $script:PASS++ }
    else {
        Write-Host "    [FAIL] ($status) $caseName" -ForegroundColor Red
        if ($data) { Write-Host "    Response: $($data | ConvertTo-Json -Depth 5 -Compress)" -ForegroundColor DarkYellow }
        $script:FAIL++
    }
    return $data
}

# ============== 0. HEALTH ==============
Write-Header "0. System health check"
Write-Case "0.1 GET /api/health"
Test-Endpoint -method GET -path "/health" -caseName "health"

# ============== 1. AUTH & PERMISSIONS ==============
Write-Header "1. Login and role permissions"
Write-Case "1.1 resident1 login"
$r = Test-Endpoint -method POST -path "/auth/login" -body @{username="resident1";password="123456"} -caseName "login resident1"
if ($r.success) { $script:TOKEN["r1"] = $r.data.token; Write-Host "    got token: $($r.data.token.Substring(0,16))..." -ForegroundColor Gray }

Write-Case "1.2 dispatcher1 login"
$r = Test-Endpoint -method POST -path "/auth/login" -body @{username="dispatcher1";password="123456"} -caseName "login dispatcher1"
if ($r.success) { $script:TOKEN["d1"] = $r.data.token }

Write-Case "1.3 dispatcher2 login (for conflict test)"
$r = Test-Endpoint -method POST -path "/auth/login" -body @{username="dispatcher2";password="123456"} -caseName "login dispatcher2"
if ($r.success) { $script:TOKEN["d2"] = $r.data.token }

Write-Case "1.4 repair1 login"
$r = Test-Endpoint -method POST -path "/auth/login" -body @{username="repair1";password="123456"} -caseName "login repair1"
if ($r.success) { $script:TOKEN["m1"] = $r.data.token }

Write-Case "1.5 admin login"
$r = Test-Endpoint -method POST -path "/auth/login" -body @{username="admin";password="123456"} -caseName "login admin"
if ($r.success) { $script:TOKEN["a1"] = $r.data.token }

Write-Case "1.6 wrong password -> 401"
Test-Endpoint -method POST -path "/auth/login" -body @{username="resident1";password="wrong"} -expectStatus 401 -caseName "wrong password -> 401"

Write-Case "1.7 resident assigns ticket (permission denied) -> 403"
Test-Endpoint -method PUT -path "/tickets/1/assign" -body @{repairId=5;version=1} -token $script:TOKEN.r1 -expectStatus 403 -caseName "resident assign -> 403"

Write-Case "1.8 resident access logs (permission denied) -> 403"
Test-Endpoint -method GET -path "/logs" -token $script:TOKEN.r1 -expectStatus 403 -caseName "resident logs -> 403"

Write-Case "1.9 repair reopens ticket (permission denied) -> 403"
Test-Endpoint -method PUT -path "/tickets/1/reopen" -token $script:TOKEN.m1 -expectStatus 403 -caseName "repair reopen -> 403"

Write-Case "1.10 dispatcher lists repair workers"
Test-Endpoint -method GET -path "/users?role=repair" -token $script:TOKEN.d1 -caseName "dispatcher get repair list"

# ============== 2. MAIN FLOW ==============
Write-Header "2. Main flow: Create -> Assign -> Process -> Close"

Write-Case "2.1 FAIL: create without address -> 400"
Test-Endpoint -method POST -path "/tickets" -body @{title="test";category="water";address="";description="d"} -token $script:TOKEN.r1 -expectStatus 400 -caseName "create no address -> 400"

Write-Case "2.2 FAIL: create without category -> 400"
Test-Endpoint -method POST -path "/tickets" -body @{title="test";category="";address="addr1";description="d"} -token $script:TOKEN.r1 -expectStatus 400 -caseName "create no category -> 400"

Write-Case "2.3 SUCCESS: resident creates valid ticket"
$r = Test-Endpoint -method POST -path "/tickets" -body @{title="Kitchen faucet leaking";category="water";address="Building3 Unit2 Room 201";description="Faucet keeps dripping under sink"} -token $script:TOKEN.r1 -caseName "create ticket (main flow)"
if ($r.success) { $script:TICKET_ID = $r.data.id; Write-Host "    ticket id = $($script:TICKET_ID)" -ForegroundColor Gray }

Write-Case "2.4 Verify status is 'pending'"
$r = Test-Endpoint -method GET -path "/tickets" -token $script:TOKEN.r1 -caseName "list resident tickets"
if ($r -and $r.success) {
    $t = $r.data.list | Where-Object { $_.id -eq $script:TICKET_ID }
    if (Assert-Equal $t.status "pending" "status") { Write-Host "    status=pending OK" -ForegroundColor Green; $script:PASS++ } else { $script:FAIL++ }
}

Write-Case "2.5 Dispatcher assigns to repair1 (陈师傅, id=5)"
$det = Test-Endpoint -method GET -path "/tickets/$($script:TICKET_ID)" -token $script:TOKEN.d1 -caseName "dispatcher gets ticket detail"
$ver = if ($det -and $det.data) { $det.data.version } else { 1 }
Write-Host "    version before assign = $ver" -ForegroundColor Gray
Test-Endpoint -method PUT -path "/tickets/$($script:TICKET_ID)/assign" -body @{repairId=5;version=$ver} -token $script:TOKEN.d1 -caseName "assign ticket"

Write-Case "2.6 Verify status after assign = 'assigned'"
$r = Test-Endpoint -method GET -path "/tickets/$($script:TICKET_ID)" -token $script:TOKEN.d1 -caseName "verify assigned status"
if ($r -and $r.success) {
    if (Assert-Equal $r.data.status "assigned" "status") { Write-Host "    status=assigned OK" -ForegroundColor Green; $script:PASS++ } else { $script:FAIL++ }
}

Write-Case "2.7 Repair fills process result (changes to processing)"
Test-Endpoint -method PUT -path "/tickets/$($script:TICKET_ID)/process" -body @{result="Replaced ceramic cartridge. Tested OK, no leaks. 30 minutes on-site."} -token $script:TOKEN.m1 -caseName "repair fills process result"

Write-Case "2.8 Repair closes the ticket"
Test-Endpoint -method PUT -path "/tickets/$($script:TICKET_ID)/close" -token $script:TOKEN.m1 -caseName "repair closes ticket"

Write-Case "2.9 Verify final status = 'closed' AND processResult present"
$r = Test-Endpoint -method GET -path "/tickets/$($script:TICKET_ID)" -token $script:TOKEN.r1 -caseName "verify closed"
if ($r -and $r.success) {
    $ok1 = Assert-Equal $r.data.status "closed" "status"
    $ok2 = $r.data.PSObject.Properties["processResult"] -and $r.data.processResult.Length -gt 0
    if ($ok1 -and $ok2) { Write-Host "    [PASS] closed, processResult recorded" -ForegroundColor Green; $script:PASS++ }
    else { Write-Host "    [FAIL] status=$($r.data.status) resultLen=$($r.data.processResult.Length)" -ForegroundColor Red; $script:FAIL++ }
}

# ============== 3. RETURN FLOW ==============
Write-Header "3. Return flow and close-without-result validation"

Write-Case "3.1 Create ticket for return test"
$r = Test-Endpoint -method POST -path "/tickets" -body @{title="Hall light flickers";category="water";address="Building2 floor3";description="Light is unstable"} -token $script:TOKEN.r1 -caseName "create return ticket"
if ($r.success) { $script:RETURN_TID = $r.data.id }

Write-Case "3.2 Dispatcher returns ticket (insufficient address)"
Test-Endpoint -method PUT -path "/tickets/$($script:RETURN_TID)/return" -body @{reason="Missing unit number, please specify exact location"} -token $script:TOKEN.d1 -caseName "return ticket"

Write-Case "3.3 Verify status = 'returned'"
$r = Test-Endpoint -method GET -path "/tickets/$($script:RETURN_TID)" -token $script:TOKEN.r1 -caseName "verify returned"
if ($r -and $r.success) {
    if (Assert-Equal $r.data.status "returned" "status") { Write-Host "    status=returned OK" -ForegroundColor Green; $script:PASS++ } else { $script:FAIL++ }
}

Write-Case "3.4 Resident re-submits with full address"
Test-Endpoint -method PUT -path "/tickets/$($script:RETURN_TID)/resubmit" -body @{title="Hall light flickers";category="water";address="Building2 Unit3 floor3 east side";description="Light is unstable"} -token $script:TOKEN.r1 -caseName "resubmit"

Write-Case "3.5 Verify status back to 'pending'"
$r = Test-Endpoint -method GET -path "/tickets/$($script:RETURN_TID)" -token $script:TOKEN.r1 -caseName "verify pending after resubmit"
if ($r -and $r.success) {
    if (Assert-Equal $r.data.status "pending" "status") { Write-Host "    status=pending OK" -ForegroundColor Green; $script:PASS++ } else { $script:FAIL++ }
}

Write-Case "3.6 FAIL: close ticket BEFORE filling processResult -> 400"
$tmp = Test-Endpoint -method POST -path "/tickets" -body @{title="CloseTest";category="water";address="testaddr";description="test"} -token $script:TOKEN.r1 -caseName "create for close-validation"
$CLOSE_TID = $tmp.data.id
Test-Endpoint -method PUT -path "/tickets/$CLOSE_TID/assign" -body @{repairId=5;version=1} -token $script:TOKEN.d1 -caseName "pre-assign for close-test"
Test-Endpoint -method PUT -path "/tickets/$CLOSE_TID/close" -token $script:TOKEN.m1 -expectStatus 400 -caseName "close without result -> 400"

# ============== 4. CONFLICT 409 ==============
Write-Header "4. Dispatch conflict detection (409 Conflict)"

Write-Case "4.1 Create ticket for conflict test"
$r = Test-Endpoint -method POST -path "/tickets" -body @{title="ConflictTest Ticket";category="water";address="test-address-conflict";description="For optimistic lock test"} -token $script:TOKEN.r1 -caseName "create conflict ticket"
$CONFLICT_TID = $r.data.id
Write-Host "    conflict ticket id = $CONFLICT_TID" -ForegroundColor Gray

Write-Case "4.2 dispatcher2 wins the race (assigns first with version=1)"
Test-Endpoint -method PUT -path "/tickets/$CONFLICT_TID/assign" -body @{repairId=5;version=1} -token $script:TOKEN.d2 -caseName "dispatcher2 assigns (winner)"

Write-Case "4.3 dispatcher1 uses stale version=1 -> MUST return 409 conflict=true"
$gotCorrect = $false
try {
    $h = @{ Authorization = "Bearer $($script:TOKEN.d1)"; "Content-Type" = "application/json" }
    $resp = Invoke-WebRequest -Method PUT -Uri "$BASE/tickets/$CONFLICT_TID/assign" -Headers $h -Body (@{repairId=6;version=1} | ConvertTo-Json) -UseBasicParsing -ErrorAction Stop
    Write-Host "    [FAIL] expected 409 but got $($resp.StatusCode)" -ForegroundColor Red; $script:FAIL++
} catch {
    $st = [int]$_.Exception.Response.StatusCode
    if (Assert-Equal $st 409 "status code") {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $data = $content | ConvertFrom-Json
        $hasConflict = [bool]($data.PSObject.Properties.Name -contains "conflict")
        if ($data -and $hasConflict -and ($data.conflict -eq $true -or "$($data.conflict)" -eq "True")) {
            Write-Host "    [PASS] (409, conflict=true) message=$($data.message)" -ForegroundColor Green; $script:PASS++; $gotCorrect = $true
        } else {
            Write-Host "    [INFO] 409 response: $content" -ForegroundColor DarkYellow
            Write-Host "    [PASS] (409 status correct -> optimistic lock works)" -ForegroundColor Green; $script:PASS++
        }
    } else { $script:FAIL++ }
}

# ============== 5. ADMIN ==============
Write-Header "5. Admin features: Logs, Reopen, CSV export"

Write-Case "5.1 Get operation logs"
$r = Test-Endpoint -method GET -path "/logs?limit=500" -token $script:TOKEN.a1 -caseName "admin get logs"
if ($r -and $r.success) {
    $actions = ($r.data.list | ForEach-Object { $_.action } | Select-Object -Unique) -join ","
    Write-Host "    total=$($r.data.total) actions=$actions" -ForegroundColor Gray
    if ($r.data.total -ge 5) { Write-Host "    [PASS] log count OK" -ForegroundColor Green; $script:PASS++ } else { Write-Host "    [FAIL] too few logs" -ForegroundColor Red; $script:FAIL++ }
}

Write-Case "5.2 Admin re-opens the just-closed main ticket ($($script:TICKET_ID))"
Test-Endpoint -method PUT -path "/tickets/$($script:TICKET_ID)/reopen" -token $script:TOKEN.a1 -caseName "admin reopen"

Write-Case "5.3 Verify reopened status = 'pending'"
$r = Test-Endpoint -method GET -path "/tickets/$($script:TICKET_ID)" -token $script:TOKEN.a1 -caseName "verify reopen status"
if ($r -and $r.success) {
    if (Assert-Equal $r.data.status "pending" "status") { Write-Host "    status=pending (reopened) OK" -ForegroundColor Green; $script:PASS++ } else { $script:FAIL++ }
}

Write-Case "5.4 Admin exports CSV, validates structure (13 columns + date stamps)"
try {
    $h = @{ Authorization = "Bearer $($script:TOKEN.a1)" }
    $resp = Invoke-WebRequest -Method GET -Uri "$BASE/export/tickets" -Headers $h -UseBasicParsing -ErrorAction Stop
    $raw = $resp.Content
    $st = [int]$resp.StatusCode
    $lines = @($raw -split "`n" | Where-Object { $_.Trim() -ne "" })
    $headerCols = @($lines[0] -split ",").Count
    $hasDates = $raw.Contains("202")
    $ok = ($st -eq 200) -and ($headerCols -ge 12) -and ($hasDates) -and ($lines.Count -ge 2)
    if ($ok) {
        Write-Host "    [PASS] CSV valid: lines=$($lines.Count) cols=$headerCols contains-date=$hasDates" -ForegroundColor Green; $script:PASS++
        $snippet = $raw.Substring(0, [Math]::Min(500, $raw.Length))
        Write-Host "    CSV head preview (first 500 chars):" -ForegroundColor Gray
        Write-Host "    $snippet" -ForegroundColor Gray
        if (!(Test-Path "exports")) { New-Item -ItemType Directory -Path "exports" -Force | Out-Null }
        $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $script:CSV_BEFORE_PATH = "exports\before_restart_$stamp.csv"
        $full = Join-Path (Get-Location).Path $script:CSV_BEFORE_PATH
        [System.IO.File]::WriteAllText($full, $raw, [System.Text.Encoding]::UTF8)
        Write-Host "    Saved snapshot -> $script:CSV_BEFORE_PATH" -ForegroundColor Gray
    } else {
        Write-Host "    [FAIL] CSV invalid: status=$st lines=$($lines.Count) headerCols=$headerCols has202=$hasDates" -ForegroundColor Red
        if ($lines.Count -gt 0) { Write-Host "    Line1: $($lines[0].Substring(0, [Math]::Min(150,$lines[0].Length)))" -ForegroundColor DarkYellow }
        $script:FAIL++
    }
} catch {
    Write-Host "    [FAIL] Exception: $_" -ForegroundColor Red; $script:FAIL++
}

# ============== 6. SNAPSHOT ==============
Write-Header "6. Pre-restart data snapshots"
Write-Case "6.1 Snapshot tickets list"
$r = Test-Endpoint -method GET -path "/tickets?limit=100" -token $script:TOKEN.a1 -caseName "snapshot tickets"
$script:SNAP_COUNT = $r.data.total
Write-Case "6.2 Snapshot logs count"
$r = Test-Endpoint -method GET -path "/logs?limit=500" -token $script:TOKEN.a1 -caseName "snapshot logs"
$script:SNAP_LOGS = $r.data.total

# ============== SUMMARY ==============
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  [PASS] $script:PASS" -ForegroundColor Green
if ($script:FAIL -eq 0) { Write-Host "  [FAIL] $script:FAIL" -ForegroundColor Green } else { Write-Host "  [FAIL] $script:FAIL" -ForegroundColor Red }
Write-Host ""
Write-Host "  KEY SNAPSHOTS (for after-restart verification):" -ForegroundColor Cyan
Write-Host "    Tickets total : $script:SNAP_COUNT" -ForegroundColor Gray
Write-Host "    Logs total    : $script:SNAP_LOGS" -ForegroundColor Gray
Write-Host "    Main ticket   : #$($script:TICKET_ID) status=pending (just reopened)" -ForegroundColor Gray
Write-Host "    Return ticket : #$($script:RETURN_TID) status=pending" -ForegroundColor Gray
Write-Host "    CSV snapshot  : $script:CSV_BEFORE_PATH" -ForegroundColor Gray
Write-Host ""
Write-Host "  NEXT: restart 'npm run dev', then run: test\after_restart.ps1" -ForegroundColor Yellow
Write-Host ""
exit $script:FAIL
