param(
    [switch]$Install
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

Write-Host "========================================"
Write-Host "Formulation Graph Studio Frontend"        
Write-Host "========================================"
Write-Host

if ($Install -or -not (Test-Path (Join-Path $scriptRoot "node_modules"))) {
    Write-Host "Installing npm dependencies..."
    npm install
    Write-Host
}

Write-Host "Launching Vite development server..."
Write-Host "App will be available at: http://localhost:5173"
Write-Host

# Run npm script and keep PowerShell session alive until it exits
npm run dev
