import time
from fastapi import FastAPI, Depends, HTTPException
from auth.models import VoteRequest
from auth import get_current_user
import logging
import os
from auth.router import auth_router
from fastapi import WebSocket, WebSocketDisconnect
import websocket_manager
import redis_subscriber
from websocket_manager import connection_manager
from redis_subscriber import vote_subscriber
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import socket
import subprocess

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

voting_nodes = os.getenv("VOTING_NODES", "http://voting-node-1:5000,http://voting-node-2:5000,http://voting-node-3:5000").split(",")
logging.info(f"Initialized with voting nodes: {voting_nodes}")

def standard_error_response(status_code: int, message: str, error_type: str = "general_error"):
    """Create a standardized error response"""
    return {
        "error": {
            "type": error_type,
            "message": message,
            "status_code": status_code
        },
        "timestamp": time.time()
    }

app = FastAPI(title="Distributed Voting System")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # During development; restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/debug/network")
def debug_network():
    """Debug network connectivity between containers"""
    results = {}
    
    # Test DNS resolution
    try:
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
                    
                    # Broadcast vote event directly to WebSocket clients
                    try:
                        vote_event = {
                            "event": "vote_submitted",
                            "vote_id": result.get("vote_id", "unknown"),
                            "candidate_id": vote.candidate_id,
                            "voter_id": username,
                            "timestamp": time.time()
                        }
                        # No await here if we're not in an async function
                        asyncio.create_task(connection_manager.broadcast(vote_event))
                        logging.info(f"Broadcasting vote event to {len(connection_manager.active_connections)} clients")
                    except Exception as e:
                        logging.error(f"Failed to broadcast vote event: {e}")
                        
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
    
# Candidates endpoint
@app.get("/candidates")
async def get_candidates():
    """Get list of available candidates"""
    try:
        # For MVP, we'll return a static list
        # In a full implementation, this would come from a database
        return [
            {"id": "Candidate_A", "name": "Candidate A", "party": "Party A", "photo": "candidate_a.jpg"},
            {"id": "Candidate_B", "name": "Candidate B", "party": "Party B", "photo": "candidate_b.jpg"},
            {"id": "Candidate_C", "name": "Candidate C", "party": "Party C", "photo": "candidate_c.jpg"}
        ]
    except Exception as e:
        logging.error(f"Error fetching candidates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch candidates")

# Results endpoint
@app.get("/results")
async def get_results():
    """Get current election results"""
    try:
        # In MVP, we'll query one node for results
        # In full implementation, we'd aggregate from all nodes
        for node_url in voting_nodes:
            try:
                results_url = f"{node_url}/results"
                logging.info(f"Fetching results from {results_url}")
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(results_url, timeout=5.0)
                    if response.status_code == 200:
                        return response.json()
            except Exception as e:
                logging.error(f"Failed to fetch results from {node_url}: {str(e)}")
                continue
                
        # If we couldn't get results from any node, return empty results
        return {"candidates": {
                "Candidate_A": 0,
                "Candidate_B": 0, 
                "Candidate_C": 0
            }, 
            "total_votes": 0
        }
    except Exception as e:
        logging.error(f"Error fetching results: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch election results")

# System status endpoint
@app.get("/system/status")
async def system_status():
    """Get system health status"""
    status = {
        "api_gateway": "healthy",
        "voting_nodes": {},
        "websocket_connections": len(connection_manager.active_connections),
        "timestamp": time.time()
    }
    
    # Check voting nodes
    for node_url in voting_nodes:
        try:
            health_url = f"{node_url}/health"
            async with httpx.AsyncClient() as client:
                response = await client.get(health_url, timeout=2.0)
                status["voting_nodes"][node_url] = "healthy" if response.status_code == 200 else "unhealthy"
        except:
            status["voting_nodes"][node_url] = "unreachable"
    
    return status

# Add this after the /vote endpoint (around line 35)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time vote updates"""
    await connection_manager.connect(websocket)
    try:
        while True:
            # Receive and process messages from the client
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                action = message.get("action")
                
                if action == "subscribe" and "topic" in message:
                    await connection_manager.subscribe(websocket, message["topic"])
                elif action == "unsubscribe" and "topic" in message:
                    await connection_manager.unsubscribe(websocket, message["topic"])
            except json.JSONDecodeError:
                # Send error to client if message is not valid JSON
                await websocket.send_json({"error": "Invalid JSON message"})
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception as e:
        logging.error(f"WebSocket error: {str(e)}")
        connection_manager.disconnect(websocket)

# Add background task startup event (at the bottom of the file, before startup_events)
@app.on_event("startup")
async def start_redis_subscriber():
    """Start the Redis subscriber on application startup"""
    try:
        await vote_subscriber.connect()
        await vote_subscriber.subscribe()
        # Start the listener as a background task
        asyncio.create_task(vote_subscriber.listen_for_events())
        logging.info("Started Redis subscriber for vote events")
    except Exception as e:
        logging.error(f"Failed to start Redis subscriber: {e}")

@app.on_event("shutdown")
async def stop_redis_subscriber():
    """Stop the Redis subscriber on application shutdown"""
    await vote_subscriber.stop()
    logging.info("Stopped Redis subscriber")
    
# Root endpoint
@app.get("/")
def root():
    return {"message": "Distributed Voting System is running!"}

# Add these routes to your FastAPI app:
@app.get("/elections")
async def get_elections(username: str = Depends(get_current_user)):
    """Get list of elections available to the user"""
    try:
        # In this example we're forwarding to a node, you might need to adapt this
        node_url = voting_nodes[0]
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{node_url}/elections", 
                                      headers={"X-User": username})
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, 
                                   detail=response.text)
    except Exception as e:
        logging.error(f"Error fetching elections: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch elections")

@app.post("/elections")
async def create_election(election: dict, username: str = Depends(get_current_user)):
    """Create a new election"""
    try:
        # Add the creator to the election data
        election["created_by"] = username
        
        # Forward to node
        node_url = voting_nodes[0]
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{node_url}/elections", 
                                      json=election,
                                      headers={"X-User": username})
            
            if response.status_code == 200 or response.status_code == 201:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, 
                                   detail=response.text)
    except Exception as e:
        logging.error(f"Error creating election: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create election")

@app.get("/elections/{election_id}")
async def get_election(election_id: str, username: str = Depends(get_current_user)):
    """Get details of a specific election"""
    try:
        node_url = voting_nodes[0]
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{node_url}/elections/{election_id}", 
                                      headers={"X-User": username})
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, 
                                   detail=response.text)
    except Exception as e:
        logging.error(f"Error fetching election {election_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch election details")

@app.get("/user/voted-elections")
async def get_voted_elections(username: str = Depends(get_current_user)):
    """Get elections the user has voted in"""
    try:
        node_url = voting_nodes[0]
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{node_url}/user/voted-elections", 
                                      headers={"X-User": username})
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, 
                                   detail=response.text)
    except Exception as e:
        logging.error(f"Error fetching voted elections: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch voted elections")

@app.get("/results/{election_id}")
async def get_election_results(election_id: str, username: str = Depends(get_current_user)):
    """Get results for a specific election"""
    try:
        node_url = voting_nodes[0]
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{node_url}/elections/{election_id}/results", 
                                      headers={"X-User": username})
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, 
                                   detail=response.text)
    except Exception as e:
        logging.error(f"Error fetching results for election {election_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch election results")