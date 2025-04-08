from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
import logging
import json
import os
from google.cloud import bigquery
import config  # Import the config module



from pydantic import BaseModel
import logging

# Chat functionality
class ChatMessage(BaseModel):
    message: str
    player_id: str

# Store chat sessions
chat_sessions = {}


# Configure logging
logging.basicConfig(level=logging.DEBUG, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("react_server")

# Use a different FastAPI instance approach to avoid route conflicts
app = FastAPI(
    # Disable automatic API docs to prevent HTML responses
    docs_url=None,
    redoc_url=None,
)

# Path to React app build directory
REACT_UI_DIR = "frontend/build"

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001", 
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Content-Length"]
)

# Mount static files
if os.path.exists(REACT_UI_DIR):
    logger.info(f"Mounting static files from {REACT_UI_DIR}")
    if os.path.exists(f"{REACT_UI_DIR}/static"):
        app.mount("/static", StaticFiles(directory=f"{REACT_UI_DIR}/static"), name="static")
    if os.path.exists(f"{REACT_UI_DIR}/assets"):
        app.mount("/assets", StaticFiles(directory=f"{REACT_UI_DIR}/assets"), name="assets")
    # Add manifest.json serving
    if os.path.exists(f"{REACT_UI_DIR}/manifest.json"):
        logger.info("Mounting manifest.json")
        app.mount("/manifest.json", StaticFiles(directory=f"{REACT_UI_DIR}", html=False), name="manifest")
else:
    logger.warning(f"React build directory not found: {REACT_UI_DIR}")

# API Endpoints - explicitly set response_class=JSONResponse
@app.get("/api/health", response_class=JSONResponse)
async def health_check():
    logger.info("Health check endpoint called")
    try:
        # Get the most recent player information
        client = bigquery.Client()
        player_query = f"""
        WITH ranked_sessions AS (
            SELECT 
                player_id,
                session_timestamp,
                ROW_NUMBER() OVER (ORDER BY session_timestamp DESC) as row_num
            FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        )
        SELECT player_id
        FROM ranked_sessions
        WHERE row_num = 1
        """
        
        player_job = client.query(player_query)
        player_results = list(player_job.result())
        
        latest_player = "No players found" if not player_results else player_results[0].player_id
        
        return {"status": "healthy", "server": "react-frontend", "latest_player": latest_player}
    except Exception as e:
        logger.error(f"Error retrieving player info: {str(e)}")
        return {"status": "healthy", "server": "react-frontend", "latest_player": "Error retrieving player"}


@app.get("/api/players", response_class=JSONResponse)
async def get_all_players():
    logger.info("Get all players endpoint called")
    try:
        client = bigquery.Client()
        query = f"""
        SELECT DISTINCT player_id, MAX(session_timestamp) as last_session
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        GROUP BY player_id
        ORDER BY last_session DESC
        """
        
        query_job = client.query(query)
        results = query_job.result()
        
        players = []
        for row in results:
            players.append({
                "player_id": row.player_id,
                "last_session": row.last_session.isoformat() if hasattr(row.last_session, 'isoformat') else str(row.last_session)
            })
        
        return {"players": players}
    except Exception as e:
        logger.error(f"Error retrieving players: {str(e)}")
        return {"players": []}



# Update the get_player_dashboard function in react_server.py to correctly retrieve wheel speed max

@app.get("/api/refresh-dashboard", response_class=JSONResponse)
async def refresh_dashboard_data():
    """
    Force a refresh of dashboard data by querying the latest data from BigQuery
    """
    logger.info("Dashboard refresh endpoint called")
    try:
        client = bigquery.Client()
        
        # Get the most recent player ID
        player_query = f"""
        WITH ranked_sessions AS (
            SELECT 
                player_id,
                session_timestamp,
                ROW_NUMBER() OVER (ORDER BY session_timestamp DESC) as row_num
            FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        )
        SELECT player_id
        FROM ranked_sessions
        WHERE row_num = 1
        """
        
        player_job = client.query(player_query)
        player_results = list(player_job.result())
        
        if not player_results:
            logger.warning("No players found during refresh")
            return JSONResponse(
                content={"status": "error", "message": "No player data available"},
                status_code=404
            )
        
        most_recent_player = player_results[0].player_id
        logger.info(f"Found most recent player: {most_recent_player}")
        
        # Get the latest session for this player
        session_query = f"""
        SELECT session_id, session_timestamp 
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        WHERE player_id = '{most_recent_player}'
        ORDER BY session_timestamp DESC
        LIMIT 1
        """
        
        session_job = client.query(session_query)
        session_results = list(session_job.result())
        
        if not session_results:
            logger.warning(f"No sessions found for player {most_recent_player}")
            return JSONResponse(
                content={"status": "error", "message": f"No sessions found for player {most_recent_player}"},
                status_code=404
            )
        
        latest_session = session_results[0].session_id
        latest_timestamp = session_results[0].session_timestamp
        
        # Clear any cached data (if you implement caching in the future)
        # cache.clear()
        
        return JSONResponse(content={
            "status": "success", 
            "message": "Dashboard data refreshed successfully",
            "player_id": most_recent_player,
            "latest_session_id": latest_session,
            "timestamp": latest_timestamp.isoformat() if hasattr(latest_timestamp, 'isoformat') else str(latest_timestamp)
        })
        
    except Exception as e:
        logger.error(f"Error refreshing dashboard data: {str(e)}")
        return JSONResponse(
            content={"status": "error", "message": f"Failed to refresh data: {str(e)}"},
            status_code=500
        )



@app.get("/api/latest_dashboard/{player_id}", response_class=JSONResponse)
async def get_player_dashboard(player_id: str):
    """
    Get dashboard data for a specific player with improved error handling
    and proper data parsing
    """
    logger.info(f"Dashboard endpoint called for player: {player_id}")
    try:
        client = bigquery.Client()
        
        # Check if this player exists
        check_query = f"""
        SELECT COUNT(*) as count
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        WHERE player_id = '{player_id}'
        """
        
        check_job = client.query(check_query)
        check_result = list(check_job.result())[0]
        
        if check_result.count == 0:
            logger.warning(f"No records found for player: {player_id}")
            return JSONResponse(
                content={"error": f"No data available for player {player_id}"},
                status_code=404
            )
        
        # Get the latest part damage for visualization
        damage_query = f"""
        SELECT part_damage
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        WHERE player_id = '{player_id}'
        ORDER BY session_timestamp DESC
        LIMIT 1
        """
        
        damage_job = client.query(damage_query)
        damage_results = list(damage_job.result())
        
        latest_damage = None
        if damage_results and hasattr(damage_results[0], 'part_damage'):
            latest_damage = damage_results[0].part_damage
            
            # Try to parse JSON if it's a string
            if isinstance(latest_damage, str):
                try:
                    import json
                    latest_damage = json.loads(latest_damage)
                except json.JSONDecodeError:
                    logger.error(f"Error parsing damage data JSON: {latest_damage}")
                    latest_damage = {}
        
        # Get the player stats with proper field handling
        # Get the player stats with proper field handling
        query = f"""
        WITH SessionStats AS (
        SELECT
            session_id,
            session_timestamp,
            CAST(total_time_secs AS FLOAT64) as total_time_secs,
            CAST(accX_mean AS FLOAT64) as accX_mean,
            CAST(accY_mean AS FLOAT64) as accY_mean,
            CAST(accZ_mean AS FLOAT64) as accZ_mean,
            CAST(brake_usage_count AS INT64) as brake_usage_count,
            CAST((fuel_start - fuel_end) AS FLOAT64) AS fuel_consumption,
            ARRAY_LENGTH(JSON_EXTRACT_ARRAY(gears_used)) AS unique_gears_count,
            CAST(rpm_max AS FLOAT64) as rpm_max,
            CAST(wheel_speed_max AS FLOAT64) as wheel_speed_max,
            CAST(speed_kmh_max AS FLOAT64) as speed_kmh_max,
            CAST(speed_kmh_min AS FLOAT64) as speed_kmh_min,
            CAST(speed_kmh_mean AS FLOAT64) as speed_kmh_mean,
            CAST(horn_usage_count AS INT64) as horn_usage_count
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        WHERE player_id = '{player_id}'
        )
        SELECT
            COUNT(session_id) AS total_sessions,
            SUM(total_time_secs) AS total_driving_time,
            AVG(total_time_secs) AS avg_session_time,
            AVG(fuel_consumption) AS avg_fuel_consumption,
            AVG(brake_usage_count) AS avg_brake_usage,
            MAX(wheel_speed_max) AS top_speed_ever,
            AVG(wheel_speed_max) AS avg_top_speed,
            MAX(rpm_max) AS max_rpm_ever,
            AVG(unique_gears_count) AS avg_gears_used,
            SUM(horn_usage_count) AS total_horn_usage,
            MAX(speed_kmh_max) AS speed_kmh_max,
            MIN(speed_kmh_min) AS speed_kmh_min,
            AVG(speed_kmh_mean) AS speed_kmh_mean,
            (SELECT session_id FROM SessionStats ORDER BY session_timestamp DESC LIMIT 1) AS most_recent_session_id,
            (SELECT wheel_speed_max FROM SessionStats ORDER BY session_timestamp DESC LIMIT 1) AS wheel_speed_max,
            (SELECT speed_kmh_max FROM SessionStats ORDER BY session_timestamp DESC LIMIT 1) AS latest_speed_kmh_max,
            (SELECT accX_mean FROM SessionStats ORDER BY session_timestamp DESC LIMIT 1) AS accX_mean,
            (SELECT accY_mean FROM SessionStats ORDER BY session_timestamp DESC LIMIT 1) AS accY_mean,
            (SELECT accZ_mean FROM SessionStats ORDER BY session_timestamp DESC LIMIT 1) AS accZ_mean,
            (SELECT brake_usage_count FROM SessionStats ORDER BY session_timestamp DESC LIMIT 1) AS brake_usage_count
        FROM SessionStats
        """
        
        query_job = client.query(query)
        results = query_job.result()
        
        # Process the results with proper type handling
        stats = None
        for row in results:
            stats = {
            "total_sessions": int(row.total_sessions) if row.total_sessions is not None else 0,
            "total_driving_time": float(row.total_driving_time) if row.total_driving_time is not None else 0.0,
            "avg_session_time": float(row.avg_session_time) if row.avg_session_time is not None else 0.0,
            "avg_fuel_consumption": float(row.avg_fuel_consumption) if row.avg_fuel_consumption is not None else 0.0,
            "avg_brake_usage": float(row.avg_brake_usage) if row.avg_brake_usage is not None else 0.0,
            "top_speed_ever": float(row.top_speed_ever) if row.top_speed_ever is not None else 0.0,
            "avg_top_speed": float(row.avg_top_speed) if row.avg_top_speed is not None else 0.0,
            "max_rpm_ever": float(row.max_rpm_ever) if row.max_rpm_ever is not None else 0.0,
            "avg_gears_used": float(row.avg_gears_used) if row.avg_gears_used is not None else 0.0,
            "total_horn_usage": int(row.total_horn_usage) if row.total_horn_usage is not None else 0,
            "most_recent_session_id": row.most_recent_session_id,
            "wheel_speed_max": float(row.wheel_speed_max) if row.wheel_speed_max is not None else 0.0,
            "speed_kmh_max": float(row.speed_kmh_max) if row.speed_kmh_max is not None else 0.0,
            "speed_kmh_min": float(row.speed_kmh_min) if row.speed_kmh_min is not None else 0.0,
            "speed_kmh_mean": float(row.speed_kmh_mean) if row.speed_kmh_mean is not None else 0.0,
            "latest_speed_kmh_max": float(row.latest_speed_kmh_max) if hasattr(row, 'latest_speed_kmh_max') and row.latest_speed_kmh_max is not None else 0.0,
            "accX_mean": float(row.accX_mean) if row.accX_mean is not None else 0.0,
            "accY_mean": float(row.accY_mean) if row.accY_mean is not None else 0.0,
            "accZ_mean": float(row.accZ_mean) if row.accZ_mean is not None else 0.0,
            "brake_usage_count": int(row.brake_usage_count) if row.brake_usage_count is not None else 0,
            "latest_part_damage": latest_damage
        }
        
        if not stats:
            logger.warning(f"No statistics generated for player: {player_id}")
            return JSONResponse(
                content={"error": f"Failed to process data for player {player_id}"},
                status_code=500
            )
        
        # Get detailed trend data for all sessions
        trend_query = f"""
        SELECT
            session_id,
            session_timestamp,
            CAST(wheel_speed_max AS FLOAT64) as top_speed,
            CAST(speed_kmh_max AS FLOAT64) as speed_kmh,
            CAST(brake_usage_count AS INT64) as brake_usage_count,
            CAST((fuel_start - fuel_end) AS FLOAT64) as fuel_consumption,
            CAST(accX_mean AS FLOAT64) as accX_mean,
            CAST(accY_mean AS FLOAT64) as accY_mean,
            CAST(accZ_mean AS FLOAT64) as accZ_mean,
            CAST(rpm_max AS FLOAT64) as rpm_max,
            CAST(steering_changes AS FLOAT64) as steering_changes
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        WHERE player_id = '{player_id}'
        ORDER BY session_timestamp ASC
        """
        
        trend_job = client.query(trend_query)
        trend_results = list(trend_job.result())
        
        trend_data = []
        for row in trend_results:
            trend_data.append({
            "session_id": row.session_id,
            "timestamp": row.session_timestamp.isoformat() if hasattr(row.session_timestamp, 'isoformat') else str(row.session_timestamp),
            "top_speed": float(row.top_speed) if row.top_speed is not None else 0.0,
            "speed_kmh": float(row.speed_kmh) if hasattr(row, 'speed_kmh') and row.speed_kmh is not None else 0.0,
            "brake_usage_count": int(row.brake_usage_count) if row.brake_usage_count is not None else 0,
            "fuel_consumption": float(row.fuel_consumption) if row.fuel_consumption is not None else 0.0,
            "accX_mean": float(row.accX_mean) if row.accX_mean is not None else 0.0,
            "accY_mean": float(row.accY_mean) if row.accY_mean is not None else 0.0,
            "accZ_mean": float(row.accZ_mean) if row.accZ_mean is not None else 0.0,
            "rpm_max": float(row.rpm_max) if row.rpm_max is not None else 0.0,
            "steering_changes": float(row.steering_changes) if row.steering_changes is not None else 0.0
        })
        
        stats["trend_data"] = trend_data
        
        # Get the most recent AI analysis
        analysis_query = f"""
        SELECT performance_summary, dtc_analysis
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.ai_analysis`
        WHERE player_id = '{player_id}'
        ORDER BY session_timestamp DESC
        LIMIT 1
        """
        
        analysis_job = client.query(analysis_query)
        analysis_results = list(analysis_job.result())
        
        if analysis_results:
            stats["ai_insights"] = {
                "performance_summary": analysis_results[0].performance_summary,
                "dtc_analysis": analysis_results[0].dtc_analysis
            }
        else:
            # Create default insights based on the statistical data
            default_insights = ""
            if float(stats["wheel_speed_max"]) > 50:
                default_insights += "You've achieved a good top speed. "
            if int(stats["brake_usage_count"]) < 5:
                default_insights += "Your limited brake usage suggests smooth driving. "
            if float(stats["avg_fuel_consumption"]) < 0.2:
                default_insights += "Your fuel efficiency is good. "
            else:
                default_insights += "Try to improve your fuel efficiency by smoother acceleration. "
                
            stats["ai_insights"] = {
                "performance_summary": default_insights,
                "dtc_analysis": "No detailed diagnostic analysis available. Run a new simulation for in-depth analysis."
            }
        
        logger.info(f"Successfully retrieved dashboard data for player {player_id}")
        return JSONResponse(content=stats)
            
    except Exception as e:
        logger.error(f"Error retrieving dashboard data for player {player_id}: {str(e)}")
        return JSONResponse(
            content={"error": f"Failed to retrieve data: {str(e)}"},
            status_code=500
        )



# Add this endpoint to your react_server.py file, before the catch-all route that serves the React app

@app.get("/api/visualization_data/{player_id}", response_class=JSONResponse)
async def get_visualization_data(player_id: str, session_id: str = None):
    logger.info(f"Visualization data endpoint called for player: {player_id}, session: {session_id}")
    try:
        client = bigquery.Client()
        
        # Build the query based on whether a session_id was provided
        if session_id:
            query = f"""
            SELECT 
                graph_type, 
                title,
                x_axis,
                y_axis,
                data 
            FROM `{config.PROJECT_ID}.{config.DATASET_ID}.visualization_data`
            WHERE player_id = '{player_id}' AND session_id = '{session_id}'
            """
        else:
            # If no session_id provided, get the most recent session
            query = f"""
            WITH latest_session AS (
                SELECT session_id
                FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary` 
                WHERE player_id = '{player_id}'
                ORDER BY session_timestamp DESC
                LIMIT 1
            )
            SELECT 
                graph_type, 
                title,
                x_axis,
                y_axis,
                data 
            FROM `{config.PROJECT_ID}.{config.DATASET_ID}.visualization_data`
            WHERE player_id = '{player_id}' 
            AND session_id = (SELECT session_id FROM latest_session)
            """
        
        query_job = client.query(query)
        results = list(query_job.result())
        
        if not results:
            logger.warning(f"No visualization data found for player: {player_id}")
            return JSONResponse(
                content={"error": f"No visualization data available for player {player_id}"},
                status_code=404
            )
        
        # Process the visualization data
        charts = []
        for row in results:
            # Parse the JSON data string to a Python object
            try:
                chart_data = json.loads(row.data) if isinstance(row.data, str) else row.data
            except json.JSONDecodeError:
                logger.error(f"Error parsing chart data JSON: {row.data}")
                chart_data = []
            
            charts.append({
                "graph_type": row.graph_type,
                "title": row.title,
                "x_axis": row.x_axis,
                "y_axis": row.y_axis,
                "data": chart_data
            })
        
        return JSONResponse(content={"charts": charts})
            
    except Exception as e:
        logger.error(f"Error retrieving visualization data: {str(e)}")
        return JSONResponse(
            content={"error": f"Failed to retrieve visualization data: {str(e)}"},
            status_code=500
        )


@app.get("/api/latest_dashboard", response_class=JSONResponse)
async def get_latest_dashboard():
    logger.info("Latest dashboard endpoint called")
    try:
        client = bigquery.Client()
        
        # Query to get the most recent player ID
        query = f"""
        WITH ranked_sessions AS (
            SELECT 
                player_id,
                session_timestamp,
                ROW_NUMBER() OVER (ORDER BY session_timestamp DESC) as row_num
            FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        )
        SELECT player_id
        FROM ranked_sessions
        WHERE row_num = 1
        """
        
        query_job = client.query(query)
        results = list(query_job.result())
        
        if not results:
            logger.warning("No players found")
            return JSONResponse(
                content={"error": "No player data available"},
                status_code=404
            )
        
        most_recent_player = results[0].player_id
        logger.info(f"Redirecting to most recent player: {most_recent_player}")
        
        # Use the player-specific endpoint
        return await get_player_dashboard(most_recent_player)
    
    except Exception as e:
        logger.error(f"Error retrieving most recent player: {str(e)}")
        return JSONResponse(
            content={"error": f"Failed to retrieve data: {str(e)}"},
            status_code=500
        )

@app.get("/api/latest_report", response_class=JSONResponse)
async def get_latest_report():
    logger.info("Latest report endpoint called")
    try:
        client = bigquery.Client()
        
        # Extremely simplified response just to get it working
        return JSONResponse(content={
            "generated_text": "Performance analysis report. Run a simulation using the original UI at http://localhost:8000 to see detailed performance analysis.",
            "player_id": "simplified",
            "session_id": "simplified",
            "graphs": [
                {
                    "graph_type": "line",
                    "title": "No Data Available",
                    "x_axis": "Time",
                    "y_axis": "Value",
                    "data": []
                }
            ],
            "dtc_response": "No diagnostic data available.",
            "dtc_codes": [],
            "summary_stats": {
                "Total Time (secs)": 0,
                "Wheel Speed Stats": {"min": 0, "max": 0, "mean": 0},
                "Brake Usage Count": 0,
                "Fuel Start": 0,
                "Fuel End": 0
            }
        })
        
    except Exception as e:
        logger.error(f"Error in minimal report: {str(e)}")
        return JSONResponse(
            content={
                "generated_text": "Error retrieving data. Please run a simulation using the original UI at http://localhost:8000.",
                "player_id": "error",
                "session_id": "error",
                "graphs": [],
                "dtc_response": "",
                "dtc_codes": [],
                "summary_stats": {}
            }
        )

# @app.get("/api/latest_report", response_class=JSONResponse)
# async def get_latest_report():
#     logger.info("Latest report endpoint called")
#     try:
#         client = bigquery.Client()
        
#         # Check if we have any data in the tables
#         check_query = f"""
#         SELECT COUNT(*) as count
#         FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
#         """
        
#         check_job = client.query(check_query)
#         check_result = list(check_job.result())[0]
        
#         if check_result.count == 0:
#             logger.info("No data found in analytics_summary table")
#             # Return empty report data
#             return JSONResponse(content={
#                 "generated_text": "No data available yet. Please run a simulation first using the original UI at http://localhost:8000.",
#                 "player_id": "no_data",
#                 "session_id": "no_data",
#                 "graphs": [
#                     {
#                         "graph_type": "line",
#                         "title": "No Data Available",
#                         "x_axis": "Time",
#                         "y_axis": "Value",
#                         "data": []
#                     }
#                 ],
#                 "dtc_response": "No diagnostic data available. Please run a simulation first.",
#                 "dtc_codes": [],
#                 "summary_stats": {
#                     "Total Time (secs)": 0,
#                     "Wheel Speed Stats": {"min": 0, "max": 0, "mean": 0},
#                     "Brake Usage Count": 0,
#                     "Fuel Start": 0,
#                     "Fuel End": 0
#                 }
#             })
        
#         # Get the most recent session - using fixed query pattern
#         session_query = f"""
#         WITH ranked_sessions AS (
#             SELECT 
#                 player_id,
#                 session_id,
#                 session_timestamp,
#                 ROW_NUMBER() OVER (ORDER BY session_timestamp DESC) as row_num
#             FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
#         )
#         SELECT player_id, session_id
#         FROM ranked_sessions
#         WHERE row_num = 1
#         """
        
#         session_job = client.query(session_query)
#         session_results = list(session_job.result())
        
#         if not session_results:
#             logger.warning("No sessions found despite having records")
#             return JSONResponse(content={
#                 "generated_text": "No sessions found in the database.",
#                 "player_id": "error",
#                 "session_id": "error",
#                 "graphs": [],
#                 "dtc_response": "",
#                 "dtc_codes": "",
#                 "summary_stats": {}
#             })
        
#         latest_session = session_results[0].session_id
#         player_id = session_results[0].player_id
        
#         logger.info(f"Found latest session {latest_session} for player {player_id}")
        
#         # Get the performance summary from AI analysis table
#         summary_query = f"""
#         SELECT performance_summary, dtc_codes, dtc_analysis
#         FROM `{config.PROJECT_ID}.{config.DATASET_ID}.ai_analysis`
#         WHERE player_id = '{player_id}' AND session_id = '{latest_session}'
#         """
        
#         summary_job = client.query(summary_query)
#         summary_results = list(summary_job.result())
        
#         if not summary_results:
#             logger.warning(f"No AI analysis found for session {latest_session}")
#             # We found a session but no associated AI analysis
#             return JSONResponse(content={
#                 "generated_text": "Session data found, but no AI analysis available. Please run a new simulation.",
#                 "player_id": player_id,
#                 "session_id": latest_session,
#                 "graphs": [
#                     {
#                         "graph_type": "line",
#                         "title": "No Analysis Available",
#                         "x_axis": "Time",
#                         "y_axis": "Value",
#                         "data": []
#                     }
#                 ],
#                 "dtc_response": "No diagnostic data available.",
#                 "dtc_codes": [],
#                 "summary_stats": {
#                     "Total Time (secs)": 0,
#                     "Wheel Speed Stats": {"min": 0, "max": 0, "mean": 0}
#                 }
#             })
        
#         # Get the AI analysis data - ensure it's properly serializable
#         ai_data = {
#             "generated_text": str(summary_results[0].performance_summary),
#             "dtc_codes": str(summary_results[0].dtc_codes),
#             "dtc_response": str(summary_results[0].dtc_analysis)
#         }
        
#         # Get the analytics summary
#         analytics_query = f"""
#         SELECT * 
#         FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
#         WHERE player_id = '{player_id}' AND session_id = '{latest_session}'
#         """
        
#         analytics_job = client.query(analytics_query)
#         analytics_results = list(analytics_job.result())
        
#         if not analytics_results:
#             logger.warning(f"No analytics summary found for session {latest_session}")
#             return JSONResponse(content={
#                 "generated_text": ai_data["generated_text"],
#                 "player_id": player_id,
#                 "session_id": latest_session,
#                 "graphs": [],
#                 "dtc_response": ai_data["dtc_response"],
#                 "dtc_codes": ai_data["dtc_codes"],
#                 "summary_stats": {}
#             })
        
#         # Convert to dict and process complex fields
#         summary_stats = {}
#         for column, value in analytics_results[0].items():
#             # Handle None values and convert to appropriate types
#             if value is None:
#                 summary_stats[column] = 0 if column.endswith('_min') or column.endswith('_max') or column.endswith('_mean') else ""
#             else:
#                 summary_stats[column] = value
        
#         # Handle special JSON fields
#         for field in ['gears_used', 'gear_change_details', 'part_damage']:
#             if field in summary_stats and summary_stats[field]:
#                 try:
#                     if isinstance(summary_stats[field], str):
#                         # Try to parse as JSON
#                         parsed_value = json.loads(summary_stats[field])
#                         summary_stats[field] = parsed_value
#                     # If it's not a string, keep as is
#                 except json.JSONDecodeError:
#                     # If parsing fails, convert to string representation
#                     summary_stats[field] = str(summary_stats[field])
        
#         # Structure the summary stats in the expected format
#         formatted_stats = {
#             "Total Time (secs)": float(summary_stats.get("total_time_secs", 0)),
#             "Acceleration X (mean)": float(summary_stats.get("accX_mean", 0)),
#             "Acceleration Y (mean)": float(summary_stats.get("accY_mean", 0)),
#             "Acceleration Z (mean)": float(summary_stats.get("accZ_mean", 0)),
#             "Brake Usage Count": int(summary_stats.get("brake_usage_count", 0)),
#             "Brake Average": float(summary_stats.get("brake_average", 0)),
#             "Fuel Start": float(summary_stats.get("fuel_start", 0)),
#             "Fuel End": float(summary_stats.get("fuel_end", 0)),
#             "Gears Used": summary_stats.get("gears_used", []),
#             "Gear Change Details": summary_stats.get("gear_change_details", []),
#             "Oil Temperature Stats": {
#                 "min": float(summary_stats.get("oil_temp_min", 0)),
#                 "max": float(summary_stats.get("oil_temp_max", 0)),
#                 "mean": float(summary_stats.get("oil_temp_mean", 0))
#             },
#             "Part Damage": summary_stats.get("part_damage", {}),
#             "RPM Stats": {
#                 "min": float(summary_stats.get("rpm_min", 0)),
#                 "max": float(summary_stats.get("rpm_max", 0)),
#                 "mean": float(summary_stats.get("rpm_mean", 0))
#             },
#             "Steering Changes": float(summary_stats.get("steering_changes", 0)),
#             "Throttle Stats": {
#                 "min": float(summary_stats.get("throttle_min", 0)),
#                 "max": float(summary_stats.get("throttle_max", 0)),
#                 "mean": float(summary_stats.get("throttle_mean", 0))
#             },
#             "Water Temperature Stats": {
#                 "min": float(summary_stats.get("water_temp_min", 0)),
#                 "max": float(summary_stats.get("water_temp_max", 0)),
#                 "mean": float(summary_stats.get("water_temp_mean", 0))
#             },
#             "Wheel Speed Stats": {
#                 "min": float(summary_stats.get("wheel_speed_min", 0)),
#                 "max": float(summary_stats.get("wheel_speed_max", 0)),
#                 "mean": float(summary_stats.get("wheel_speed_mean", 0))
#             },
#             "Horn Usage Count": int(summary_stats.get("horn_usage_count", 0))
#         }
        
#         # Create default empty graphs
#         default_graphs = [
#             {
#                 "graph_type": "line",
#                 "title": "No Graph Data Available",
#                 "x_axis": "Time",
#                 "y_axis": "Value",
#                 "data": []
#             }
#         ]
        
#         # Create a simplified hard-coded response for testing
#         test_response = {
#             "generated_text": ai_data["generated_text"],
#             "player_id": player_id,
#             "session_id": latest_session,
#             "graphs": default_graphs,
#             "dtc_response": ai_data["dtc_response"],
#             "dtc_codes": ai_data["dtc_codes"],
#             "summary_stats": formatted_stats
#         }
        
#         logger.info(f"Returning simplified report for session {latest_session}")
#         return JSONResponse(content=test_response)
        
#     except Exception as e:
#         logger.error(f"Error retrieving report data: {str(e)}")
#         return JSONResponse(
#             content={
#                 "generated_text": f"Error retrieving data: {str(e)}. Please run a simulation using the original UI at http://localhost:8000.",
#                 "player_id": "error",
#                 "session_id": "error",
#                 "graphs": [
#                     {
#                         "graph_type": "line",
#                         "title": "Error Retrieving Data",
#                         "x_axis": "Time",
#                         "y_axis": "Value",
#                         "data": []
#                     }
#                 ],
#                 "dtc_response": "Error retrieving diagnostic data.",
#                 "dtc_codes": [],
#                 "summary_stats": {
#                     "Total Time (secs)": 0,
#                     "Wheel Speed Stats": {"min": 0, "max": 0, "mean": 0}
#                 }
#             }
#         )
    




@app.post("/api/chat", response_class=JSONResponse)
async def chat_endpoint(chat_message: ChatMessage):
    logger.info(f"Chat endpoint called for player: {chat_message.player_id}")
    try:
        player_id = chat_message.player_id
        message = chat_message.message

        # Check if player exists
        client = bigquery.Client()
        check_query = f'''
        SELECT COUNT(*) as count
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        WHERE player_id = '{player_id}'
        '''

        check_job = client.query(check_query)
        check_result = list(check_job.result())[0]

        if check_result.count == 0:
            logger.warning(f"No records found for player: {player_id}")
            return JSONResponse(
                content={"response": f"No data available for player {player_id}. Please run a simulation first."},
                status_code=404
            )

        # Get player data
        data_query = f'''
        SELECT *
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        WHERE player_id = '{player_id}'
        ORDER BY session_timestamp DESC
        LIMIT 1
        '''

        data_job = client.query(data_query)
        data_results = list(data_job.result())

        if not data_results:
            return JSONResponse(
                content={"response": "No data found for this player. Please run a simulation first."},
                status_code=404
            )

        # Get DTC codes
        dtc_query = f'''
        SELECT dtc_codes
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.ai_analysis`
        WHERE player_id = '{player_id}'
        ORDER BY session_timestamp DESC
        LIMIT 1
        '''

        dtc_job = client.query(dtc_query)
        dtc_results = list(dtc_job.result())

        dtc_codes = ""
        if dtc_results and hasattr(dtc_results[0], 'dtc_codes'):
            dtc_codes = dtc_results[0].dtc_codes

        # Convert BigQuery row to dict for easier handling
        stats = {}
        for key, value in data_results[0].items():
            stats[key] = value

        # Initialize Vertex AI
        from vertexai.preview.generative_models import GenerativeModel
        import vertexai

        # Initialize Vertex AI with project and location from config
        vertexai.init(project=config.PROJECT_ID, location=config.LOCATION)

        # Create a new chat session for each request to avoid state issues
        model = GenerativeModel("gemini-2.0-flash-001")
        chat = model.start_chat(history=[])

        # Send context message with each request
        context_message = f'''For the vehicle with player_id: {player_id}, the statistics are as follows:

        {stats}

        The DTC codes are: {dtc_codes}

        Based on the above statistics and DTC codes, help user with their queries. Respond in Plain Text, Strictly No Markdown or HTML.
        '''

        logger.info("Sending context message to chat model")
        chat.send_message(context_message)

        # Send user message and get response
        response = chat.send_message(
            message,
            generation_config={
                "max_output_tokens": 2048,
                "temperature": 0,
                "top_p": 1
            },
            stream=False,
        )

        return JSONResponse(content={"response": response.text})

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return JSONResponse(
            content={"response": f"An error occurred: {str(e)}. Please try again later."},
            status_code=500
        )




# Root endpoint to serve React app's index.html
@app.get("/", response_class=FileResponse)
async def serve_root():
    logger.info("Root path requested, serving index.html")
    if os.path.exists(f"{REACT_UI_DIR}/index.html"):
        return FileResponse(f"{REACT_UI_DIR}/index.html")
    else:
        logger.error("React UI not built yet")
        return JSONResponse(
            status_code=404,
            content={"detail": "React UI not built yet"}
        )

# Handle all routes to serve React app for SPA routing
@app.get("/{full_path:path}", response_class=FileResponse)
async def serve_react(full_path: str):
    logger.info(f"Path requested: {full_path}")
    
    # If path starts with api/, return a 404 error
    if full_path.startswith("api/"):
        logger.warning(f"API path not found: {full_path}")
        return JSONResponse(
            status_code=404,
            content={"detail": f"API endpoint /{full_path} not found"}
        )
    
    # Serve React's index.html for client-side routing
    if os.path.exists(f"{REACT_UI_DIR}/index.html"):
        logger.info(f"Serving index.html for path: {full_path}")
        return FileResponse(f"{REACT_UI_DIR}/index.html")
    else:
        logger.error("React UI not built yet")
        return JSONResponse(
            status_code=404,
            content={"detail": "React UI not built yet"}
        )

# Custom exception handler to prevent HTML error pages
@app.exception_handler(404)
async def custom_404_handler(request, exc):
    logger.warning(f"404 Not Found: {request.url}")
    if str(request.url).startswith(f"{request.base_url}api/"):
        return JSONResponse(
            status_code=404, 
            content={"detail": f"API endpoint {request.url} not found"}
        )
    return FileResponse(f"{REACT_UI_DIR}/index.html") if os.path.exists(f"{REACT_UI_DIR}/index.html") else JSONResponse(
        status_code=404,
        content={"detail": "Not found"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    # Run on a different port than the main server
    logger.info("Starting React server on port 3001")
    uvicorn.run(app, host="0.0.0.0", port=3001, log_level="debug")