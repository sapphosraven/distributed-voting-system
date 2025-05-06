from fastapi import FastAPI, Depends, HTTPException
from auth.models import VoteRequest
from auth import get_current_user
import logging
import os
from auth.router import auth_router

# Create log directory
if not os.path.exists("logs"):
    os.makedirs("logs")

# Configure logging to both file and console
logging.basicConfig(
    level=logging.DEBUG,  # Change to DEBUG level
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/vote_audit.log"),
        logging.StreamHandler()  # Add console output
    ]
)


app = FastAPI(title="Distributed Voting System")


# Add after imports:

import socket
import subprocess

@app.get("/debug/network")
def debug_network():
    """Debug network connectivity between containers"""
    results = {}
    
    # Test DNS resolution
    try:
        voting_nodes = os.getenv("VOTING_NODES", "http://voting-node-1:5000").split(",")
        results["environment"] = {"VOTING_NODES": voting_nodes}
        
        for node_url in voting_nodes:
            hostname = node_url.split("//")[1].split(":")[0]
            try:
                ip = socket.gethostbyname(hostname)
                results[f"{hostname}_ip"] = ip
                
                # Try TCP connection
                port = int(node_url.split(":")[-1].split("/")[0])
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)
                conn_result = s.connect_ex((ip, port))
                s.close()
                results[f"{hostname}:{port}_connection"] = "Success" if conn_result == 0 else f"Failed with code {conn_result}"
            except Exception as e:
                results[f"{hostname}_error"] = str(e)
    except Exception as e:
        results["error"] = str(e)
        
    return results

# Comment out node_app mounting - we'll just forward API calls directly
# try:
#     from node.node_server import node_app
#     app.mount("/node", node_app)
#     print("Successfully mounted node_app")
# except Exception as e:
#     import logging
#     logging.error(f"Failed to import and mount node_app: {e}")
#     print(f"Error mounting node_app: {e}")

# Include authentication routes
app.include_router(auth_router, prefix="/auth")

import httpx
# Replace the /vote endpoint function with:

@app.post("/vote")
async def cast_vote(vote: VoteRequest, username: str = Depends(get_current_user)):
    """Forward vote to a voting node"""
    try:
        # Get list of voting nodes from environment
        voting_nodes = os.getenv("VOTING_NODES", "http://voting-node-1:5000").split(",")
        logging.info(f"Attempting to forward vote to nodes: {voting_nodes}")
        
        # Try each node until successful
        for node_url in voting_nodes:
            try:
                # Make sure URL has /votes endpoint
                vote_url = f"{node_url}/votes" if not node_url.endswith("/votes") else node_url
                
                logging.info(f"Trying to connect to {vote_url}")
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        vote_url,
                        json={
                            "voter_id": username,
                            "candidate_id": vote.candidate_id,
                            "election_id": "election-2025"
                        },
                        timeout=5.0
                    )
                
                if response.status_code in (200, 202):  # Accept either OK or Accepted
                    result = response.json()
                    logging.info(f"Vote successfully forwarded to {vote_url}")
                    return {
                        "message": f"Vote for {vote.candidate_id} received",
                        "vote_id": result.get("vote_id", "unknown"),
                        "status": result.get("status", "processed")
                    }
                logging.warning(f"Node {vote_url} returned status {response.status_code}")
            except Exception as e:
                logging.error(f"Failed to connect to {vote_url}: {str(e)}")
                continue
        
        # If all nodes failed
        logging.error("All voting nodes unreachable")
        return {"message": "Error: All connection attempts failed"}
    except Exception as e:
        logging.error(f"Vote processing error: {str(e)}")
        return {"message": f"Vote processing error: {str(e)}"}
    
# Root endpoint
@app.get("/")
def root():
    return {"message": "Distributed Voting System is running!"}
