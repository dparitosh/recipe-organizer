param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "Formulation Graph Studio - Backend Setup"
Write-Host "========================================"
Write-Host

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "backend"
$venvDir = Join-Path $backendDir "venv"

if (-not (Test-Path $backendDir)) {
    Write-Error "backend directory not found at $backendDir"
    exit 1
}

if (Test-Path (Join-Path $venvDir "Scripts\python.exe")) {
    if ($Force -or (Read-Host "Existing backend\\venv detected. Recreate? (y/N)" ) -match '^[Yy]$') {
        Write-Host "Removing existing virtual environment..."
        Remove-Item -Recurse -Force $venvDir
    } else {
        Write-Host "Keeping existing virtual environment."
    }
}

if (-not (Test-Path (Join-Path $venvDir "Scripts\python.exe"))) {
    Write-Host "Creating Python virtual environment under backend\venv ..."
    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        py -3.12 -m venv $venvDir
    } else {
        python -m venv $venvDir
    }
    Write-Host "✓ Virtual environment created."
} else {
    Write-Host "✓ Virtual environment ready at backend\\venv."
}

Write-Host
Write-Host "Activating virtual environment..."
. (Join-Path $venvDir "Scripts\Activate.ps1")

Write-Host
Write-Host "Installing backend dependencies..."
python -m pip install --upgrade pip
python -m pip install -r (Join-Path $backendDir "requirements.txt")
$devReq = Join-Path $backendDir "requirements-dev.txt"
if (Test-Path $devReq) {
    python -m pip install -r $devReq
}
Write-Host "✓ Dependencies installed."

Write-Host
$envPath = Join-Path $backendDir ".env"
if (-not (Test-Path $envPath)) {
    $envExample = Join-Path $backendDir ".env.example"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envPath -Force
        Write-Host "✓ backend\\.env created. Update Neo4j and Ollama settings before starting."
    } else {
        Write-Warning ".env.example not found. Create backend\\.env manually."
    }
} else {
    Write-Host "✓ backend\\.env already present."
}

$envLocalPath = Join-Path $backendDir "env.local.json"
if (-not (Test-Path $envLocalPath)) {
    $envLocalExample = Join-Path $backendDir "env.local.json.example"
    if (Test-Path $envLocalExample) {
        Copy-Item $envLocalExample $envLocalPath -Force
        Write-Host "✓ env.local.json created (optional overrides)."
    }
}

Write-Host
Write-Host "========================================"
Write-Host "Setup complete!"
Write-Host "========================================"
Write-Host
Write-Host "Next steps:"
Write-Host "  1. Edit backend\\.env and env.local.json with real credentials."
Write-Host "  2. Pull Ollama models (e.g. 'ollama pull llama3:latest')."
Write-Host "  3. Start backend via start-backend.ps1 or start-backend.bat."
Write-Host
Write-Host "Do not copy backend\\venv between machines; recreate it with this script."
