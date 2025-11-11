<#
.SYNOPSIS
    Service startup script for Recipe Organizer.

.DESCRIPTION
    Launches the FastAPI backend (Uvicorn) and optionally the frontend dev server (Vite).
    Reads configuration from backend/env.local.json to determine host/port settings.

.PARAMETER BackendOnly
    Only start the backend API server (skip frontend).

.PARAMETER FrontendOnly
    Only start the frontend dev server (skip backend).

.PARAMETER NoNewWindow
    Run services in the current console instead of opening new windows.

.EXAMPLE
    .\start_services.ps1
    Starts both backend and frontend in new windows.

.EXAMPLE
    .\start_services.ps1 -BackendOnly
    Only starts the backend API.

.EXAMPLE
    .\start_services.ps1 -NoNewWindow
    Runs both services in the current console (blocking).
#>
param(
    [Parameter(Mandatory=$false)]
    [switch]$BackendOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$FrontendOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$NoNewWindow
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path -Path $projectRoot -ChildPath "backend"
$venvPath = Join-Path -Path $projectRoot -ChildPath ".venv"
$envLocalPath = Join-Path -Path $backendDir -ChildPath "env.local.json"
$pythonExe = Join-Path -Path $venvPath -ChildPath "Scripts\python.exe"

Write-Host "=== Recipe Organizer Service Startup ===" -ForegroundColor Cyan
Write-Host ""

# Check virtual environment exists
if (-Not (Test-Path $pythonExe)) {
    Write-Host "ERROR: Python virtual environment not found at $venvPath" -ForegroundColor Red
    Write-Host "Run .\install.ps1 first to set up the environment.`n" -ForegroundColor Yellow
    exit 1
}

# Check configuration exists
if (-Not (Test-Path $envLocalPath)) {
    Write-Host "WARNING: Configuration file not found: $envLocalPath" -ForegroundColor Yellow
    Write-Host "Run .\configure.ps1 to create your configuration file.`n" -ForegroundColor Yellow
    $proceed = Read-Host "Continue without configuration? (y/n)"
    if ($proceed -ne "y") {
        exit 1
    }
}

# Load configuration for port settings
$config = @{ HOST = "0.0.0.0"; PORT = 8000 }
if (Test-Path $envLocalPath) {
    $configData = Get-Content $envLocalPath -Raw | ConvertFrom-Json
    if ($configData.HOST) { $config.HOST = $configData.HOST }
    if ($configData.PORT) { $config.PORT = $configData.PORT }
}

# Start backend
if (-Not $FrontendOnly) {
    Write-Host "--- Starting Backend API ---" -ForegroundColor Magenta
    Write-Host "Backend will run on http://$($config.HOST):$($config.PORT)"
    
    Push-Location $backendDir
    $backendCmd = "& '$pythonExe' -m uvicorn app.main:app --host $($config.HOST) --port $($config.PORT) --reload"
    
    if ($NoNewWindow) {
        Write-Host "Starting backend in current console..." -ForegroundColor Yellow
        Invoke-Expression $backendCmd
    } else {
        Write-Host "Starting backend in new window..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; $backendCmd"
        Write-Host "✓ Backend started" -ForegroundColor Green
    }
    Pop-Location
}

# Start frontend
if (-Not $BackendOnly -and -Not $NoNewWindow) {
    Write-Host "`n--- Starting Frontend Dev Server ---" -ForegroundColor Magenta
    
    if (Test-Path (Join-Path -Path $projectRoot -ChildPath "package.json")) {
        # Check if npm is available
        try {
            $npmVersion = npm --version 2>&1
            Write-Host "Found npm: $npmVersion" -ForegroundColor Green
            
            Push-Location $projectRoot
            $frontendCmd = "npm run dev"
            
            Write-Host "Starting frontend in new window..." -ForegroundColor Green
            Write-Host "Frontend will run on http://localhost:5173 (default Vite port)"
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; $frontendCmd"
            Write-Host "✓ Frontend started" -ForegroundColor Green
            Pop-Location
        } catch {
            Write-Host "WARNING: npm not found, skipping frontend startup" -ForegroundColor Yellow
            Write-Host "Install Node.js to enable frontend features.`n" -ForegroundColor Gray
        }
    } else {
        Write-Host "No package.json found, skipping frontend startup" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Services Started ===" -ForegroundColor Green
Write-Host "`nAccess the application at:" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:$($config.PORT)" -ForegroundColor White
Write-Host "  Backend Docs: http://localhost:$($config.PORT)/docs" -ForegroundColor White
Write-Host "  Frontend UI: http://localhost:5173" -ForegroundColor White
Write-Host "`nTo stop services, close the PowerShell windows or press Ctrl+C`n" -ForegroundColor Gray
