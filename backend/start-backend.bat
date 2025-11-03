@echo off
REM Formulation Graph Studio Backend - Windows Start Script

echo ========================================
echo Formulation Graph Studio Backend
echo ========================================
echo.

REM Change to backend directory
cd /d %~dp0

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run setup-backend.bat first.
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if .env exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo Please edit .env file with your configuration.
    pause
)

REM Check if OLLAMA is running
echo Checking OLLAMA service...
curl -s http://localhost:11434/api/tags > nul 2>&1
if errorlevel 1 (
    echo WARNING: OLLAMA service not responding at http://localhost:11434
    echo Please ensure OLLAMA is installed and running.
    echo Download from: https://ollama.ai/download
    echo.
)

echo.
echo Starting FastAPI server...
echo API will be available at: http://localhost:8000
echo Documentation: http://localhost:8000/docs
echo.

REM Start the server
python main.py

REM If server stops
echo.
echo Server stopped.
pause
