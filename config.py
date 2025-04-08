import os
from pathlib import Path



# Project paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "telematics"

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(BASE_DIR / "data-connect-demo4-2cfbc645dade.json")

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
                                    str(BASE_DIR / "data-connect-demo4-2cfbc645dade.json"))

# If the key file exists, set the environment variable
if os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = SERVICE_ACCOUNT_KEY_PATH

# Application Configuration
RUN_LOCALLY = True
DEBUG_MODE = True
API_PORT = 8000
API_HOST = "localhost"

# Vertex AI Models
#SUMMARY_MODEL = "gemini-2.5-pro-exp-03-25"
SUMMARY_MODEL = "gemini-2.0-flash-001"
DTC_MODEL = "gemini-2.0-flash-001"