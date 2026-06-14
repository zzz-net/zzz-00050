# Community Repair Dispatch System - Regression Test Script
# ALL HTTP requests sent via curl.exe (not Invoke-WebRequest)
# Usage: powershell -ExecutionPolicy Bypass -File .\test\regression.ps1

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:3002/api"
$TMPDIR = Join-Path $env:TEMP "curl_regression_$([DateTime]::Now.Ticks)"
New-Item -ItemType Directory -Path $TMPDIR -Force | Out-Null

$script:PASS = 0
$script:FAIL = 0
$script:TOKENS = @{}
$script:MAIN_TID = 0
$script:RETURN_TID = 0
$script:CSV_SNAPSHOT = ""

function Write-Header($text) {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor Cyan
}
function Write-Case($name) { Write-Host ""; Write-Host "  > $name" -ForegroundColor Gray }

function Invoke-Curl($method, $path, $bodyObj = $null, $token = $null, $outFile = $null) {
    $url = "$BASE$path"
    if (-not $outFile) { $outFile = Join-Path $TMPDIR "resp_$([Guid]::NewGuid().ToString('N')).json" }
    $statusFile = Join-Path $TMPDIR "status_$([Guid]::NewGuid().ToString('N')).txt"

    $args = @(
        "-s", "-S",
        "-X", $method,
        "-w", "`n%{http_code}",
        "-o", $outFile,
        $url
    )
    if ($token) { $args += @("-H", "Authorization: Bearer $token") }
    if ($bodyObj) {
        $bodyJson = $bodyObj | ConvertTo-Json -Depth 10 -Compress
        $bodyFile = Join-Path $TMPDIR "body_$([Guid]::NewGuid().ToString('N')).json"
        [System.IO.File]::WriteAllText($bodyFile, $bodyJson, [System.Text.Encoding]::UTF8)
        $args += @("-H", "Content-Type: application/json")
        $args += @("--data-binary", "`@$bodyFile")
    }

    $output = & curl.exe @args 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Write-Host "    [ERROR] curl exit code $exitCode : $output" -ForegroundColor Red
        return [pscustomobject]@{ status = 0; body = $null; raw = "$output" }
    }

    $lines = $output -split "`n"
    $statusStr = $lines[-1].Trim()
    $status = 0
    if ([int]::TryParse($statusStr, [ref]$status)) { }
    else { Write-Host "    [WARN] cannot parse status from: '$statusStr'" -ForegroundColor Yellow }

    $body = $null
    if (Test-Path $outFile) {
        try {
            $raw = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8)
            if ($raw -and $raw.Trim().StartsWith("{")) {
                $body = $raw | ConvertFrom-Json
            } else {
                $body = [pscustomobject]@{ _raw = $raw }
            }
        } catch {
            Write-Host "    [WARN] parse response failed: $_" -ForegroundColor Yellow
        }
    }
    return [pscustomobject]@{ status = $status; body = $body; outFile = $outFile }
}

function Test-Curl($method, $path, $bodyObj = $null, $token = $null, $expectStatus = 200, $caseName) {
    $r = Invoke-Curl $method $path $bodyObj $token
    $st = $r.status
    $data = $r.body

    $statusOk = ($st -eq $expectStatus)
    if (-not $statusOk) {
        Write-Host "    [FAIL] ($st) $caseName  expected=$expectStatus" -ForegroundColor Red
        if ($data) {
            if ($data._raw) { Write-Host "    body: $($data._raw.Substring(0, [Math]::Min(300,$data._raw.Length)))" -ForegroundColor DarkYellow }
            else { Write-Host "    body: $($data | ConvertTo-Json -Depth 5 -Compress)" -ForegroundColor DarkYellow }
        }
        $script:FAIL++
        return $null
    }

    if ($st -lt 400 -and $data -and -not $data._raw) {
        if ($data.PSObject.Properties["success"] -and $data.success -ne $true) {
            Write-Host "    [FAIL] ($st) $caseName  success=false  msg=$($data.message)" -ForegroundColor Red
            $script:FAIL++
            return $data
        }
    }

    Write-Host "    [PASS] ($st) $caseName" -ForegroundColor Green
    $script:PASS++
    return $data
}

function Assert-Field($data, $field, $expected, $label = "") {
    $actual = $data.$field
    if ($actual -eq $expected) {
        Write-Host "    [PASS] $label = $expected" -ForegroundColor Green
        $script:PASS++
        return $true
    } else {
        Write-Host "    [FAIL] $label : expected=[$expected] actual=[$actual]" -ForegroundColor Red
        $script:FAIL++
        return $false
    }
}

# ================================================================
# 0. HEALTH
# ================================================================
Write-Header "0. System health check (curl.exe)"
Write-Case "0.1 GET /api/health via curl.exe"
Test-Curl GET "/health" -caseName "health endpoint"

# ================================================================
# 1. AUTH & PERMISSIONS
# ================================================================
Write-Header "1. Login and role permissions"

Write-Case "1.1 resident1 login"
$r = Test-Curl POST "/auth/login" -bodyObj @{username="resident1";password="123456"} -caseName "login resident1"
if ($r -and $r.success) { $script:TOKENS.r1 = $r.data.token; Write-Host "    token: $($r.data.token.Substring(0,16))..." -ForegroundColor Gray }

Write-Case "1.2 dispatcher1 login"
$r = Test-Curl POST "/auth/login" -bodyObj @{username="dispatcher1";password="123456"} -caseName "login dispatcher1"
if ($r -and $r.success) { $script:TOKENS.d1 = $r.data.token }

Write-Case "1.3 dispatcher2 login (conflict test)"
$r = Test-Curl POST "/auth/login" -bodyObj @{username="dispatcher2";password="123456"} -caseName "login dispatcher2"
if ($r -and $r.success) { $script:TOKENS.d2 = $r.data.token }

Write-Case "1.4 repair1 login"
$r = Test-Curl POST "/auth/login" -bodyObj @{username="repair1";password="123456"} -caseName "login repair1"
if ($r -and $r.success) { $script:TOKENS.m1 = $r.data.token }

Write-Case "1.5 admin login"
$r = Test-Curl POST "/auth/login" -bodyObj @{username="admin";password="123456"} -caseName "login admin"
if ($r -and $r.success) { $script:TOKENS.a1 = $r.data.token }

Write-Case "1.6 wrong password -> 401"
Test-Curl POST "/auth/login" -bodyObj @{username="resident1";password="wrongpass"} -expectStatus 401 -caseName "wrong password -> 401"

Write-Case "1.7 resident assigns ticket -> 403"
Test-Curl PUT "/tickets/1/assign" -bodyObj @{repairId=5;version=1} -token $script:TOKENS.r1 -expectStatus 403 -caseName "resident assign -> 403"

Write-Case "1.8 resident access logs -> 403"
Test-Curl GET "/logs" -token $script:TOKENS.r1 -expectStatus 403 -caseName "resident logs -> 403"

Write-Case "1.9 repair reopens ticket -> 403"
Test-Curl PUT "/tickets/1/reopen" -token $script:TOKENS.m1 -expectStatus 403 -caseName "repair reopen -> 403"

Write-Case "1.10 dispatcher lists repair workers"
$r = Test-Curl GET "/users?role=repair" -token $script:TOKENS.d1 -caseName "dispatcher list repairs"
if ($r -and $r.success -and $r.data.Count -ge 2) { Write-Host "    $($r.data.Count) repair workers found" -ForegroundColor Gray }

# ================================================================
# 2. MAIN FLOW: Create -> Assign -> Process -> Close
# ================================================================
Write-Header "2. Main flow: Create -> Assign -> Process -> Close"

Write-Case "2.1 FAIL: create without address -> 400"
Test-Curl POST "/tickets" -bodyObj @{title="test";category="water";address="";description="d"} -token $script:TOKENS.r1 -expectStatus 400 -caseName "create no address -> 400"

Write-Case "2.2 FAIL: create without category -> 400"
Test-Curl POST "/tickets" -bodyObj @{title="test";category="";address="addr1";description="d"} -token $script:TOKENS.r1 -expectStatus 400 -caseName "create no category -> 400"

Write-Case "2.3 SUCCESS: resident creates valid ticket"
$r = Test-Curl POST "/tickets" -bodyObj @{
    title="Kitchen faucet leaking"
    category="water"
    address="Building3 Unit2 Room 201"
    description="Faucet keeps dripping under sink"
} -token $script:TOKENS.r1 -caseName "create main ticket"
if ($r -and $r.success) { $script:MAIN_TID = $r.data.id; Write-Host "    ticket id = $($script:MAIN_TID)" -ForegroundColor Gray }

Write-Case "2.4 Verify status = pending + version=1"
$r = Test-Curl GET "/tickets/$($script:MAIN_TID)" -token $script:TOKENS.r1 -caseName "get main ticket detail"
if ($r -and $r.success) {
    Assert-Field $r.data "status" "pending" "status"
    Assert-Field $r.data "version" 1 "version"
}

Write-Case "2.5 Dispatcher assigns to repair1 (id=5)"
$r = Test-Curl PUT "/tickets/$($script:MAIN_TID)/assign" -bodyObj @{repairId=5;version=1} -token $script:TOKENS.d1 -caseName "assign ticket"

Write-Case "2.6 Verify status = assigned + version=2"
$r = Test-Curl GET "/tickets/$($script:MAIN_TID)" -token $script:TOKENS.d1 -caseName "verify assigned"
if ($r -and $r.success) {
    Assert-Field $r.data "status" "assigned" "status"
    Assert-Field $r.data "version" 2 "version"
}

Write-Case "2.7 Repair fills process result (-> processing)"
Test-Curl PUT "/tickets/$($script:MAIN_TID)/process" -bodyObj @{result="Replaced ceramic cartridge. Tested OK, no leaks."} -token $script:TOKENS.m1 -caseName "repair fills result"

Write-Case "2.8 Repair closes the ticket"
Test-Curl PUT "/tickets/$($script:MAIN_TID)/close" -token $script:TOKENS.m1 -caseName "repair closes ticket"

Write-Case "2.9 Verify status = closed AND processResult present"
$r = Test-Curl GET "/tickets/$($script:MAIN_TID)" -token $script:TOKENS.r1 -caseName "verify closed"
if ($r -and $r.success) {
    $ok1 = Assert-Field $r.data "status" "closed" "status"
    $hasResult = $r.data.PSObject.Properties["processResult"] -and $r.data.processResult -and $r.data.processResult.Length -gt 0
    if ($hasResult) {
        Write-Host "    [PASS] processResult recorded" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "    [FAIL] processResult missing" -ForegroundColor Red
        $script:FAIL++
    }
}

# ================================================================
# 3. RETURN FLOW
# ================================================================
Write-Header "3. Return flow and close-without-result validation"

Write-Case "3.1 Create ticket for return test"
$r = Test-Curl POST "/tickets" -bodyObj @{
    title="Hall light flickers"
    category="electric"
    address="Building2 floor3"
    description="Light is unstable"
} -token $script:TOKENS.r1 -caseName "create return ticket"
if ($r -and $r.success) { $script:RETURN_TID = $r.data.id }

Write-Case "3.2 Dispatcher returns ticket (insufficient address)"
Test-Curl PUT "/tickets/$($script:RETURN_TID)/return" -bodyObj @{reason="Missing unit number, please specify exact location"} -token $script:TOKENS.d1 -caseName "return ticket"

Write-Case "3.3 Verify status = returned"
$r = Test-Curl GET "/tickets/$($script:RETURN_TID)" -token $script:TOKENS.r1 -caseName "verify returned"
if ($r -and $r.success) { Assert-Field $r.data "status" "returned" "status" }

Write-Case "3.4 Resident re-submits with full address"
Test-Curl PUT "/tickets/$($script:RETURN_TID)/resubmit" -bodyObj @{
    title="Hall light flickers"
    category="electric"
    address="Building2 Unit3 floor3 east side"
    description="Light is unstable"
} -token $script:TOKENS.r1 -caseName "resubmit ticket"

Write-Case "3.5 Verify status back to pending"
$r = Test-Curl GET "/tickets/$($script:RETURN_TID)" -token $script:TOKENS.r1 -caseName "verify pending after resubmit"
if ($r -and $r.success) { Assert-Field $r.data "status" "pending" "status" }

Write-Case "3.6 FAIL: close without processResult -> 400"
$tmp = Test-Curl POST "/tickets" -bodyObj @{title="CloseTest";category="water";address="testaddr";description="test"} -token $script:TOKENS.r1 -caseName "create close-test ticket"
$closeTid = $tmp.data.id
Test-Curl PUT "/tickets/$closeTid/assign" -bodyObj @{repairId=5;version=1} -token $script:TOKENS.d1 -caseName "pre-assign for close-test"
Test-Curl PUT "/tickets/$closeTid/close" -token $script:TOKENS.m1 -expectStatus 400 -caseName "close without result -> 400"

# ================================================================
# 4. CONFLICT 409 (STRICT: HTTP 409 + conflict:true in body)
# ================================================================
Write-Header "4. Dispatch conflict detection (409 + conflict:true)"

Write-Case "4.1 Create ticket for conflict test"
$r = Test-Curl POST "/tickets" -bodyObj @{
    title="CurlConflict Ticket"
    category="water"
    address="test-addr-curl-conflict"
    description="For optimistic lock test via curl"
} -token $script:TOKENS.r1 -caseName "create conflict ticket"
$conflictTid = $r.data.id
Write-Host "    conflict ticket id = $conflictTid" -ForegroundColor Gray

Write-Case "4.2 dispatcher2 wins (assigns first with version=1)"
Test-Curl PUT "/tickets/$conflictTid/assign" -bodyObj @{repairId=5;version=1} -token $script:TOKENS.d2 -caseName "dispatcher2 assigns (winner)"

Write-Case "4.3 dispatcher1 with stale version=1 -> MUST be 409 + conflict:true"
$resp = Invoke-Curl PUT "/tickets/$conflictTid/assign" -bodyObj @{repairId=6;version=1} -token $script:TOKENS.d1
$st = $resp.status
$data = $resp.body

$statusOk = ($st -eq 409)
$hasConflictField = $false
$conflictValue = $null
if ($data -and -not $data._raw) {
    $hasConflictField = [bool]($data.PSObject.Properties.Name -contains "conflict")
    if ($hasConflictField) { $conflictValue = $data.conflict }
}
$conflictTrue = $hasConflictField -and ($conflictValue -eq $true -or "$conflictValue" -eq "True")

if ($statusOk -and $conflictTrue) {
    Write-Host "    [PASS] (409) conflict=true  message=$($data.message)" -ForegroundColor Green
    $script:PASS++
} elseif ($statusOk -and -not $conflictTrue) {
    Write-Host "    [FAIL] status=409 but conflict field missing/wrong" -ForegroundColor Red
    if ($data -and -not $data._raw) { Write-Host "    body: $($data | ConvertTo-Json -Compress)" -ForegroundColor DarkYellow }
    elseif ($data._raw) { Write-Host "    raw body: $($data._raw)" -ForegroundColor DarkYellow }
    $script:FAIL++
} else {
    Write-Host "    [FAIL] status=$st expected=409" -ForegroundColor Red
    $script:FAIL++
}

# ================================================================
# 5. ADMIN: Logs, Reopen, CSV Export
# ================================================================
Write-Header "5. Admin features: Logs, Reopen, CSV export"

Write-Case "5.1 Get operation logs"
$r = Test-Curl GET "/logs?limit=500" -token $script:TOKENS.a1 -caseName "admin get logs"
if ($r -and $r.success) {
    $actions = ($r.data.list | ForEach-Object { $_.action } | Select-Object -Unique) -join ","
    Write-Host "    total=$($r.data.total)  actions=$actions" -ForegroundColor Gray
    if ($r.data.total -ge 10) {
        Write-Host "    [PASS] log count >= 10" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "    [FAIL] too few logs: $($r.data.total)" -ForegroundColor Red
        $script:FAIL++
    }
}

Write-Case "5.2 Admin re-opens the closed main ticket (#$($script:MAIN_TID))"
Test-Curl PUT "/tickets/$($script:MAIN_TID)/reopen" -token $script:TOKENS.a1 -caseName "admin reopen ticket"

Write-Case "5.3 Verify reopened status = pending"
$r = Test-Curl GET "/tickets/$($script:MAIN_TID)" -token $script:TOKENS.a1 -caseName "verify reopen status"
if ($r -and $r.success) { Assert-Field $r.data "status" "pending" "status after reopen" }

Write-Case "5.4 Admin exports CSV (13 cols + date stamps + file save)"
$csvOut = Join-Path $TMPDIR "export.csv"
$resp = Invoke-Curl GET "/export/tickets" -token $script:TOKENS.a1 -outFile $csvOut
$st = $resp.status

if ($st -eq 200 -and (Test-Path $csvOut)) {
    $raw = [System.IO.File]::ReadAllText($csvOut, [System.Text.Encoding]::UTF8)
    $lines = @($raw -split "`n" | Where-Object { $_.Trim() -ne "" })
    $headerCols = @($lines[0] -split ",").Count
    $hasDates = $raw -match "20\d{2}"
    $hasBom = $raw.StartsWith([char]0xFEFF) -or $raw.StartsWith("?")  # UTF-8 BOM
    $ok = ($headerCols -ge 12) -and ($hasDates) -and ($lines.Count -ge 2)

    if ($ok) {
        Write-Host "    [PASS] CSV valid: lines=$($lines.Count) cols=$headerCols hasDates=$hasDates hasBOM=$hasBom" -ForegroundColor Green
        $script:PASS++
        $preview = $raw.Substring(0, [Math]::Min(200, $raw.Length))
        Write-Host "    preview: $preview" -ForegroundColor Gray

        if (!(Test-Path "exports")) { New-Item -ItemType Directory -Path "exports" -Force | Out-Null }
        $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $script:CSV_SNAPSHOT = "exports\before_restart_$stamp.csv"
        [System.IO.File]::WriteAllText((Join-Path (Get-Location).Path $script:CSV_SNAPSHOT), $raw, [System.Text.Encoding]::UTF8)
        Write-Host "    saved snapshot -> $script:CSV_SNAPSHOT" -ForegroundColor Gray
    } else {
        Write-Host "    [FAIL] CSV invalid: lines=$($lines.Count) cols=$headerCols hasDates=$hasDates" -ForegroundColor Red
        $script:FAIL++
    }
} else {
    Write-Host "    [FAIL] CSV export status=$st" -ForegroundColor Red
    $script:FAIL++
}

# ================================================================
# 6. SNAPSHOT (for after-restart verification)
# ================================================================
Write-Header "6. Pre-restart data snapshots"

Write-Case "6.1 Snapshot tickets count"
$r = Test-Curl GET "/tickets?limit=200" -token $script:TOKENS.a1 -caseName "snapshot tickets"
$snapTickets = if ($r -and $r.success) { $r.data.total } else { 0 }

Write-Case "6.2 Snapshot logs count"
$r = Test-Curl GET "/logs?limit=500" -token $script:TOKENS.a1 -caseName "snapshot logs"
$snapLogs = if ($r -and $r.success) { $r.data.total } else { 0 }

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY (all requests via curl.exe)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  [PASS] $script:PASS" -ForegroundColor Green
if ($script:FAIL -eq 0) { Write-Host "  [FAIL] $script:FAIL" -ForegroundColor Green } else { Write-Host "  [FAIL] $script:FAIL" -ForegroundColor Red }
Write-Host ""
Write-Host "  KEY SNAPSHOTS:" -ForegroundColor Cyan
Write-Host "    Tickets total : $snapTickets" -ForegroundColor Gray
Write-Host "    Logs total    : $snapLogs" -ForegroundColor Gray
Write-Host "    Main ticket   : #$($script:MAIN_TID) status=pending (reopened)" -ForegroundColor Gray
Write-Host "    Return ticket : #$($script:RETURN_TID) status=pending" -ForegroundColor Gray
Write-Host "    CSV snapshot  : $script:CSV_SNAPSHOT" -ForegroundColor Gray
Write-Host ""
Write-Host "  Temp dir      : $TMPDIR" -ForegroundColor Gray
Write-Host ""
Write-Host "  NEXT: restart 'npm run dev', then run: test\after_restart.ps1" -ForegroundColor Yellow
Write-Host ""

exit $script:FAIL
