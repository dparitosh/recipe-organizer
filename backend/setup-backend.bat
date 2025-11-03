@echo off
REM Formulation Graph Studio Backend - Windows Setup Script

echo ========================================
echo Formulation Graph Studio Backend Setup
echo ========================================
echo.

REM Change to backend directory
cd /d %~dp0

REM Check Python installation
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH!
    echo Please install Python 3.10 or higher from https://www.python.org/
    pause
    exit /b 1
)

REM Display Python version
python --version

REM Check if venv exists
if exist "venv" (
    echo.
    echo Virtual environment already exists.
    choice /C YN /M "Do you want to recreate it"
    if errorlevel 2 goto :skip_venv
    if errorlevel 1 (
        echo Removing existing virtual environment...
        rmdir /s /q venv
    )
)

REM Create virtual environment
echo.
echo Creating virtual environment...
python -m venv venv

:skip_venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt

REM Create .env if it doesn't exist
if not exist ".env" (
    echo.
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo ========================================
    echo IMPORTANT: Configure your .env file
    echo ========================================
    echo Please edit .env file with your:
    echo - Neo4j connection details
    echo - OLLAMA configuration
    echo.
)

REM Check OLLAMA
echo.
echo Checking OLLAMA installation...
where ollama >nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNING: OLLAMA not found in PATH
    echo Please install OLLAMA from: https://ollama.ai/download
    echo After installation, run: ollama pull llama2
    echo.
) else (
    echo OLLAMA found!
    echo.
    echo Checking OLLAMA models...
    ollama list
    echo.
    echo If llama2 is not listed, run: ollama pull llama2
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env file with your configuration
echo 2. Ensure OLLAMA is running (ollama serve)
echo 3. Ensure Neo4j is accessible
echo 4. Run: start-backend.bat
echo.
echo Documentation: README.md
echo.
pause
