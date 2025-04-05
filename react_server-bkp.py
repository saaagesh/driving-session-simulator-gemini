from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
import logging
import json
import os
from google.cloud import bigquery
import config  # Import the config module

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
    return {"status": "healthy", "server": "react-frontend"}

@app.get("/api/latest_dashboard", response_class=JSONResponse)
async def get_latest_dashboard():
    logger.info("Latest dashboard endpoint called")
    try:
        client = bigquery.Client()
        
        # First, check if we have any data at all in analytics_summary
        check_query = f"""
        SELECT COUNT(*) as count
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        """
        check_job = client.query(check_query)
        check_result = list(check_job.result())[0]
        
        if check_result.count == 0:
            logger.info("No records found in analytics_summary table")
            # Return empty dashboard data
            return {
                "total_sessions": 0,
                "total_driving_time": 0,
                "avg_session_time": 0,
                "avg_fuel_consumption": 0,
                "avg_brake_usage": 0,
                "top_speed_ever": 0,
                "avg_top_speed": 0,
                "max_rpm_ever": 0,
                "avg_gears_used": 0,
                "total_horn_usage": 0,
                "most_recent_session_id": "",
                "recent_sessions": [],
                "dtc_occurrence": [],
                "ai_insights": "No driver data available yet. Please run a simulation first using the original UI at http://localhost:8000."
            }
        
        # Get the most recent player - FIXED QUERY
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
            logger.warning("No players found despite having records")
            return JSONResponse(
                content={
                    "total_sessions": 0,
                    "total_driving_time": 0,
                    "avg_session_time": 0,
                    "avg_fuel_consumption": 0,
                    "avg_brake_usage": 0,
                    "total_horn_usage": 0,
                    "most_recent_session_id": "",
                    "recent_sessions": [],
                    "ai_insights": "Error retrieving player data. Please check BigQuery tables."
                }
            )
        
        latest_player = player_results[0].player_id
        logger.info(f"Found latest player: {latest_player}")
        
        # Query to get aggregate statistics across all sessions
        query = f"""
        WITH SessionStats AS (
            SELECT
                session_id,
                session_timestamp,
                total_time_secs,
                accX_mean,
                accY_mean,
                accZ_mean,
                brake_usage_count,
                fuel_start - fuel_end AS fuel_consumption,
                ARRAY_LENGTH(JSON_EXTRACT_ARRAY(gears_used)) AS unique_gears_count,
                rpm_max,
                wheel_speed_max,
                horn_usage_count
            FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
            WHERE player_id = '{latest_player}'
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
            -- Get most recent session ID
            (SELECT session_id FROM SessionStats ORDER BY session_timestamp DESC LIMIT 1) AS most_recent_session_id
        FROM SessionStats
        """
        
        query_job = client.query(query)
        results = query_job.result()
        
        # Process the results
        stats = None
        for row in results:
            stats = {
                "total_sessions": row.total_sessions,
                "total_driving_time": row.total_driving_time,
                "avg_session_time": row.avg_session_time,
                "avg_fuel_consumption": row.avg_fuel_consumption,
                "avg_brake_usage": row.avg_brake_usage,
                "top_speed_ever": row.top_speed_ever,
                "avg_top_speed": row.avg_top_speed,
                "max_rpm_ever": row.max_rpm_ever,
                "avg_gears_used": row.avg_gears_used,
                "total_horn_usage": row.total_horn_usage,
                "most_recent_session_id": row.most_recent_session_id
            }
        
        if not stats:
            logger.warning("No statistics generated from query")
            return JSONResponse(
                content={
                    "total_sessions": 0,
                    "total_driving_time": 0,
                    "avg_session_time": 0,
                    "avg_fuel_consumption": 0,
                    "avg_brake_usage": 0,
                    "total_horn_usage": 0,
                    "most_recent_session_id": "",
                    "recent_sessions": [],
                    "ai_insights": "No data could be processed from BigQuery."
                }
            )
        
        # Get recent sessions data - SIMPLIFIED
        recent_sessions_query = f"""
        SELECT 
            session_timestamp,
            wheel_speed_max as top_speed,
            brake_usage_count,
            fuel_start - fuel_end as fuel_consumption
        FROM `{config.PROJECT_ID}.{config.DATASET_ID}.analytics_summary`
        WHERE player_id = '{latest_player}'
        ORDER BY session_timestamp DESC
        LIMIT 3
        """
        
        recent_sessions_job = client.query(recent_sessions_query)
        recent_sessions_results = list(recent_sessions_job.result())
        
        recent_sessions = []
        for row in recent_sessions_results:
            recent_sessions.append({
                "timestamp": row.session_timestamp.isoformat() if hasattr(row.session_timestamp, 'isoformat') else str(row.session_timestamp),
                "top_speed": row.top_speed,
                "brake_usage_count": row.brake_usage_count,
                "fuel_consumption": row.fuel_consumption
            })
        
        stats["recent_sessions"] = recent_sessions
            
        # Get DTC code occurrence data - safely
        try:
            dtc_query = f"""
            SELECT 
                TRIM(code) AS dtc_code, 
                COUNT(*) AS occurrences 
            FROM `{config.PROJECT_ID}.{config.DATASET_ID}.ai_analysis`,
            UNNEST(SPLIT(REGEXP_REPLACE(dtc_codes, r'[\[\]"]', ''), ',')) AS code
            WHERE player_id = '{latest_player}'
            GROUP BY dtc_code
            ORDER BY occurrences DESC
            LIMIT 10
            """
            
            dtc_job = client.query(dtc_query)
            dtc_results = dtc_job.result()
            
            dtc_stats = []
            for row in dtc_results:
                dtc_stats.append({
                    "code": row.dtc_code,
                    "occurrences": row.occurrences
                })
            
            stats["dtc_occurrence"] = dtc_stats
        except Exception as e:
            logger.error(f"Error fetching DTC data: {str(e)}")
            stats["dtc_occurrence"] = []
        
        # Add a simple AI insight
        stats["ai_insights"] = f"Analysis of {stats['total_sessions']} driving sessions shows an average session time of {round(stats['avg_session_time'])} seconds with a top speed of {round(stats['top_speed_ever'] * 0.621)} mph."
        
        logger.info(f"Successfully retrieved dashboard data for player {latest_player}")
        return JSONResponse(content=stats)
            
    except Exception as e:
        logger.error(f"Error retrieving dashboard data: {str(e)}")
        return JSONResponse(
            content={
                "total_sessions": 0,
                "total_driving_time": 0,
                "avg_session_time": 0,
                "avg_fuel_consumption": 0,
                "avg_brake_usage": 0,
                "total_horn_usage": 0,
                "most_recent_session_id": "",
                "recent_sessions": [],
                "ai_insights": f"Error retrieving data: {str(e)}"
            }
  
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