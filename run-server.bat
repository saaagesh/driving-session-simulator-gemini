@echo off
echo ===============================================================
echo  BeamNG Drive Session Summarizer - Direct Startup
echo ===============================================================
echo.

REM Activate virtual environment
echo Activating virtual environment...
call C:\Users\Public\venv\Scripts\activate.bat

REM Change to the project directory
cd /d C:\Users\Public\drive-session-summarizer

REM Check if uvicorn is available
echo Checking for uvicorn...
where uvicorn >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: uvicorn not found. Make sure your virtual environment is activated.
    echo and the required packages are installed.
    goto :end
)

REM Kill any existing uvicorn processes
echo Checking for existing uvicorn processes...
tasklist /fi "imagename eq python.exe" /fo csv | findstr /i "uvicorn" >nul
if %ERRORLEVEL% equ 0 (
    echo Terminating existing uvicorn processes...
    taskkill /f /im python.exe /fi "windowtitle eq uvicorn*" >nul 2>&1
)

REM Create telematics directory if it doesn't exist
if not exist telematics (
    echo Creating telematics directory...
    mkdir telematics
)

REM Start the server
echo Starting server...
start http://127.0.0.1:8000/
uvicorn server:app --host 0.0.0.0 --port 8000 --reload

:end
echo.
pause