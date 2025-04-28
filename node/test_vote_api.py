import os
import requests
import json
import time
from datetime import datetime

# Configuration
NODE_URL = "http://localhost:5001"  # Change to match your node
TEST_USERNAME = "alice"
TEST_PASSWORD = "password"
TEST_CANDIDATE = "Candidate_A"

# First, get auth token from Shahliza's backend
def get_auth_token():
    try:
        # Adjust this URL to match where Shahliza's backend is running
        auth_url = "http://localhost:8000/login"
        
        print(f"Getting auth token for user {TEST_USERNAME}...")
        
        response = requests.post(
            auth_url,
            data={
                "username": TEST_USERNAME,
                "password": TEST_PASSWORD
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            print(f"Authentication failed: {response.status_code}")
            print(response.text)
            return None
            
        token_data = response.json()
        return token_data.get("access_token")
        
    except Exception as e:
        print(f"Error getting auth token: {e}")
        return None

def check_node_health():
    """Check if the node is healthy"""
    try:
        response = requests.get(f"{NODE_URL}/health")
        if response.status_code != 200:
            print(f"Node is not healthy: {response.status_code}")
            return False
            
        health_data = response.json()
        print(f"Node status: {health_data['status']}")
        print(f"Redis cluster state: {health_data['redis_cluster']['cluster_state']}")
        return health_data['status'] == "healthy"
    except Exception as e:
        print(f"Error checking node health: {e}")
        return False

def submit_vote(token):
    """Submit a test vote"""
    try:
        print(f"Submitting vote for {TEST_CANDIDATE}...")
        
        response = requests.post(
            f"{NODE_URL}/vote",
            json={"candidate_id": TEST_CANDIDATE},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Response status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
        return response.status_code == 200
    except Exception as e:
        print(f"Error submitting vote: {e}")
        return False

def get_results():
    """Get election results"""
    try:
        print("Getting election results...")
        
        response = requests.get(f"{NODE_URL}/results/election_2025")
        
        print(f"Response status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
        return response.status_code == 200
    except Exception as e:
        print(f"Error getting results: {e}")
        return False

def main():
    print("==== Vote API Test ====")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"Node URL: {NODE_URL}")
    
    # Check node health first
    if not check_node_health():
        print("Node is not healthy, aborting test")
        return
        
    print("\n==== Authentication ====")
    token = get_auth_token()
    if not token:
        print("Failed to get auth token, aborting test")
        return
    
    print("\n==== Vote Submission ====")
    if not submit_vote(token):
        print("Vote submission failed")
    
    # Wait a moment for consensus to happen
    print("\nWaiting 3 seconds for consensus processing...")
    time.sleep(3)
    
    print("\n==== Election Results ====")
    get_results()
    
    print("\n==== Test Complete ====")

if __name__ == "__main__":
    main()