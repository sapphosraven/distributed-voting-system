import os
import time
import json
import uuid
import uvicorn
import redis
import asyncio
from fastapi import FastAPI, WebSocket, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Set
from datetime import datetime

# Import our custom logger
from logger_config import setup_logger

# Node configuration from environment variables
NODE_ID = os.environ.get("NODE_ID", "node1")
NODE_ROLE = os.environ.get("NODE_ROLE", "follower")
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
NODE_COUNT = int(os.environ.get("NODE_COUNT", 3))
LOG_DIR = os.environ.get("LOG_DIR", "../logs")

# Set up loggers
logger = setup_logger("node", log_dir=LOG_DIR, node_id=NODE_ID)
api_logger = setup_logger("node.api", log_dir=LOG_DIR, node_id=NODE_ID)
heartbeat_logger = setup_logger("node.heartbeat", log_dir=LOG_DIR, node_id=NODE_ID)
consensus_logger = setup_logger("node.consensus", log_dir=LOG_DIR, node_id=NODE_ID)

# Create FastAPI app
app = FastAPI(title=f"Voting System Node - {NODE_ID}")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis client
try:
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    logger.critical(f"Failed to connect to Redis: {e}", exc_info=True)
    raise

# Import node communicator after Redis setup
from node_communication import NodeCommunicator

# Initialize communicator
communicator = NodeCommunicator(r, NODE_ID)

# Node state
class NodeState:
    def __init__(self):
        self.is_leader = NODE_ROLE == "leader"
        self.node_id = NODE_ID
        self.last_heartbeat = {}
        self.connected_nodes = set()
        self.votes_processed = 0
        self.votes_pending = []
        self.system_time = time.time()
        self.is_healthy = True
        self.start_time = time.time()
        logger.info(f"Initialized node state: {self.node_id} as {'leader' if self.is_leader else 'follower'}")
        
node_state = NodeState()

# Define vote data model
class Vote(BaseModel):
    voter_id: str
    election_id: str
    candidate_id: str
    timestamp: float
    signature: str
    
    def __str__(self):
        return f"Vote(voter_id={self.voter_id}, election_id={self.election_id}, candidate_id={self.candidate_id})"

# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Generate request ID for tracing
    request_id = str(uuid.uuid4())
    
    api_logger.info(f"Request started: {request.method} {request.url.path}",
                  extra={"request_id": request_id, "client_ip": request.client.host})
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        api_logger.info(
            f"Request completed: {request.method} {request.url.path} - Status: {response.status_code} - Duration: {process_time:.4f}s",
            extra={"request_id": request_id, "status_code": response.status_code, "duration": process_time}
        )
        
        return response
    except Exception as e:
        api_logger.error(f"Request failed: {request.method} {request.url.path}", 
                       exc_info=True, extra={"request_id": request_id})
        raise

# Health check endpoint
@app.get("/health")
async def health_check():
    api_logger.debug("Health check requested")
    
    # Check Redis connection
    try:
        redis_alive = r.ping()
    except Exception as e:
        api_logger.error(f"Redis health check failed: {e}")
        redis_alive = False
    
    # Prepare response
    health_data = {
        "status": "healthy" if node_state.is_healthy and redis_alive else "unhealthy",
        "node_id": NODE_ID,
        "role": "leader" if node_state.is_leader else "follower",
        "connected_nodes": list(node_state.connected_nodes),
        "votes_processed": node_state.votes_processed,
        "system_time": node_state.system_time,
        "uptime": time.time() - node_state.start_time,
        "redis_connection": "ok" if redis_alive else "failed"
    }
    
    api_logger.info(f"Health check response: {health_data['status']}")
    
    if not health_data["status"] == "healthy":
        return health_data, 503  # Service Unavailable
    return health_data

# Message handlers
def handle_vote_proposal(message):
    """Handle a vote proposal from another node"""
    logger.info(f"Received vote proposal from {message['sender']}")
    # We'll implement this fully in the consensus protocol phase

def handle_time_sync(message):
    """Handle a time synchronization message"""
    if not node_state.is_leader:  # Only followers sync time
        new_time = message["data"]["system_time"]
        node_state.system_time = new_time
        logger.debug(f"Synchronized time to {new_time}")

def handle_leader_election(message):
    """Handle a leader election message"""
    logger.info(f"Leader election message from {message['sender']}: {message['data']}")
    # We'll implement this fully in the consensus protocol phase

# Node discovery and registration
@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 Node {NODE_ID} starting up with role: {NODE_ROLE}")
    
    try:
        # Register in Redis
        node_info = {
            "node_id": NODE_ID,
            "role": NODE_ROLE,
            "start_time": time.time(),
            "status": "active",
            "host": os.environ.get("HOSTNAME", "unknown")
        }
        r.hset(f"nodes:{NODE_ID}", mapping=node_info)
        logger.info(f"Registered node in Redis: {node_info}")
        
        # Initialize communicator
        communicator.initialize()
        communicator.register_handler("vote_proposal", handle_vote_proposal)
        communicator.register_handler("time_sync", handle_time_sync)
        communicator.register_handler("leader_election", handle_leader_election)
        
        # Start background tasks
        asyncio.create_task(heartbeat_task())
        asyncio.create_task(check_nodes_task())
        asyncio.create_task(communicator.listen_for_messages())
        logger.info("Started background monitoring tasks")
        
        # If leader, start leader-specific tasks
        if node_state.is_leader:
            logger.info(f"Node {NODE_ID} is the leader, starting leader-specific tasks")
            asyncio.create_task(leader_time_sync_task())
            
    except Exception as e:
        logger.critical(f"Startup failed: {e}", exc_info=True)
        node_state.is_healthy = False
        raise

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Node {NODE_ID} shutting down")
    try:
        # Notify other nodes about shutdown
        r.hset(f"nodes:{NODE_ID}", "status", "shutdown")
        r.expire(f"nodes:{NODE_ID}", 5)  # Short expiry
        
        # Additional cleanup if needed
        
        logger.info("Graceful shutdown completed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}", exc_info=True)

async def heartbeat_task():
    """Send periodic heartbeats to Redis to indicate node is alive"""
    heartbeat_logger.info("Starting heartbeat task")
    failures = 0
    
    while True:
        try:
            # Update heartbeat
            current_time = time.time()
            r.hset(f"nodes:{NODE_ID}", "last_heartbeat", current_time)
            r.hset(f"nodes:{NODE_ID}", "status", "active")
            r.expire(f"nodes:{NODE_ID}", 10)  # TTL of 10 seconds
            
            # Reset failure counter after successful heartbeat
            if failures > 0:
                heartbeat_logger.info(f"Redis connection restored after {failures} failures")
                failures = 0
                
            heartbeat_logger.debug(f"Heartbeat sent at {datetime.fromtimestamp(current_time).isoformat()}")
            await asyncio.sleep(2)
        except Exception as e:
            failures += 1
            heartbeat_logger.error(f"Error in heartbeat task (attempt {failures}): {e}")
            
            # After multiple failures, mark node as unhealthy
            if failures >= 5:
                heartbeat_logger.critical(f"Heartbeat task failing repeatedly, marking node as unhealthy")
                node_state.is_healthy = False
                
            await asyncio.sleep(5)  # Longer sleep on error

async def check_nodes_task():
    """Check which nodes are active by checking their heartbeats"""
    logger.info("Starting node monitoring task")
    
    while True:
        try:
            active_nodes = set()
            node_count = 0
            
            # Scan for all registered nodes
            for key in r.scan_iter("nodes:*"):
                node_count += 1
                node_data = r.hgetall(key)
                node_id = key.split(":", 1)[1]
                
                # Skip if it's our own node
                if node_id == NODE_ID:
                    continue
                    
                # Check if node is active (within last 10 seconds)
                last_heartbeat = float(node_data.get("last_heartbeat", 0))
                time_since_heartbeat = time.time() - last_heartbeat
                
                if time_since_heartbeat < 10:
                    active_nodes.add(node_id)
                    logger.debug(f"Node {node_id} is active, last heartbeat {time_since_heartbeat:.1f}s ago")
                else:
                    logger.warning(f"Node {node_id} appears inactive, last heartbeat {time_since_heartbeat:.1f}s ago")
                    
            # Update connected nodes
            old_nodes = node_state.connected_nodes.copy()
            node_state.connected_nodes = active_nodes
            
            # Log if there are changes in the active nodes
            if old_nodes != active_nodes:
                logger.info(f"Active nodes changed: {active_nodes}")
                
            # Log a summary
            logger.info(f"Node monitoring: {len(active_nodes)} active nodes out of {node_count-1} registered nodes")
                
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Error in check_nodes task: {e}", exc_info=True)
            await asyncio.sleep(5)
            
async def leader_time_sync_task():
    """If this is the leader node, periodically broadcast the system time"""
    consensus_logger.info("Starting leader time synchronization task")
    
    while True:
        if node_state.is_leader:
            try:
                current_time = time.time()
                r.set("system:time", current_time)
                r.publish("time_sync", json.dumps({
                    "sender": NODE_ID,
                    "system_time": current_time,
                    "timestamp": current_time
                }))
                
                consensus_logger.debug(f"Leader broadcast system time: {datetime.fromtimestamp(current_time).isoformat()}")
                await asyncio.sleep(10)
            except Exception as e:
                consensus_logger.error(f"Error in leader time sync task: {e}", exc_info=True)
                await asyncio.sleep(5)
        else:
            # If no longer the leader, exit this task
            consensus_logger.info("Node is no longer the leader, stopping time sync task")
            break

# Start server if running as main
if __name__ == "__main__":
    logger.info(f"Starting node server {NODE_ID} on port 5000")
    # Note: If running from command line directly with uvicorn, you can use the -d flag 
    # to run as daemon (background process): uvicorn node_server:app --host 0.0.0.0 --port 5000 -d
    # But this doesn't apply when running programmatically like below
    uvicorn.run("node_server:app", host="0.0.0.0", port=5000, log_level="info")