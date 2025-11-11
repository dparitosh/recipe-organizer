<#
.SYNOPSIS
    Interactive configuration script for Recipe Organizer backend environment.

.DESCRIPTION
    Prompts the user for required configuration values (Neo4j, Ollama, FDC API key, etc.)
    and writes them to backend/env.local.json. Can also read from environment variables
    or a JSON input file for non-interactive setup.

.PARAMETER FromJson
    Optional path to a JSON file containing configuration values.

.PARAMETER FromEnvironment
    Switch to read configuration from environment variables instead of prompting.

.EXAMPLE
    .\configure.ps1
    Runs interactively, prompting for each configuration value.

.EXAMPLE
    .\configure.ps1 -FromJson .\myconfig.json
    Reads configuration from the specified JSON file.

.EXAMPLE
    .\configure.ps1 -FromEnvironment
    Reads configuration from environment variables.
#>
param(
    [Parameter(Mandatory=$false)]
    [string]$FromJson,
    
    [Parameter(Mandatory=$false)]
    [switch]$FromEnvironment
)

$ErrorActionPreference = "Stop"

# Resolve paths
$backendDir = Join-Path -Path $PSScriptRoot -ChildPath "..\backend" | Resolve-Path
$examplePath = Join-Path -Path $backendDir -ChildPath "env.local.json.example"
$envPath = Join-Path -Path $backendDir -ChildPath "env.local.json"

Write-Host "=== Recipe Organizer Configuration ===" -ForegroundColor Cyan
Write-Host "This script will create $envPath with your environment-specific settings.`n"

if ($FromJson) {
    # Read from JSON file
    if (-Not (Test-Path $FromJson)) {
        throw "Configuration file not found: $FromJson"
    }
    Write-Host "Reading configuration from: $FromJson" -ForegroundColor Yellow
    $config = Get-Content $FromJson -Raw | ConvertFrom-Json
} elseif ($FromEnvironment) {
    # Read from environment variables
    Write-Host "Reading configuration from environment variables..." -ForegroundColor Yellow
    $config = @{
        NEO4J_URI = $env:NEO4J_URI
        NEO4J_USER = $env:NEO4J_USER
        NEO4J_PASSWORD = $env:NEO4J_PASSWORD
        NEO4J_DATABASE = if ($env:NEO4J_DATABASE) { $env:NEO4J_DATABASE } else { "neo4j" }
        OLLAMA_BASE_URL = $env:OLLAMA_BASE_URL
        OLLAMA_MODEL = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "llama2" }
        OLLAMA_TIMEOUT = if ($env:OLLAMA_TIMEOUT) { [int]$env:OLLAMA_TIMEOUT } else { 60 }
        OLLAMA_EMBED_MODEL = $env:OLLAMA_EMBED_MODEL
        OLLAMA_EMBED_BATCH_SIZE = if ($env:OLLAMA_EMBED_BATCH_SIZE) { [int]$env:OLLAMA_EMBED_BATCH_SIZE } else { 16 }
        FDC_API_KEY = $env:FDC_API_KEY
        FDC_REQUEST_TIMEOUT = if ($env:FDC_REQUEST_TIMEOUT) { [int]$env:FDC_REQUEST_TIMEOUT } else { 30 }
        HOST = if ($env:HOST) { $env:HOST } else { "0.0.0.0" }
        PORT = if ($env:PORT) { [int]$env:PORT } else { 8000 }
        DEBUG = if ($env:DEBUG -eq "true") { $true } else { $false }
    }
} else {
    # Interactive prompts
    Write-Host "Please provide the following configuration values:" -ForegroundColor Green
    Write-Host "(Press Enter to use default values where shown)`n"
    
    $config = @{}
    
    # Neo4j Configuration
    Write-Host "--- Neo4j Database ---" -ForegroundColor Magenta
    $config.NEO4J_URI = Read-Host "Neo4j URI (e.g., neo4j+s://abc.databases.neo4j.io)"
    $config.NEO4J_USER = Read-Host "Neo4j Username [neo4j]"
    if ([string]::IsNullOrWhiteSpace($config.NEO4J_USER)) { $config.NEO4J_USER = "neo4j" }
    $config.NEO4J_PASSWORD = Read-Host "Neo4j Password" -AsSecureString
    $config.NEO4J_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($config.NEO4J_PASSWORD)
    )
    $config.NEO4J_DATABASE = Read-Host "Neo4j Database [neo4j]"
    if ([string]::IsNullOrWhiteSpace($config.NEO4J_DATABASE)) { $config.NEO4J_DATABASE = "neo4j" }
    
    # Ollama Configuration
    Write-Host "`n--- Ollama AI Service ---" -ForegroundColor Magenta
    $config.OLLAMA_BASE_URL = Read-Host "Ollama Base URL [http://localhost:11434]"
    if ([string]::IsNullOrWhiteSpace($config.OLLAMA_BASE_URL)) { $config.OLLAMA_BASE_URL = "http://localhost:11434" }
    $config.OLLAMA_MODEL = Read-Host "Ollama Model [llama2]"
    if ([string]::IsNullOrWhiteSpace($config.OLLAMA_MODEL)) { $config.OLLAMA_MODEL = "llama2" }
    $ollamaTimeout = Read-Host "Ollama Timeout (seconds) [60]"
    $config.OLLAMA_TIMEOUT = if ([string]::IsNullOrWhiteSpace($ollamaTimeout)) { 60 } else { [int]$ollamaTimeout }
    $config.OLLAMA_EMBED_MODEL = Read-Host "Ollama Embedding Model [nomic-embed-text]"
    if ([string]::IsNullOrWhiteSpace($config.OLLAMA_EMBED_MODEL)) { $config.OLLAMA_EMBED_MODEL = "nomic-embed-text" }
    $embedBatch = Read-Host "Ollama Embedding Batch Size [16]"
    $config.OLLAMA_EMBED_BATCH_SIZE = if ([string]::IsNullOrWhiteSpace($embedBatch)) { 16 } else { [int]$embedBatch }
    
    # FDC Configuration
    Write-Host "`n--- USDA FoodData Central ---" -ForegroundColor Magenta
    $config.FDC_API_KEY = Read-Host "FDC API Key (optional, press Enter to skip)"
    $fdcTimeout = Read-Host "FDC Request Timeout (seconds) [30]"
    $config.FDC_REQUEST_TIMEOUT = if ([string]::IsNullOrWhiteSpace($fdcTimeout)) { 30 } else { [int]$fdcTimeout }
    
    # Application Configuration
    Write-Host "`n--- Application Settings ---" -ForegroundColor Magenta
    $config.HOST = Read-Host "Backend Host [0.0.0.0]"
    if ([string]::IsNullOrWhiteSpace($config.HOST)) { $config.HOST = "0.0.0.0" }
    $portInput = Read-Host "Backend Port [8000]"
    $config.PORT = if ([string]::IsNullOrWhiteSpace($portInput)) { 8000 } else { [int]$portInput }
    $debugInput = Read-Host "Enable Debug Mode? (y/n) [n]"
    $config.DEBUG = ($debugInput -eq "y" -or $debugInput -eq "yes")
}

# Write configuration to env.local.json
$json = $config | ConvertTo-Json -Depth 6
Set-Content -Path $envPath -Value $json -Encoding UTF8

Write-Host "`n✓ Configuration saved to: $envPath" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run .\install.ps1 to set up dependencies"
Write-Host "  2. Run .\start_services.ps1 to launch the application"
Write-Host "  3. Run .\verify.ps1 to check service health`n"
