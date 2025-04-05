import numpy as np
import pandas as pd
import seaborn as sns
from beamngpy import BeamNGpy, Scenario, Vehicle
from beamngpy.sensors import Electrics, Damage
from google.cloud import bigquery
import json
import os
import time
import random

beamng = BeamNGpy('localhost', 60152, home='C:/Program Files (x86)/Steam/steamapps/common/BeamNG.drive', user='C:/Users/Public/drive-session-summarizer')

def game(player_id):
    time.sleep(5)
    
    beamng.open()
    scenario = Scenario('automation_test_track', 'Vehicle Driving Analysis - Google Cloud Next 25')
    vehicle = Vehicle('Vehicle', model='bolide', license=player_id, color='Red')
    # imu_sensor = IMU(pos=(0.73, 0.51, 0.8), debug=True)
    electrics_sensor = Electrics()
    damage_sensor = Damage()

    # vehicle.sensors.attach('imu_sensor', imu_sensor)
    vehicle.sensors.attach('electrics_sensor', electrics_sensor)
    vehicle.sensors.attach('damage_sensor', damage_sensor)

    scenario.add_vehicle(vehicle, pos=(497.1917725, 178.2896118, 131.7432404), rot_quat=(0.002234787144, -0.0014619524, 0.6965841062, 0.7174701746))
    scenario.make(beamng)
    data = []
    column_names = ['Time']

    essential_keys = [
        'speed', 'accXSmooth', 'accYSmooth', 'accZSmooth', 'gear', 'rpm', 'brake', 'throttle',
        'fuel', 'oil_temperature', 'water_temperature', 'steering', 'wheelspeed', 'part_damage', 'horn'
    ]

    beamng.scenario.load(scenario)
    beamng.settings.set_deterministic()
    beamng.settings.set_steps_per_second(60)
    beamng.scenario.start()
    beamng.control.pause()

    vehicle.switch()
    beamng.control.step(240)

    for t in range(0, 180, 30):
        vehicle.sensors.poll()
        row_data = {'Time': t/60}
        for sensor_name, sensor in vehicle.sensors.items():
            filtered_data = {key: value for key, value in sensor.data.items() if key in essential_keys}
            row_data.update({f"{key}": value for key, value in filtered_data.items()})
        if t == 0:
            column_names.extend(sorted(row_data.keys())[1:])  
        data.append([row_data[col] for col in column_names])
        beamng.control.step(30)

    dtc_codes = generate_engine_dtc_codes()
    if "DTC" not in column_names:  
        column_names.append("DTC")
    for row in data:
        row.append('')  
    data[0][-1] = str(dtc_codes)  

    beamng.close()
    df = pd.DataFrame(data, columns=column_names)
    df.to_csv(f'telematics/{player_id}_vehicle_data.csv', index=False)
    # upload_to_bigquery(f'telematics/{player_id}_vehicle_data.csv', player_id)
    print(f"Data saved for player {player_id}")
    print(df.head())

# def upload_to_bigquery(csv_file_path, table_id):
#     client = bigquery.Client()
#     table_id_full = f"fresh-span-400217.simulated_vehicle_data.{table_id}"

#     job_config = bigquery.LoadJobConfig(
#         source_format=bigquery.SourceFormat.CSV,
#         skip_leading_rows=1,  
#         autodetect=True, 
#     )

#     with open(csv_file_path, "rb") as source_file:
#         load_job = client.load_table_from_file(source_file, table_id_full, job_config=job_config)

#     load_job.result()  

#     destination_table = client.get_table(table_id_full)
#     print(f"Loaded {destination_table.num_rows} rows into {table_id_full}.")
    
def generate_engine_dtc_codes(num_codes=5):

    engine_issues = {
        'fuel_system': range(100, 200),   # P0100 to P0199
        'ignition_system': range(300, 400),   # P0300 to P0399
        'emission_control': range(400, 500),  # P0400 to P0499
        'engine_idle_control': range(500, 600),  # P0500 to P0599
        'computer_output_circuit': range(600, 700),  # P0600 to P0699
    }

    dtc_codes = []
    for _ in range(num_codes):
        issue_category = random.choice(list(engine_issues.keys()))
        code = f"P{random.choice(list(engine_issues[issue_category])):04}"
        dtc_codes.append(code)

    return dtc_codes



