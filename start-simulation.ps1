# ============================================================
# BeamNG.drive Simulation Server Startup Script
# ============================================================

# Script Configuration
$AppName = "BeamNG Drive Session Summarizer"
$LogDir = ".\logs"
$LogFile = "$LogDir\$(Get-Date -Format 'yyyy-MM-dd').log"
$EnvFile = ".\.env"

# ============================================================
# Functions
# ============================================================

function Write-LogMessage {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("INFO", "WARNING", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to console with color
    switch ($Level) {
        "INFO"    { Write-Host $logMessage -ForegroundColor Cyan }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR"   { Write-Host $logMessage -ForegroundColor Red }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
    }
    
    # Write to log file
    Add-Content -Path $LogFile -Value $logMessage
}

function Initialize-Environment {
    # Create log directory if it doesn't exist
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir | Out-Null
        Write-LogMessage "Created log directory: $LogDir" -Level "INFO"
    }
    
    # Create log file if it doesn't exist
    if (-not (Test-Path $LogFile)) {
        New-Item -ItemType File -Path $LogFile | Out-Null
        Write-LogMessage "Created log file: $LogFile" -Level "INFO"
    }
    
    # Load environment variables if .env file exists
    if (Test-Path $EnvFile) {
        Write-LogMessage "Loading environment variables from $EnvFile" -Level "INFO"
        Get-Content $EnvFile | ForEach-Object {
            if (-not [string]::IsNullOrWhiteSpace($_) -and $_ -match "^([^=]+)=(.*)$") {
                $varName = $matches[1]
                $varValue = $matches[2]
                Set-Item -Path "env:$varName" -Value $varValue
                Write-LogMessage "Set environment variable: $varName" -Level "INFO"
            }
        }
    } else {
        Write-LogMessage "No .env file found. Using default environment variables." -Level "INFO"
    }
    
    # Check if required directories exist
    if (-not (Test-Path ".\telematics")) {
        New-Item -ItemType Directory -Path ".\telematics" | Out-Null
        Write-LogMessage "Created telematics directory" -Level "INFO"
    }
    
    # Check if dist directory exists
    if (-not (Test-Path ".\dist")) {
        Write-LogMessage "Warning: 'dist' directory not found. Frontend may not function correctly." -Level "WARNING"
    }
}

function Stop-ExistingProcesses {
    Write-LogMessage "Checking for existing server processes..." -Level "INFO"
    
    # Find and kill any existing uvicorn processes
    $uvicornProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue | 
                         Where-Object { $_.CommandLine -like "*uvicorn*server:app*" }
    
    if ($uvicornProcesses) {
        Write-LogMessage "Found $($uvicornProcesses.Count) existing uvicorn processes. Terminating..." -Level "WARNING"
        
        foreach ($process in $uvicornProcesses) {
            try {
                Stop-Process -Id $process.Id -Force
                Write-LogMessage "Terminated process ID: $($process.Id)" -Level "SUCCESS"
            } catch {
                Write-LogMessage "Failed to terminate process ID: $($process.Id). Error: $_" -Level "ERROR"
            }
        }
    } else {
        Write-LogMessage "No existing uvicorn processes found." -Level "INFO"
    }
    
    # Check for any BeamNG.drive processes that might be running
    $beamNGProcesses = Get-Process -Name "BeamNG.drive*" -ErrorAction SilentlyContinue
    
    if ($beamNGProcesses) {
        Write-LogMessage "Found $($beamNGProcesses.Count) existing BeamNG.drive processes. Terminating..." -Level "WARNING"
        
        foreach ($process in $beamNGProcesses) {
            try {
                Stop-Process -Id $process.Id -Force
                Write-LogMessage "Terminated process ID: $($process.Id)" -Level "SUCCESS"
            } catch {
                Write-LogMessage "Failed to terminate process ID: $($process.Id). Error: $_" -Level "ERROR"
            }
        }
    } else {
        Write-LogMessage "No existing BeamNG.drive processes found." -Level "INFO"
    }
    
    # Brief pause to ensure processes are fully terminated
    Start-Sleep -Seconds 2
}

# We'll skip testing the Python environment since we're using an existing venv
function Test-PythonEnvironment {
    Write-LogMessage "Using existing Python virtual environment..." -Level "INFO"
    Write-LogMessage "Assuming all required packages are already installed." -Level "INFO"
    return $true
}

function Start-SimulationServer {
    Write-LogMessage "Starting BeamNG.drive simulation server..." -Level "INFO"
    
    try {
        # Set environment variables for the server
        $env:PYTHONUNBUFFERED = "1"  # Ensures Python output is unbuffered (good for logs)
        
        # Start the server using the virtual environment
        Write-LogMessage "Executing: uvicorn server:app --host 0.0.0.0 --port 8000 --reload" -Level "INFO"
        
        # Run uvicorn directly, since we're in the virtual environment
        $serverUrl = "http://localhost:8000"
        
        # Start the uvicorn server
        Write-LogMessage "Starting server..." -Level "INFO"
        
        # Open the default browser
        Start-Process $serverUrl
        
        # Run the uvicorn process 
        uvicorn server:app --host 0.0.0.0 --port 8000 --reload
        
        Write-LogMessage "Server process has exited" -Level "INFO"
    } catch {
        Write-LogMessage "Failed to start server: $_" -Level "ERROR"
    }
}

# ============================================================
# Main Script Execution
# ============================================================

Clear-Host
Write-Host "===========================================================" -ForegroundColor Blue
Write-Host "  $AppName - Startup Script" -ForegroundColor Blue
Write-Host "===========================================================" -ForegroundColor Blue
Write-Host ""

# Initialize environment
Initialize-Environment

# Stop any existing processes
Stop-ExistingProcesses

# We're using an existing virtual environment, so we'll skip the check
$pythonEnvReady = $true
Write-LogMessage "Using existing virtual environment" -Level "INFO"

# Start the simulation server
Start-SimulationServer