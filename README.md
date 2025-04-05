# BeamNG.drive Simulation with BigQuery Integration
## Implementation and Testing Guide

This guide provides step-by-step instructions for implementing and testing the enhanced BeamNG.drive simulation application with BigQuery integration.

## Prerequisites

- BeamNG.drive installed on your system
- Python 3.8+ with all required dependencies
- Google Cloud SDK installed and configured
- Node.js and npm for the React frontend
- BigQuery dataset created in your Google Cloud project

## Step 1: Set Up BigQuery Tables

Before running the application, create the necessary BigQuery tables:

```sql
-- Create dataset if it doesn't exist
CREATE SCHEMA IF NOT EXISTS `data-connect-demo4.simulated_vehicle_data`;

-- Create analytics_summary table
CREATE TABLE IF NOT EXISTS `data-connect-demo4.simulated_vehicle_data.analytics_summary` (
  player_id STRING NOT NULL,
  session_id STRING NOT NULL,
  session_timestamp TIMESTAMP NOT NULL,
  total_time_secs FLOAT64,
  accX_mean FLOAT64,
  accY_mean FLOAT64,
  accZ_mean FLOAT64,
  brake_usage_count INT64,
  brake_average FLOAT64,
  fuel_start FLOAT64,
  fuel_end FLOAT64,
  gears_used STRING,
  gear_change_details STRING,
  oil_temp_min FLOAT64,
  oil_temp_max FLOAT64,
  oil_temp_mean FLOAT64,
  part_damage STRING,
  rpm_min FLOAT64,
  rpm_max FLOAT64,
  rpm_mean FLOAT64,
  steering_changes FLOAT64,
  throttle_min FLOAT64,
  throttle_max FLOAT64,
  throttle_mean FLOAT64,
  water_temp_min FLOAT64,
  water_temp_max FLOAT64,
  water_temp_mean FLOAT64,
  wheel_speed_min FLOAT64,
  wheel_speed_max FLOAT64,
  wheel_speed_mean FLOAT64,
  horn_usage_count INT64
) CLUSTER BY player_id, session_id, session_timestamp;

-- Create ai_analysis table
CREATE TABLE IF NOT EXISTS `data-connect-demo4.simulated_vehicle_data.ai_analysis` (
  player_id STRING NOT NULL,
  session_id STRING NOT NULL,
  session_timestamp TIMESTAMP NOT NULL,
  performance_summary STRING,
  dtc_codes STRING,
  dtc_analysis STRING,
  generation_timestamp TIMESTAMP NOT NULL
) CLUSTER BY player_id, session_id;

-- Create visualization_data table
CREATE TABLE IF NOT EXISTS `data-connect-demo4.simulated_vehicle_data.visualization_data` (
  player_id STRING NOT NULL,
  session_id STRING NOT NULL,
  graph_type STRING NOT NULL,
  title STRING,
  x_axis STRING,
  y_axis STRING,
  data STRING NOT NULL
) CLUSTER BY player_id, session_id;
```

**Note about BigQuery table design:**
- BigQuery doesn't support traditional primary keys or unique constraints
- Instead, we use clustering to optimize query performance for the columns we frequently filter on
- Ensure uniqueness through application logic when inserting data
- For player_id/session_id uniqueness, add logic in your backend before inserting:

```python
# Check if session already exists before inserting
def insert_with_uniqueness_check(table_id, row_data):
    client = bigquery.Client()
    
    # Check if a record with the same player_id and session_id exists
    query = f"""
    SELECT COUNT(*) as count 
    FROM `{config.PROJECT_ID}.{config.DATASET_ID}.{table_id}`
    WHERE player_id = '{row_data["player_id"]}' AND session_id = '{row_data["session_id"]}'
    """
    
    query_job = client.query(query)
    result = list(query_job.result())[0]
    
    if result.count > 0:
        # Record exists, update instead of insert
        logging.info(f"Record already exists, updating instead of inserting")
        # Implement update logic here if needed
        return False
    else:
        # Insert new record
        errors = client.insert_rows_json(
            f"{config.PROJECT_ID}.{config.DATASET_ID}.{table_id}", 
            [row_data]
        )
        return errors
```
```

## Step 2: Create Configuration File

Create a `config.py` file in your project root:

```python
import os
from pathlib import Path

# Project paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "telematics"

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)

# BigQuery Configuration
PROJECT_ID = "data-connect-demo4"
DATASET_ID = "simulated_vehicle_data"
LOCATION = "us-central1"

# BeamNG Configuration
BEAMNG_HOME = "C:/Program Files (x86)/Steam/steamapps/common/BeamNG.drive"
BEAMNG_USER = str(BASE_DIR / "user")

# Service Account Configuration
# Path to your service account key file
SERVICE_ACCOUNT_KEY_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", 
                                    str(BASE_DIR / "service-account-key.json"))

# If the key file exists, set the environment variable
if os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = SERVICE_ACCOUNT_KEY_PATH

# Application Configuration
DEBUG_MODE = True
API_PORT = 8000
API_HOST = "localhost"

# Vertex AI Models
SUMMARY_MODEL = "gemini-2.0-pro-exp-02-05"
DTC_MODEL = "gemini-2.0-flash-001"
```

## Step 3: Update Backend Files

1. Update `simulation_engine.py` to use configuration variables:

```python
# At the top of simulation_engine.py
import config

# Replace hardcoded paths with config values
beamng = BeamNGpy('localhost', 60152, home=config.BEAMNG_HOME, user=config.BEAMNG_USER)
```

2. Update `server.py` with the new endpoints and BigQuery integration code

## Step 4: Set Up React Frontend

1. Create a new React application:

```bash
npx create-react-app beamng-frontend
cd beamng-frontend
```

2. Install required dependencies:

```bash
npm install react-router-dom recharts
```

3. Create the folder structure:

```
src/
├── api/
│   └── apiService.js
├── components/
│   ├── ChatInterface.jsx
│   ├── DiagnosticReport.jsx
│   ├── Header.jsx
│   ├── LoadingIndicator.jsx
│   ├── LoginForm.jsx
│   ├── PerformanceCharts.jsx
│   ├── PerformanceSummary.jsx
│   ├── PlayerDashboard.jsx
│   ├── SessionSelector.jsx
│   └── VehicleReport.jsx
├── context/
│   └── AppContext.jsx
├── App.jsx
└── main.jsx
```

4. Implement all components as described in the previous code snippets

## Step 5: Configure API Service

In `src/api/apiService.js`, ensure proper API URL configuration:

```javascript
// Add at the top of the file
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Use this in all fetch calls
// For example:
const response = await fetch(`${API_BASE_URL}/player_sessions/${playerId}`);
```

## Step 6: Testing the Implementation

### Backend Testing

1. Start the backend server:

```bash
uvicorn server:app --reload
```

2. Test individual endpoints using curl or Postman:

```bash
# Test player sessions endpoint
curl http://localhost:8000/player_sessions/test_player

# Test session data endpoint
curl http://localhost:8000/session_data/test_player/test_session_id

# Test player statistics endpoint
curl http://localhost:8000/player_stats/test_player
```

### Frontend Testing

1. Start the React development server:

```bash
npm start
```

2. Testing sequence:

   a. Login with a test player ID
   
   b. Verify BeamNG.drive launches automatically
   
   c. Wait for the simulation to complete
   
   d. Check the summary report page loads with all visualizations
   
   e. Navigate to the dashboard to view player statistics
   
   f. Test the chat interface by asking questions about the simulation data

## Step 7: Troubleshooting Common Issues

### BeamNG Launch Issues

1. **BeamNG doesn't launch automatically**
   - Verify the installation path in `config.py`
   - Check BeamNG is installed and can be launched manually
   - Ensure the game isn't already running (only one instance can run at a time)
   - Check Windows firewall settings aren't blocking the connection

2. **BeamNG crashes during simulation**
   - Try lowering the graphics settings in BeamNG
   - Check if the scenario files are correctly placed in the user directory
   - Verify the vehicle configuration is valid

### BigQuery Connection Issues

1. **Permission errors when connecting to BigQuery**
   - Verify the service account key file exists and is valid
   - Check the service account has the required permissions (BigQuery Admin role)
   - Ensure the environment variable `GOOGLE_APPLICATION_CREDENTIALS` is set correctly

2. **Data uniqueness issues**
   - BigQuery doesn't enforce uniqueness constraints like traditional databases
   - If duplicate records appear, check the application logic in `insert_with_uniqueness_check()`
   - Use queries to identify and clean up duplicate records:
   ```sql
   -- Identify duplicates
   SELECT player_id, session_id, COUNT(*) as count
   FROM `data-connect-demo4.simulated_vehicle_data.analytics_summary`
   GROUP BY player_id, session_id
   HAVING COUNT(*) > 1
   ```

3. **Table creation issues**
   - Run the table creation SQL queries directly in BigQuery console
   - Check for any syntax errors in the SQL
   - Verify the project and dataset exist

### Frontend Connection Issues

1. **API connection errors**
   - Check the backend server is running
   - Verify the API_BASE_URL in the frontend matches the backend server address
   - Check for CORS errors in browser console (backend should allow CORS)

2. **React rendering issues**
   - Check console for JavaScript errors
   - Verify all dependencies are installed
   - Clear browser cache and reload

## Step 8: Integration Testing

To ensure the entire system works together properly, perform these integration tests:

1. **Full Session Flow Test**
   - Log in as a test player
   - Let BeamNG launch and complete a simulation
   - Verify data is stored in all three BigQuery tables
   - Check that the summary report displays correctly
   - Verify the dashboard shows session statistics

2. **Multiple Session Test**
   - Complete at least 3 sessions with the same player ID
   - Verify the dashboard shows trending data
   - Check that the session selector allows switching between sessions
   - Verify historical data loads correctly

3. **Chat Interaction Test**
   - Ask about specific aspects of driving performance
   - Query about DTC codes and their meaning
   - Test complex questions that require AI understanding of the data

## Step 9: Performance Optimization

Once basic functionality is working, consider these optimizations:

1. **Backend Caching**
   - Add caching for frequently accessed data:

```python
# Add to server.py
from fastapi.responses import JSONResponse
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost", encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

# Then decorate read-only endpoints
@app.get("/player_stats/{player_id}")
@cache(expire=300)  # Cache for 5 minutes
async def get_player_stats(player_id: str):
    # Existing implementation
```

2. **Frontend Optimizations**
   - Implement lazy loading for components:

```javascript
// In App.jsx, use lazy loading for less frequently used components
import { lazy, Suspense } from 'react';

const PlayerDashboard = lazy(() => import('./components/PlayerDashboard'));
const VehicleReport = lazy(() => import('./components/VehicleReport'));

// Then in the Routes
<Routes>
  <Route 
    path="/dashboard" 
    element={
      <Suspense fallback={<div>Loading...</div>}>
        {playerId ? <PlayerDashboard /> : <Navigate to="/" />}
      </Suspense>
    } 
  />
  {/* Similar pattern for other routes */}
</Routes>
```

## Step 10: Deployment Options

### Local Deployment

For local testing and development:

```bash
# Start backend
uvicorn server:app --host 0.0.0.0 --port 8000

# Build and serve frontend
npm run build
npx serve -s build
```

### Cloud Deployment

For production deployment:

1. **Backend on Cloud Run**
   - Create a Dockerfile for the backend:

```dockerfile
FROM python:3.9

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
```

   - Build and deploy to Cloud Run:

```bash
gcloud builds submit --tag gcr.io/data-connect-demo4/beamng-backend
gcloud run deploy beamng-backend --image gcr.io/data-connect-demo4/beamng-backend --platform managed
```

2. **Frontend on Firebase Hosting**
   - Install Firebase tools:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

   - Build and deploy:

```bash
npm run build
firebase deploy --only hosting
```

## Step 11: Alternative Architectures

For distributed environments or when BeamNG.drive cannot be installed on the server:

1. **Agent-Based Architecture**
   - Create a local agent that runs on the user's computer
   - The agent launches BeamNG.drive and collects data
   - Data is sent to the cloud backend for processing and storage
   - Frontend retrieves data from the cloud backend

2. **Simulation Server Farm**
   - Deploy multiple instances of BeamNG.drive on dedicated servers
   - Use a queue system to distribute simulation requests
   - Process and store results centrally
   - Scale servers based on demand

## Conclusion

This implementation combines:

1. **BeamNG.drive** for realistic vehicle simulation
2. **BigQuery** for scalable data storage and analysis
3. **Vertex AI** for intelligent insights from simulation data
4. **React** for a responsive and interactive frontend

By following this guide, you should have a fully functional BeamNG.drive simulation application with state persistence, historical data viewing, and AI-powered insights.

Remember to adapt the paths, project IDs, and other configuration values to match your specific environment. Happy testing!

## Additional Resources

- [BeamNG.drive Documentation](https://documentation.beamng.com/)
- [BeamNGpy GitHub Repository](https://github.com/BeamNG/BeamNGpy)
- [Google Cloud BigQuery Documentation](https://cloud.google.com/bigquery/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [React Documentation](https://reactjs.org/docs/getting-started.html)