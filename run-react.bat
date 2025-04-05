@echo off
echo ===============================================================
echo  Starting React Development Server
echo ===============================================================
echo.

REM Change to the frontend directory
cd /d C:\Users\Public\drive-session-summarizer\frontend

REM Install dependencies if needed
echo Checking for dependencies...
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

REM Set the port environment variable (Windows style)
set PORT=3000

REM Start the React development server
echo Starting React development server...
npm start

echo.
pause