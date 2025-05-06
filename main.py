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
import json
import asyncio

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
