@echo off
echo Starting Formulation Graph Studio Backend...
echo.

cd backend

if not exist "venv" (
    echo Virtual environment not found. Please run setup-backend.bat first.
    pause
    exit /b 1
)

call venv\Scripts\activate

if not exist ".env" (
    echo Warning: .env file not found. Using default configuration.
)

echo Backend server starting on http://localhost:8000
echo Press Ctrl+C to stop
echo.

python main.py
