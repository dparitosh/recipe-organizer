<#
.SYNOPSIS
    Service verification script for Recipe Organizer.

.DESCRIPTION
    Runs health checks on Neo4j, Ollama, and the backend API to ensure all
    required services are reachable and properly configured.

.EXAMPLE
    .\verify.ps1
    Runs all health checks and reports status.
#>
param()

$ErrorActionPreference = "Continue"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path -Path $projectRoot -ChildPath "backend"
$venvPath = Join-Path -Path $projectRoot -ChildPath ".venv"
$envLocalPath = Join-Path -Path $backendDir -ChildPath "env.local.json"

Write-Host "=== Recipe Organizer Service Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check configuration file exists
if (-Not (Test-Path $envLocalPath)) {
    Write-Host "✗ Configuration file not found: $envLocalPath" -ForegroundColor Red
    Write-Host "  Run .\configure.ps1 to create your configuration.`n" -ForegroundColor Yellow
    exit 1
}

# Load configuration
Write-Host "Loading configuration from $envLocalPath..." -ForegroundColor Gray
$config = Get-Content $envLocalPath -Raw | ConvertFrom-Json

# Verify Neo4j connectivity
Write-Host "`n--- Neo4j Database ---" -ForegroundColor Magenta
if ($config.NEO4J_URI) {
    Write-Host "Testing connection to $($config.NEO4J_URI)..."
    
    $activateScript = Join-Path -Path $venvPath -ChildPath "Scripts\Activate.ps1"
    & $activateScript
    
    Push-Location $backendDir
    $neo4jTest = python -c @"
import sys
sys.path.insert(0, '.')
from app.db.neo4j_client import Neo4jClient
from app.core.config import settings
try:
    client = Neo4jClient(
        uri=settings.NEO4J_URI,
        user=settings.NEO4J_USER,
        password=settings.NEO4J_PASSWORD,
        database=settings.NEO4J_DATABASE
    )
    client.connect()
    result = client.execute_query('RETURN 1 AS test')
    client.close()
    print('✓ Neo4j connection successful')
    sys.exit(0)
except Exception as e:
    print(f'✗ Neo4j connection failed: {e}')
    sys.exit(1)
"@ 2>&1
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host $neo4jTest -ForegroundColor Green
    } else {
        Write-Host $neo4jTest -ForegroundColor Red
    }
} else {
    Write-Host "✗ NEO4J_URI not configured" -ForegroundColor Red
}

# Verify Ollama service
Write-Host "`n--- Ollama AI Service ---" -ForegroundColor Magenta
if ($config.OLLAMA_BASE_URL) {
    Write-Host "Testing connection to $($config.OLLAMA_BASE_URL)..."
    
    try {
        $ollamaResponse = Invoke-RestMethod -Uri "$($config.OLLAMA_BASE_URL)/api/tags" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✓ Ollama service is reachable" -ForegroundColor Green
        
        $embedModel = $config.OLLAMA_EMBED_MODEL
        if ($embedModel) {
            $modelExists = $ollamaResponse.models | Where-Object { $_.name -like "$embedModel*" }
            if ($modelExists) {
                Write-Host "✓ Embedding model '$embedModel' is available" -ForegroundColor Green
            } else {
                Write-Host "✗ Embedding model '$embedModel' not found" -ForegroundColor Red
                Write-Host "  Run: ollama pull $embedModel" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "✗ Ollama service unreachable: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Ensure Ollama is running and accessible at $($config.OLLAMA_BASE_URL)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ OLLAMA_BASE_URL not configured" -ForegroundColor Red
}

# Check backend API (if running)
Write-Host "`n--- Backend API ---" -ForegroundColor Magenta
$backendUrl = "http://$($config.HOST):$($config.PORT)"
Write-Host "Testing connection to $backendUrl/health..."

try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ Backend API is running" -ForegroundColor Green
    Write-Host "  Status: $($healthResponse.status)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Backend API not reachable" -ForegroundColor Yellow
    Write-Host "  This is normal if the backend is not yet started." -ForegroundColor Gray
    Write-Host "  Run .\start_services.ps1 to launch the backend." -ForegroundColor Gray
}

Write-Host "`n=== Verification Complete ===" -ForegroundColor Cyan
Write-Host ""
