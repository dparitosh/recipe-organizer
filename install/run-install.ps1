# Convenience wrapper to run the interactive installer then start services
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
& "$scriptDir\install.ps1"
& "$scriptDir\start_services.ps1"
