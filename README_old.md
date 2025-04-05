# BeamNG.drive Simulation Setup Guide

## Table of Contents
- [Overview](#overview)
- [System Requirements](#system-requirements)
- [Installation](#installation)
  - [Part 1: Game Installation](#part-1-game-installation)
  - [Part 2: Python Environment Setup](#part-2-python-environment-setup)
  - [Part 3: Application Configuration](#part-3-application-configuration)
- [Running the Application](#running-the-application)
- [Application Flow](#application-flow)
- [Troubleshooting](#troubleshooting)
- [Support and Resources](#support-and-resources)

## Overview

This simulation application integrates three core components to provide a comprehensive driving simulation experience:

1. BeamNG.drive game for simulation
2. Python backend for data collection and analysis
3. Frontend interface for user interaction

## System Requirements

Before beginning the installation, ensure your system meets these minimum requirements:

- Windows 10 or later
- 16 GB RAM minimum (32 GB recommended)
- DirectX 11 compatible graphics card with 4 GB VRAM
- 60 GB available disk space
- Python 3.8 or later
- Steam account

## Installation

### Part 1: Game Installation

1. **Install Steam**
   - Download Steam from https://store.steampowered.com/about/
   - Create a Steam account if you don't have one
   - Install Steam and log in to your account

2. **Install BeamNG.drive**
   - Purchase BeamNG.drive from Steam Store
   - In your Steam library, locate BeamNG.drive
   - Click "Install" and choose your installation directory
   - Wait for the download and installation to complete
   - Note down your installation path (default: `C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive`)

### Part 2: Python Environment Setup

1. **Install Python**
   - Download Python 3.8 or later from https://www.python.org/downloads/
   - During installation, check "Add Python to PATH"
   - Complete the installation

2. **Install Required Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### Part 3: Application Configuration

1. **Update BeamNG Path**
   
   In the Python code, update the BeamNG paths to match your installation:
   ```python
   beamng = BeamNGpy('localhost', 51394, 
                     home='YOUR_BEAMNG_INSTALLATION_PATH', 
                     user='YOUR_PROJECT_PATH/user')
   ```
   Replace:
   - `YOUR_BEAMNG_INSTALLATION_PATH` with your BeamNG.drive installation path
   - `YOUR_PROJECT_PATH` with your project directory path (use default user path if none exists)

2. **Frontend Setup**
   - Place all frontend files in the `dist` directory
   - Ensure `index.html` is directly in `dist`
   - Store all other frontend assets in `dist/assets`

## Running the Application

1. **Start the Backend Server**
   ```bash
   uvicorn server:app --reload
   ```
   The server will start on `http://localhost:8000`

2. **Launch the Application**
   - Ensure BeamNG.drive is not currently running
   - Open your web browser and navigate to `http://localhost:8000`
   - Enter a player ID in the frontend interface

## Application Flow

The application follows this sequence:

1. User enters their player ID in the frontend
2. Backend automatically launches BeamNG.drive
3. Simulation runs for 30 seconds, collecting vehicle telemetry data
4. Data is processed and analyzed
5. AI-generated summary of the driving session is presented
6. Performance graphs and insights are displayed

## Troubleshooting

### Common Issues and Solutions

1. **BeamNG.drive Won't Launch**
   - Verify the installation paths in the code
   - Ensure BeamNG.drive runs normally through Steam
   - Check if any other instance is running

2. **Missing Data Files**
   - Verify the `telematics` directory exists
   - Check write permissions for the directory

3. **API Errors**
   - Ensure all Python dependencies are installed
   - Verify the server is running
   - Check console for specific error messages

## Support and Resources

- BeamNG.drive Documentation: https://documentation.beamng.com/
- Python BeamNGpy Documentation: https://github.com/BeamNG/BeamNGpy

For additional support, please refer to the documentation or raise an issue in the project repository.