import requests
import datetime
import json

# Configuration
API_GATEWAY_URL = "http://localhost:8000"  # Always use API Gateway

# Get auth token (if needed)
def get_auth_token():
    response = requests.post(
        f"{API_GATEWAY_URL}/auth/token", 
        data={"username": "alice@example.com", "password": "alicepass"}
    )
    token = response.json()["access_token"]
    return token

# Create test election
def create_test_election():
    # Dates: today and a week from now
    today = datetime.datetime.now().isoformat().split("T")[0]
    end_date = (datetime.datetime.now() + datetime.timedelta(days=7)).isoformat().split("T")[0]
    
    election_data = {
        "id": "election-2025",
        "title": "Presidential Election 2025",
        "description": "Vote for your favorite candidate",
        "start_date": today,
        "end_date": end_date,
        "created_by": "admin",
        "eligible_voters": ["all"],
        "candidates": [
            {"id": "Candidate_A", "name": "Candidate A", "party": "Party A", "photo": "candidate_a.jpg"},
            {"id": "Candidate_B", "name": "Candidate B", "party": "Party B", "photo": "candidate_b.jpg"},
            {"id": "Candidate_C", "name": "Candidate C", "party": "Party C", "photo": "candidate_c.jpg"}
        ]
    }
    
    try:
        # Only use API Gateway
        response = requests.post(
            f"{API_GATEWAY_URL}/elections",
            json=election_data
        )
        print(f"API Gateway Response: {response.status_code}")
        print(response.text)
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    create_test_election()
