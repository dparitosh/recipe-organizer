param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

Write-Host "Stopping backend service on port $Port..."

try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen,Established -ErrorAction Stop
} catch {
    Write-Warning "Unable to query TCP connections. Try running PowerShell as administrator."
    $connections = @()
}

if (-not $connections) {
    Write-Host "No backend process appears to be listening on port $Port."
    return
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        Write-Host "Stopping process $($process.ProcessName) (PID $processId)..."
        Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
        Write-Warning ("Failed to stop process with PID {0}: {1}" -f $processId, $_.Exception.Message)
    }
}

Write-Host "Backend service stopped (if it was running)."
