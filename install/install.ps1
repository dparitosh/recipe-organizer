<#
.SYNOPSIS
    Installation script for Recipe Organizer on Windows.

.DESCRIPTION
    Sets up the Python virtual environment, installs backend dependencies from requirements.txt,
    installs frontend dependencies via npm, and verifies the configuration is valid.

.PARAMETER SkipPython
    Skip Python virtual environment creation and dependency installation.

.PARAMETER SkipNode
    Skip Node.js dependency installation.

.EXAMPLE
    .\install.ps1
    Runs full installation (Python + Node.js).

.EXAMPLE
    .\install.ps1 -SkipNode
    Only installs Python dependencies.
#>
param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipPython,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipNode
)

$ErrorActionPreference = "Stop"

# Resolve paths
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path -Path $projectRoot -ChildPath "backend"
$venvPath = Join-Path -Path $projectRoot -ChildPath ".venv"
$requirementsPath = Join-Path -Path $backendDir -ChildPath "requirements.txt"
$envLocalPath = Join-Path -Path $backendDir -ChildPath "env.local.json"

Write-Host "=== Recipe Organizer Installation ===" -ForegroundColor Cyan
Write-Host "Project root: $projectRoot`n"

# Check for env.local.json
if (-Not (Test-Path $envLocalPath)) {
    Write-Host "WARNING: $envLocalPath not found." -ForegroundColor Yellow
    Write-Host "Run .\configure.ps1 first to create your configuration file.`n" -ForegroundColor Yellow
    $proceed = Read-Host "Continue installation without configuration? (y/n)"
    if ($proceed -ne "y") {
        Write-Host "Installation cancelled. Run .\configure.ps1 then re-run .\install.ps1" -ForegroundColor Red
        exit 1
    }
}

# Python installation
if (-Not $SkipPython) {
    Write-Host "--- Python Environment Setup ---" -ForegroundColor Magenta
    
    # Check Python version
    try {
        $pythonVersion = python --version 2>&1
        Write-Host "Found: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Python not found in PATH." -ForegroundColor Red
        Write-Host "Install Python 3.10+ from https://www.python.org/downloads/" -ForegroundColor Yellow
        exit 1
    }
    
    # Create virtual environment
    if (Test-Path $venvPath) {
        Write-Host "Virtual environment already exists at $venvPath" -ForegroundColor Yellow
    } else {
        Write-Host "Creating virtual environment at $venvPath..."
        python -m venv $venvPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
            exit 1
        }
        Write-Host "✓ Virtual environment created" -ForegroundColor Green
    }
    
    # Activate virtual environment and install dependencies
    $activateScript = Join-Path -Path $venvPath -ChildPath "Scripts\Activate.ps1"
    Write-Host "Installing backend dependencies from $requirementsPath..."
    
    & $activateScript
    python -m pip install --upgrade pip
    pip install -r $requirementsPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install Python dependencies" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Skipping Python installation (--SkipPython)" -ForegroundColor Yellow
}

# Node.js installation
if (-Not $SkipNode) {
    Write-Host "`n--- Frontend Dependencies ---" -ForegroundColor Magenta
    
    # Check Node.js version
    try {
        $nodeVersion = node --version 2>&1
        Write-Host "Found Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: Node.js not found in PATH." -ForegroundColor Yellow
        Write-Host "Install Node.js 18+ from https://nodejs.org/ to enable frontend features.`n" -ForegroundColor Yellow
        $proceed = Read-Host "Continue without Node.js? (y/n)"
        if ($proceed -ne "y") {
            exit 1
        }
    }
    
    if (Test-Path (Join-Path -Path $projectRoot -ChildPath "package.json")) {
        Write-Host "Installing Node.js dependencies..."
        Push-Location $projectRoot
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to install Node.js dependencies" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Pop-Location
        Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "No package.json found, skipping npm install" -ForegroundColor Yellow
    }
} else {
    Write-Host "Skipping Node.js installation (--SkipNode)" -ForegroundColor Yellow
}

# Verify configuration
Write-Host "`n--- Configuration Validation ---" -ForegroundColor Magenta
if (Test-Path $envLocalPath) {
    Write-Host "Validating configuration in $envLocalPath..."
    
    $activateScript = Join-Path -Path $venvPath -ChildPath "Scripts\Activate.ps1"
    & $activateScript
    
    Push-Location $backendDir
    $validationResult = python -c "import sys; sys.path.insert(0, '.'); from app.core.config import settings; settings.validate(); print('Configuration valid')" 2>&1
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Configuration is valid" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Configuration validation returned warnings:" -ForegroundColor Yellow
        Write-Host $validationResult -ForegroundColor Yellow
        Write-Host "`nYou may need to update $envLocalPath with required values." -ForegroundColor Yellow
    }
} else {
    Write-Host "Skipping configuration validation (env.local.json not found)" -ForegroundColor Yellow
}

Write-Host "`n=== Installation Complete ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. If you haven't already, run .\configure.ps1 to set up configuration"
Write-Host "  2. Run .\verify.ps1 to check service connectivity"
Write-Host "  3. Run .\start_services.ps1 to launch the application`n"

