import requests

# Base URL for the API
BASE_URL = "http://localhost:8000"

def test_login():
    """Test authentication endpoint"""
    print("Testing login...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "alice@example.com", "password": "alicepass"}
    )
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"Login successful! Token: {token_data}")
        return token_data.get("access_token")
    else:
        print(f"Login failed: {response.text}")
        return None

def test_elections(token):
    """Test getting elections with authentication token"""
    print("\nTesting elections endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/elections", headers=headers)
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        elections = response.json()
        print(f"Retrieved {len(elections)} elections")
        print(elections)
    else:
        print(f"Failed to get elections: {response.text}")

if __name__ == "__main__":
    token = test_login()
    if token:
        test_elections(token)