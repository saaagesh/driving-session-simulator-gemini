import pandas as pd
from ast import literal_eval    

def load_vehicle_data(player_id):
    data = pd.read_csv(f'telematics/{player_id}_vehicle_data.csv')
    return data

def compute_brake_usage(data):
    data['brake_change'] = data['brake'].diff()
    brake_starts_count = (data['brake_change'] == 1).sum()
    brake_average = data['brake'].mean()
    return brake_starts_count, brake_average

def compute_gear_changes(data):
    gears_used = data['gear'].unique()
    gear_changes = data[data['gear'].shift() != data['gear']]
    gear_change_details = gear_changes[['Time', 'gear']].values.tolist()
    return list(gears_used), gear_change_details

def compute_part_damage(data):
    last_part_damage = literal_eval(data['part_damage'].iloc[-1])
    return last_part_damage

def dtc_codes(data):
    dtc_codes = data['DTC'].iloc[0]
    return str(dtc_codes)

def aggregate_statistics(data):
    total_time_secs = data['Time'].iloc[-1]
    accX_stats, accY_stats, accZ_stats = data['accXSmooth'].mean(), data['accYSmooth'].mean(), data['accZSmooth'].mean()
    brake_starts_count, brake_average = compute_brake_usage(data)
    fuel_start, fuel_end = data['fuel'].iloc[0], data['fuel'].iloc[-1]
    gears_used, gear_change_details = compute_gear_changes(data)
    oil_temp_stats = data['oil_temperature'].agg(['min', 'max', 'mean']).to_dict()
    last_part_damage = compute_part_damage(data)
    rpm_stats = data['rpm'].agg(['min', 'max', 'mean']).to_dict()
    steering_changes = data['steering'].diff().abs().sum()
    throttle_stats = data['throttle'].agg(['min', 'max', 'mean']).to_dict()
    water_temp_stats = data['water_temperature'].agg(['min', 'max', 'mean']).to_dict()
    wheel_speed_stats = data['wheelspeed'].agg(['min', 'max', 'mean']).to_dict()
    horn_usage_count = data['horn'].sum()

    summary = {
        "Total Time (secs)": total_time_secs,
        "Acceleration X (mean)": accX_stats,
        "Acceleration Y (mean)": accY_stats,
        "Acceleration Z (mean)": accZ_stats,
        "Brake Usage Count": brake_starts_count,
        "Brake Average": brake_average,
        "Fuel Start": fuel_start,
        "Fuel End": fuel_end,
        "Gears Used": gears_used,
        "Gear Change Details": gear_change_details,
        "Oil Temperature Stats": oil_temp_stats,
        "Part Damage": last_part_damage,
        "RPM Stats": rpm_stats,
        "Steering Changes": steering_changes,
        "Throttle Stats": throttle_stats,
        "Water Temperature Stats": water_temp_stats,
        "Wheel Speed Stats": wheel_speed_stats,
        "Horn Usage Count": horn_usage_count,
    }

    return summary