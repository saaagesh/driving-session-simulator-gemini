"""
Detailed debugging script for API endpoints
"""
import requests
import json
import time

API_BASE_URL = "http://localhost:3001"

def test_endpoint(endpoint):
    print(f"\n===== Testing endpoint: {endpoint} =====")
    url = f"{API_BASE_URL}{endpoint}"
    print(f"Request URL: {url}")
    
    try:
        # Print request details
        print(f"Sending GET request...")
        
        # Send request with detailed debugging
        response = requests.get(url)
        
        # Print response details
        print(f"Response status code: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        content_type = response.headers.get('Content-Type', '')
        print(f"Content-Type header: {content_type}")
        
        # Try to parse response as JSON
        try:
            if 'application/json' in content_type:
                json_data = response.json()
                print("Response parsed as JSON successfully")
                print(f"JSON data: {json.dumps(json_data, indent=2)[:500]}...")
                return True
            else:
                print(f"WARNING: Non-JSON response received")
                print(f"Response content (first 500 chars):\n{response.text[:500]}...")
                return False
        except json.JSONDecodeError as e:
            print(f"ERROR: Failed to parse JSON: {e}")
            print(f"Response content (first 500 chars):\n{response.text[:500]}...")
            return False
    except Exception as e:
        print(f"ERROR: Request failed: {e}")
        return False

# API endpoints to test
endpoints = [
    "/api/health",
    "/api/latest_dashboard",
    "/api/latest_report"
]

# Run tests with delay between them
for endpoint in endpoints:
    success = test_endpoint(endpoint)
    print(f"Test result: {'SUCCESS' if success else 'FAILURE'}")
    # Wait between requests
    time.sleep(1)

print("\nTest Summary:")
print("If you're still seeing HTML responses instead of JSON, check:")
print("1. Is the server running on port 3001?")
print("2. Are there any error messages in the server logs?")
print("3. Are there any other FastAPI apps running that might interfere?")