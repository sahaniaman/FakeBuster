@echo off
cd /d "%~dp0"
echo Starting FakeBuster Backend Server...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run setup.bat in the main directory first to set up the project.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if uvicorn is installed
python -c "import uvicorn" >nul 2>&1
if errorlevel 1 (
    echo ERROR: FastAPI/uvicorn not installed!
    echo Please run setup.bat in the main directory first.
    pause
    exit /b 1
)

echo Virtual environment activated.
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

REM Start the FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
