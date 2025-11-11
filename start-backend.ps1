param(
    [switch]$SkipEnvCheck
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "backend"

Write-Host "========================================"
Write-Host "Formulation Graph Studio Backend"        
Write-Host "========================================"
Write-Host

if (-not (Test-Path $backendDir)) {
    Write-Error "Backend directory not found at $backendDir"
    exit 1
}

Set-Location $backendDir

$venvCandidates = @(
    Join-Path $backendDir "venv\Scripts\Activate.ps1",
    Join-Path $scriptRoot ".venv\Scripts\Activate.ps1"
)

$venvActivate = $venvCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $venvActivate) {
    Write-Error "Virtual environment not found. Run setup-backend.bat or setup-backend.sh first."
    exit 1
}

Write-Host "Activating virtual environment..."
. $venvActivate

$envFile = Join-Path $backendDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Warning ".env file not found!"
    $envExample = Join-Path $backendDir ".env.example"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Warning "Created .env from .env.example. Update credentials as needed."
    } else {
        Write-Warning "No .env.example file found. Backend may fail to start without required settings."
    }
}

if (-not $SkipEnvCheck) {
    Write-Host "Checking OLLAMA service..."
    try {
        $ollamaHealthy = (Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5 -UseBasicParsing).StatusCode -eq 200
    } catch {
        $ollamaHealthy = $false
    }

    if (-not $ollamaHealthy) {
        Write-Warning "OLLAMA service not responding at http://localhost:11434"
        Write-Warning "Ensure Ollama is installed and running (use 'ollama serve')."
        Write-Host
    }
}

Write-Host
Write-Host "Starting FastAPI server..."
Write-Host "API will be available at: http://localhost:8000"
Write-Host "Documentation: http://localhost:8000/docs"
Write-Host

try {
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
} finally {
    Write-Host
    Write-Host "Server stopped."
    Read-Host "Press Enter to exit"
}
