@echo off
setlocal ENABLEEXTENSIONS

set SCRIPT_DIR=%~dp0
set PS_SCRIPT=%SCRIPT_DIR%start-frontend.ps1

if not exist "%PS_SCRIPT%" (
    echo [ERROR] Unable to locate PowerShell launcher: %PS_SCRIPT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
endlocal
