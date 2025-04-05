@echo off
echo ===============================================================
echo  BeamNG Drive Session Summarizer - Two Server Setup
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

REM Build the React frontend
echo ----------------------------------------------------------------
echo  Building React Frontend
echo ----------------------------------------------------------------
if exist frontend (
    cd frontend
    echo Running npm build...
    
    REM Use CI=false to ignore warnings during build
    set CI=false
    call npm run build
    
    REM Check if build folder exists instead of checking error level
    if not exist build (
        echo ERROR: Failed to build React frontend.
        cd ..
        goto :end
    )
    cd ..
    echo React build completed successfully!
) else (
    echo WARNING: Frontend directory not found, skipping build step.
)
echo.

echo ----------------------------------------------------------------
echo  STARTING SERVERS
echo ----------------------------------------------------------------
echo.
echo  Server 1: Simulation Server (Original UI)
echo    Purpose: Run BeamNG.drive simulations and collect data
echo    Access:  http://localhost:8000
echo.
echo  Server 2: Dashboard Server (React UI)
echo    Purpose: View analytics dashboards from previous simulations
echo    Access:  http://localhost:3001
echo.
echo  IMPORTANT: Run simulations on Server 1 first, then view results
echo             on Server 2.
echo ----------------------------------------------------------------

echo.
echo Starting Simulation Server (Original Backend)...
start "Simulation Server - Original UI" cmd /k "echo [Simulation Server] Running on http://localhost:8000 && uvicorn server:app --host 0.0.0.0 --port 8000 --log-level info"

REM Wait a moment for the first server to start
timeout /t 2 /nobreak >nul

REM Start the React backend server in a new window with DEBUG logging
echo Starting Dashboard Server (React UI)...
start "Dashboard Server - React UI" cmd /k "echo [Dashboard Server] Running on http://localhost:3001 && uvicorn react_server:app --host 0.0.0.0 --port 3001 --log-level debug"

REM Wait a moment for the second server to start
timeout /t 2 /nobreak >nul

REM Open browsers to both applications
echo Opening browser windows...
start http://127.0.0.1:8000/ 
timeout /t 1 /nobreak >nul
start http://127.0.0.1:3001/

echo.
echo ----------------------------------------------------------------
echo  WORKFLOW INSTRUCTIONS
echo ----------------------------------------------------------------
echo  1. In the Simulation window (port 8000), enter a player ID 
echo     and run a BeamNG.drive simulation
echo  2. In the Dashboard window (port 3001), view the analytics
echo     and reports from your simulation
echo  3. Run multiple simulations to build up player history
echo ----------------------------------------------------------------
echo.
echo Close this window to stop both servers when finished.

:end
echo.
pause