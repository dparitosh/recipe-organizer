@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

echo =========================================
echo Formulation Graph Studio - Backend Setup
echo =========================================
echo.

set REPO_ROOT=%~dp0
set BACKEND_DIR=%REPO_ROOT%backend
set VENV_DIR=%BACKEND_DIR%\venv

if not exist "%BACKEND_DIR%" (
    echo [ERROR] backend directory not found at %BACKEND_DIR%
    exit /b 1
)

pushd "%BACKEND_DIR%"

if exist "%VENV_DIR%\Scripts\python.exe" (
    choice /M "Existing backend\venv detected. Recreate virtual environment?"
    if not errorlevel 2 (
        echo Removing existing virtual environment...
        rmdir /s /q "%VENV_DIR%"
    ) else (
        echo Keeping existing virtual environment.
    )
)

if not exist "%VENV_DIR%\Scripts\python.exe" (
    echo Creating Python virtual environment under backend\venv ...
    where py >nul 2>&1
    if %errorlevel%==0 (
        py -3.12 -m venv "%VENV_DIR%"
    ) else (
        python -m venv "%VENV_DIR%"
    )
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment. Ensure Python 3.12 is installed and available as 'py -3.12'.
        popd
        exit /b 1
    )
    echo ✓ Virtual environment created.
) else (
    echo ✓ Virtual environment ready at backend\venv.
)

echo.
echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment.
    popd
    exit /b 1
)

echo.
echo Installing backend dependencies...
python -m pip install --upgrade pip
if errorlevel 1 goto pip_failed
python -m pip install -r requirements.txt
if errorlevel 1 goto pip_failed
if exist requirements-dev.txt (
    python -m pip install -r requirements-dev.txt
    if errorlevel 1 goto pip_failed
)
echo ✓ Dependencies installed.

echo.
if not exist ".env" (
    echo Creating .env from template...
    if exist ".env.example" (
        copy /Y .env.example .env >nul
        echo ✓ backend\.env created. Update Neo4j and Ollama credentials before running the server.
    ) else (
        echo [WARN] .env.example not found. Create backend\.env manually.
    )
) else (
    echo ✓ backend\.env already present.
)

if not exist "env.local.json" (
    if exist "env.local.json.example" (
        copy /Y env.local.json.example env.local.json >nul
        echo ✓ env.local.json created (optional overrides).
    )
)

echo.
echo =========================================
echo Backend setup complete!
echo =========================================
echo.
echo Next steps:
echo   1. Edit backend\.env and env.local.json with real credentials.
echo   2. (Optional) Pull Ollama models:  ollama pull llama3:latest
echo   3. Start backend: start-backend.bat or start-backend.ps1
echo.
echo To run API locally:
echo   cd backend
echo   venv\Scripts\activate
echo   uvicorn main:app --reload --port 8000
echo.
goto end

:pip_failed
echo [ERROR] pip installation failed. Review the output above.
popd
exit /b 1

:end
popd
endlocal
