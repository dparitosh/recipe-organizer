@echo off
setlocal ENABLEEXTENSIONS

echo =========================================
echo Starting Formulation Graph Studio Backend
echo =========================================
echo.

set REPO_ROOT=%~dp0
set BACKEND_DIR=%REPO_ROOT%backend
set PRIMARY_VENV=%BACKEND_DIR%\venv\Scripts\activate.bat
set ROOT_VENV=%REPO_ROOT%\.venv\Scripts\activate.bat

if not exist "%BACKEND_DIR%" (
    echo [ERROR] backend directory not found at %BACKEND_DIR%
    exit /b 1
)

set ACTIVATE_SCRIPT=
if exist "%PRIMARY_VENV%" set ACTIVATE_SCRIPT=%PRIMARY_VENV%
if "%ACTIVATE_SCRIPT%"=="" if exist "%ROOT_VENV%" set ACTIVATE_SCRIPT=%ROOT_VENV%

if "%ACTIVATE_SCRIPT%"=="" (
    echo [ERROR] No virtual environment found. Run setup-backend.bat first.
    exit /b 1
)

call "%ACTIVATE_SCRIPT%"
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment.
    exit /b 1
)

pushd "%BACKEND_DIR%"

if not exist ".env" (
    echo [WARN] backend\.env not found. Default configuration will be used.
)

echo Backend server starting on http://localhost:8000 (Ctrl+C to stop)
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

popd
endlocal
