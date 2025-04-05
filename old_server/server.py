from fastapi import FastAPI, HTTPException
from typing import Dict
import pandas as pd
from ast import literal_eval
import vertexai
from simulation_engine import game
from vehicle_statistics import aggregate_statistics
from vertexai.preview.generative_models import GenerativeModel
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ast import literal_eval
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import FastAPI, Request
from vehicle_statistics import load_vehicle_data, aggregate_statistics, dtc_codes

app = FastAPI()

app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Player(BaseModel):
    player_id: str
    
class ChatMessage(BaseModel):
    message: str
    player_id: str
    
import logging

logging.basicConfig(level=logging.INFO)

@app.get("/{path:path}")
async def serve_ui(request: Request, path: str):
    return FileResponse("dist/index.html")

player_names = []

@app.post("/generate_summary/")
async def generate_summary_endpoint(player: Player) -> Dict:
    player_id = str(player.player_id)
    try:
        # Initialize Vertex AI
        vertexai.init(project="data-connect-demo4", location="us-central1") 
        model = GenerativeModel("gemini-2.0-flash-001") 
      
        
        logging.info(f"Calling game function with player_id: {player_id}")
        game(player_id)
        
        player_names.append(player_id)
        
        # Load data
        logging.info(f"Loading CSV file for player_id: {player_id}")
        df = pd.read_csv(f'telematics/{player_id}_vehicle_data.csv')

        logging.info("Aggregating statistics")
        summary = aggregate_statistics(df)

        # Generate content
        logging.info("Generating content")
        responses = model.generate_content(
            f"""{summary}\n\n Above are the statistics for the vehicle with player_id: {player_id}, Generate a summary and insights from the vehicle performance statistics obtained from a BeamNG.drive simulation driven by the player. The data reflects various performance metrics recorded on an automation test track. Given the statistics, provide insights and recommendations for the player to improve their driving skills and vehicle performance. The summary should be in a conversational format and should be easy to understand for the player. Round off the numbers to 2 decimal places use imperial units\n Be a Critic and a Coach. Provide constructive feedback and suggestions for improvement.""",
            generation_config={
                "max_output_tokens": 2048,
                "temperature": 0,
                "top_p": 1
            },
            stream=False,
        )
        
        fuel_data = [{'Time': row['Time'], 'Fuel Level': row['fuel']} for index, row in df.iterrows()]
        oil_temp_data = [{'Time': row['Time'], 'Oil Temperature': row['oil_temperature']} for index, row in df.iterrows()]
        water_temp_data = [{'Time': row['Time'], 'Water Temperature': row['water_temperature']} for index, row in df.iterrows()]
        #gear_distribution = df['gear'].value_counts().reset_index().rename(columns={'index': 'Gear', 'gear': 'Frequency'})
        #gear_distribution_data = [{'Gear': row['Gear'], 'Frequency': row['Frequency']} for index, row in gear_distribution.iterrows()]


        # Updated Code
        gear_distribution = df['gear'].value_counts().reset_index()  # Remove the rename part
        gear_distribution.columns = ['Gear', 'Frequency']  # Directly set the column names
        gear_distribution_data = [{'Gear': row['Gear'], 'Frequency': row['Frequency']} for index, row in gear_distribution.iterrows()]


        part_damage = literal_eval(df['part_damage'].iloc[-1])
        steering = df['steering'].diff().abs().sum()
        graphs = [
            {
                'graph_type': 'pie',
                'title': 'Damaged Parts Distribution',
                'data': part_damage
            },
            {
                'graph_type': 'bar',
                'title': 'Gear Distribution',
                'x_axis': 'Gear',
                'y_axis': 'Frequency',
                'data': gear_distribution_data
            },
            {
                'graph_type': 'line',
                'title': 'Fuel Level Over Time',
                'x_axis': 'Time',
                'y_axis': 'Fuel Level',
                'data': fuel_data
            },
            {
                'graph_type': 'line',
                'title': 'Oil Temperature Over Time',
                'x_axis': 'Time',
                'y_axis': 'Oil Temperature',
                'data': oil_temp_data
            },
            {
                'graph_type': 'line',
                'title': 'Water Temperature Over Time',
                'x_axis': 'Time',
                'y_axis': 'Water Temperature',
                'data': water_temp_data
            },
            {
                'graph_type': 'area',
                'title': 'Steering Changes',
                'x_axis': 'Time',
                'y_axis': 'Steering',
                'data': [{'Time': row['Time'], 'Steering': row['steering']} for index, row in df.iterrows()]
            }
        ]
        
        df = pd.read_csv(f'telematics/{player.player_id}_vehicle_data.csv')
        dtc_codes = df['DTC'].iloc[0]
    
        model = GenerativeModel("gemini-2.0-flash-001")
        dtc_response = model.generate_content(
            f"""{dtc_codes}\n\nBased on the above DTC codes, What could be the root cause of the problem? Also, provide the diagnostic steps and recommended fixes for the problem. Generate a detailed report. The report will identify potential root causes, provide a step-by-step diagnostic approach, and recommend solutions to resolve the issues.""",
            generation_config={
                "max_output_tokens": 2048,
                "temperature": 0,
                "top_p": 1
            },
            stream=False,
        )
    
   

        return {"generated_text": responses.text, "player_id": player_id, "graphs": graphs, "dtc_response": dtc_response.text, "dtc_codes": dtc_codes}
    
    

    except Exception as e:
        logging.error(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

chat_sessions = {}

@app.post("/chat")
def multiturn_generate_content(chat_message: ChatMessage):
    if player_names:  
        player_id = player_names[-1]
        data = load_vehicle_data(player_id)
        stats = aggregate_statistics(data)
        dtc = dtc_codes(data)

        message = chat_message.message
        model = GenerativeModel("gemini-2.0-flash-001")
        if player_id not in chat_sessions:
            chat_sessions[player_id] = model.start_chat(history=[])
        chat = chat_sessions[player_id]

        initial_message = f"""For the vehicle with player_id: {player_id}, the statistics are as follows:\n\n{stats}\n\n, The DTC codes are: {dtc}\n\nBased on the above statistics and DTC codes, Help user with their queries. Respond in Plain Text, Strictly No Markdown or HTML.
        """
        print("initial_message", initial_message)

        chat.send_message([initial_message])

        response = chat.send_message(
            message,
            generation_config={
                "max_output_tokens": 2048,
                "temperature": 0,
                "top_p": 1
            },
            stream=False,
        )


        return {"response": response.text}
    
    else:
        return {"response": "Application was restarted. Please run the simulation again. Thank you for your patience.😊"}
    



# To run the server, execute the following command: uvicorn server:app --reload