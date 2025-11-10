param(
    [switch]$NoWait,
    [switch]$VerboseLogging
)

$banner = @'
========================================
Ollama Server
========================================
'@

Write-Host $banner

function Write-Info($message) {
    if ($VerboseLogging) {
        Write-Host $message -ForegroundColor Cyan
    }
}

function Write-WarningMessage($message) {
    Write-Warning $message
}

# Ensure the ollama CLI is available
$ollamaCommand = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaCommand) {
    Write-Error "ollama CLI not found in PATH. Install Ollama or add it to PATH before running this script."
    exit 1
}

# Detect existing ollama serve processes
$existing = Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $ollamaCommand.Source }
if ($existing) {
    Write-WarningMessage "Ollama server already running (PID(s): $($existing.Id -join ', '))."
    if (-not $NoWait) {
        Write-Host "Use 'Stop-Process -Id <PID>' to stop it, or rerun with -NoWait to skip checks." -ForegroundColor Yellow
    }
    if (-not $NoWait) {
        exit 0
    }
}

$arguments = @('serve')
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $ollamaCommand.Source
$startInfo.Arguments = [string]::Join(' ', $arguments)
$startInfo.WorkingDirectory = Split-Path $ollamaCommand.Source
$startInfo.EnvironmentVariables["OLLAMA_HOST"] = 'http://127.0.0.1:11434'
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true

Write-Info "Launching 'ollama serve' from $($ollamaCommand.Source)"

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
if (-not $process.Start()) {
    Write-Error "Failed to start ollama serve."
    exit 1
}

Write-Host "Ollama serve started (PID: $($process.Id))." -ForegroundColor Green

# Stream initial output to help diagnose startup
Start-Job -ScriptBlock {
    param($proc)
    try {
        while (-not $proc.HasExited) {
            if ($proc.StandardOutput.Peek() -ge 0) {
                Write-Host ($proc.StandardOutput.ReadLine())
            }
            if ($proc.StandardError.Peek() -ge 0) {
                Write-Warning ($proc.StandardError.ReadLine())
            }
            Start-Sleep -Milliseconds 200
        }
    } catch {
        # Ignore streaming errors when process exits
    }
} -ArgumentList $process | Out-Null

# Simple health polling unless suppressed
if (-not $NoWait) {
    Write-Info "Waiting for Ollama health endpoint..."
    $url = 'http://127.0.0.1:11434/api/version'
    $timeoutSeconds = 15
    $elapsed = 0
    while ($elapsed -lt $timeoutSeconds) {
        try {
            $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 3
            if ($response) {
                Write-Host "Ollama is ready (version: $($response.version))." -ForegroundColor Green
                break
            }
        } catch {
            Start-Sleep -Seconds 1
            $elapsed += 1
        }
    }

    if ($elapsed -ge $timeoutSeconds) {
        Write-WarningMessage "Ollama did not respond within $timeoutSeconds seconds. Check logs above for details."
    }
}

if ($NoWait) {
    Write-Host "Ollama serve running in background (PID: $($process.Id))." -ForegroundColor Green
} else {
    Write-Host "Press Ctrl+C to stop monitoring output. Ollama continues running until the process exits." -ForegroundColor Yellow
    Wait-Process -Id $process.Id
}
