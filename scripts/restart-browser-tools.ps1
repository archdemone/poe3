# Restart Browser Tools Server Cleanly
# This script kills any existing browser tools servers and starts fresh

Write-Host "=== Restarting Browser Tools Server ===" -ForegroundColor Cyan

# Step 1: Find and kill processes on ports 3025-3027
Write-Host "`n[1/4] Checking for processes on ports 3025-3027..." -ForegroundColor Yellow

$ports = @(3025, 3026, 3027)
foreach ($port in $ports) {
    $connections = netstat -ano | Select-String ":$port " | Select-String "LISTENING"
    if ($connections) {
        foreach ($conn in $connections) {
            $processId = ($conn -split '\s+')[-1]
            if ($processId -match '^\d+$') {
                Write-Host "  Killing process $processId on port $port" -ForegroundColor Red
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Step 2: Wait for ports to be released
Write-Host "`n[2/4] Waiting for ports to be released..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Step 3: Verify ports are free
Write-Host "`n[3/4] Verifying ports are free..." -ForegroundColor Yellow
$stillInUse = netstat -ano | Select-String ":3025 " | Select-String "LISTENING"
if ($stillInUse) {
    Write-Host "  WARNING: Port 3025 still in use!" -ForegroundColor Red
    Write-Host "  You may need to manually kill the process or restart your computer." -ForegroundColor Red
} else {
    Write-Host "  Port 3025 is free!" -ForegroundColor Green
}

# Step 4: Start browser tools server
Write-Host "`n[4/4] Starting browser tools server..." -ForegroundColor Yellow
Set-Location browser-tools-mcp-extension/browser-tools-server

Write-Host "`nStarting server (this will run in foreground)..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm start

