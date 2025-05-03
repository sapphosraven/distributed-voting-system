import os
import time
import json
import uuid
import uvicorn
import redis
import hashlib
from redis.cluster import RedisCluster, ClusterNode
import asyncio
from fastapi import FastAPI, WebSocket, HTTPException, Depends, BackgroundTasks, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional, Set, Union, Any
from datetime import datetime

# Import our custom logger
from logger_config import setup_logger

# Node configuration from environment variables
NODE_ID = os.environ.get("NODE_ID", "node1")
NODE_ROLE = os.environ.get("NODE_ROLE", "follower")
# Redis Cluster configuration
REDIS_NODES = os.environ.get("REDIS_NODES", "localhost:7000,localhost:7001,localhost:7002")
LOG_DIR = os.environ.get("LOG_DIR", "../logs")

# Set up loggers
logger = setup_logger("node", log_dir=LOG_DIR, node_id=NODE_ID)
api_logger = setup_logger("node.api", log_dir=LOG_DIR, node_id=NODE_ID)
heartbeat_logger = setup_logger("node.heartbeat", log_dir=LOG_DIR, node_id=NODE_ID)
consensus_logger = setup_logger("node.consensus", log_dir=LOG_DIR, node_id=NODE_ID)

# Redis Cluster client with retry mechanism
def connect_to_redis_cluster(max_retries=10, initial_backoff=1):
    """Connect to Redis Cluster with retry logic and exponential backoff"""
    # Parse Redis Cluster nodes from environment variable
    startup_nodes = []
    for node in REDIS_NODES.split(','):
        host, port = node.split(':')
        # Use ClusterNode objects instead of dictionaries
        startup_nodes.append(ClusterNode(host=host, port=int(port)))
    
    retry_count = 0
    last_error = None
    backoff = initial_backoff
    
    while retry_count < max_retries:
        try:
            logger.info(f"Connecting to Redis Cluster at {REDIS_NODES} (attempt {retry_count + 1}/{max_retries})")
            
            # Connect to Redis Cluster with longer timeouts for startup
            redis_cluster = RedisCluster(
                startup_nodes=startup_nodes, 
                decode_responses=True,
                socket_timeout=30.0,
                socket_connect_timeout=30.0,
                retry_on_timeout=True
            )
            
            # Test that the cluster is ready by checking its state and slot coverage
            cluster_info = redis_cluster.cluster_info()
            cluster_state = cluster_info.get('cluster_state', 'unknown')
            
            if cluster_state != 'ok':
                raise redis.exceptions.RedisClusterException(
                    f"Cluster not ready: state is '{cluster_state}'"
                )
                
            # Check slot coverage by querying CLUSTER SLOTS
            slots = redis_cluster.cluster_slots()
            if not slots:
                raise redis.exceptions.RedisClusterException("No slots configured in cluster")
                
            logger.info(f"Successfully connected to Redis Cluster - cluster state: {cluster_state}")
            return redis_cluster
            
        except Exception as e:
            last_error = e
            retry_count += 1
            
            if retry_count >= max_retries:
                logger.error(f"Failed to connect after {max_retries} attempts")
                break
                
            logger.warning(f"Connection attempt {retry_count} failed: {e}")
            logger.info(f"Waiting {backoff} seconds before next attempt...")
            
            # Sleep with exponential backoff
            time.sleep(backoff)
            backoff = min(backoff * 2, 30)  # Cap at 30 seconds
    
    # If we get here, all retries failed
    raise last_error or redis.exceptions.RedisError("Failed to connect to Redis Cluster")

# Global variables to store Redis connection and node state
r = None
communicator = None
node_state = None
consensus = None

# Define startup and shutdown handlers using the new lifespan API
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize services on startup
    global r, communicator, node_state, consensus
    
    logger.info(f"🚀 Node {NODE_ID} starting up with role: {NODE_ROLE}")
    
    try:
        # Connect with retry logic
        r = connect_to_redis_cluster()
        logger.info(f"Connected to Redis Cluster at {REDIS_NODES}")
        
        # Import node communicator after Redis setup
        from node_communication import NodeCommunicator

        # Initialize communicator with Redis Cluster
        communicator = NodeCommunicator(r, NODE_ID)
        
        # Register in Redis Cluster - using hash slot aware key generation
        node_key = f"{{nodes}}.{NODE_ID}"  # Using {} to ensure keys with the same prefix are in the same slot
        node_info = {
            "node_id": NODE_ID,
            "role": NODE_ROLE,
            "start_time": time.time(),
            "status": "active",
            "host": os.environ.get("HOSTNAME", "unknown")
        }
        r.hset(node_key, mapping=node_info)
        logger.info(f"Registered node in Redis Cluster: {node_info}")
        
        # Initialize communicator
        communicator.initialize()
        communicator.register_handler("vote_proposal", handle_vote_proposal)
        communicator.register_handler("vote_response", handle_vote_acknowledgment)
        communicator.register_handler("vote_finalization", handle_vote_finalization)
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
            asyncio.create_task(clock_sync.leader_time_sync_loop())
        else:
            asyncio.create_task(clock_sync.drift_detection_loop())
        
        yield
        
        # Cleanup on shutdown
        logger.info(f"Node {NODE_ID} shutting down")
        try:
            # Notify other nodes about shutdown - using hash slot aware key
            node_key = f"{{nodes}}.{NODE_ID}"
            r.hset(node_key, "status", "shutdown")
            r.expire(node_key, 5)  # Short expiry
            
            # Additional cleanup if needed
            
            logger.info("Graceful shutdown completed")
        except Exception as e:
            logger.error(f"Error during shutdown: {e}", exc_info=True)
        
    except Exception as e:
        logger.critical(f"Startup failed: {e}", exc_info=True)
        if node_state:
            node_state.is_healthy = False
        yield
        # Continue with shutdown even if startup failed

# Create FastAPI app with the lifespan handler
app = FastAPI(
    title=f"Voting System Node - {NODE_ID}",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        
# Initialize node state
node_state = NodeState()

# Initialize consensus tracking
class ConsensusState:
    def __init__(self):
        self.pending_votes: Dict[str, Vote] = {}  # vote_id -> Vote
        self.vote_approvals: Dict[str, Set[str]] = {}  # vote_id -> {node_ids}
        self.finalized_votes: Dict[str, Vote] = {}  # vote_id -> Vote
        self.voter_history: Dict[str, Dict[str, str]] = {}  # voter_id -> {election_id -> vote_id}
        
consensus = ConsensusState()

# Initialize clock sync module after node_state is created
import clock_sync
clock_sync.init_clock_sync(communicator, node_state)

# Enhanced vote data model with validation
class Vote(BaseModel):
    voter_id: str
    election_id: str
    candidate_id: str
    timestamp: float = Field(default_factory=time.time)
    signature: str = ""
    
    @field_validator('voter_id', 'election_id', 'candidate_id')
    def check_not_empty(cls, v, info):
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} cannot be empty")
        return v
    
    def __str__(self):
        return f"Vote(voter_id={self.voter_id}, election_id={self.election_id}, candidate_id={self.candidate_id})"
    
    def compute_hash(self) -> str:
        """Compute a hash of the vote data for verification purposes"""
        content = f"{self.voter_id}:{self.election_id}:{self.candidate_id}:{self.timestamp}"
        return hashlib.sha256(content.encode()).hexdigest()

# Consensus state tracking
class ConsensusState:
    def __init__(self):
        self.pending_votes: Dict[str, Vote] = {}  # vote_id -> Vote
        self.vote_approvals: Dict[str, Set[str]] = {}  # vote_id -> {node_ids}
        self.finalized_votes: Dict[str, Vote] = {}  # vote_id -> Vote
        self.voter_history: Dict[str, Dict[str, str]] = {}  # voter_id -> {election_id -> vote_id}
        
consensus = ConsensusState()

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

# Health check endpoint - Updated to show Redis Cluster status
@app.get("/health")
async def health_check():
    api_logger.debug("Health check requested")
    
    # Check Redis Cluster connection and status
    try:
        redis_alive = r.ping()
        # Get cluster info for health check
        cluster_info = {
            "cluster_size": len(r.cluster_nodes()),
            "cluster_state": r.cluster_info().get("cluster_state", "unknown")
        }
    except Exception as e:
        api_logger.error(f"Redis Cluster health check failed: {e}")
        redis_alive = False
        cluster_info = {"error": str(e)}
    
    # Get clock sync information
    clock_info = clock_sync.get_drift_info()
    
    # Prepare response
    health_data = {
        "status": "healthy" if node_state.is_healthy and redis_alive else "unhealthy",
        "node_id": NODE_ID,
        "role": "leader" if node_state.is_leader else "follower",
        "connected_nodes": list(node_state.connected_nodes),
        "votes_processed": node_state.votes_processed,
        "system_time": node_state.system_time,
        "uptime": time.time() - node_state.start_time,
        "redis_cluster": cluster_info,
        "clock_sync": clock_info
    }
    
    api_logger.info(f"Health check response: {health_data['status']}")
    
    if not health_data["status"] == "healthy":
        return Response(content=json.dumps(health_data), status_code=503, media_type="application/json")
    return health_data

# Vote API endpoints
@app.post("/votes", status_code=status.HTTP_202_ACCEPTED)
async def submit_vote(vote: Vote, background_tasks: BackgroundTasks):
    """Submit a vote for processing"""
    api_logger.info(f"Received vote from voter {vote.voter_id} for election {vote.election_id}")
    
    # Generate a unique ID for this vote
    vote_id = f"{vote.election_id}:{vote.voter_id}:{uuid.uuid4()}"
    
    # Validate the vote (basic checks)
    validation_result = await validate_vote(vote)
    if not validation_result["valid"]:
        api_logger.warning(f"Vote validation failed: {validation_result['reason']}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_result["reason"]
        )
    
    # Check for duplicate votes
    if vote.voter_id in consensus.voter_history and vote.election_id in consensus.voter_history[vote.voter_id]:
        api_logger.warning(f"Duplicate vote detected from {vote.voter_id} for election {vote.election_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voter has already cast a vote in this election"
        )
    
    # Store vote in pending votes
    consensus.pending_votes[vote_id] = vote
    
    # Initialize approvals with this node
    consensus.vote_approvals[vote_id] = {NODE_ID}
    
    # Start consensus process in background
    background_tasks.add_task(start_consensus_process, vote_id, vote)
    
    return {"status": "accepted", "vote_id": vote_id}

@app.get("/votes/{vote_id}")
async def get_vote_status(vote_id: str):
    """Get the status of a specific vote"""
    # Check if vote is finalized
    if vote_id in consensus.finalized_votes:
        return {
            "status": "finalized",
            "vote": consensus.finalized_votes[vote_id]
        }
    
    # Check if vote is pending
    if vote_id in consensus.pending_votes:
        node_count = len(node_state.connected_nodes) + 1  # +1 for this node
        approval_count = len(consensus.vote_approvals.get(vote_id, set()))
        
        return {
            "status": "pending",
            "approvals": approval_count,
            "total_nodes": node_count,
            "approval_percentage": int(100 * approval_count / max(1, node_count))
        }
    
    # Vote not found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Vote not found"
    )

@app.get("/elections/{election_id}/results")
async def get_election_results(election_id: str):
    """Get the current results for an election"""
    # Filter finalized votes for this election
    election_votes = [vote for vote in consensus.finalized_votes.values() 
                      if vote.election_id == election_id]
    
    if not election_votes:
        return {"election_id": election_id, "total_votes": 0, "results": {}}
    
    # Count votes per candidate
    results = {}
    for vote in election_votes:
        candidate_id = vote.candidate_id
        results[candidate_id] = results.get(candidate_id, 0) + 1
    
    return {
        "election_id": election_id,
        "total_votes": len(election_votes),
        "results": results
    }

# Vote validation function
async def validate_vote(vote: Vote) -> Dict[str, Any]:
    """Validate a vote for basic issues"""
    # Here we'd normally verify the digital signature, but simplified for now
    
    # Check for missing fields
    if not vote.voter_id or not vote.election_id or not vote.candidate_id:
        return {"valid": False, "reason": "Missing required fields"}
    
    # Check timestamp is not in the future
    if vote.timestamp > time.time() + 5:  # 5 seconds tolerance for clock skew
        return {"valid": False, "reason": "Vote timestamp is in the future"}
    
    # Here you would add more validation like checking voter eligibility,
    # whether the election is active, etc. - this would involve database lookups
    
    return {"valid": True}

# Consensus process
async def start_consensus_process(vote_id: str, vote: Vote):
    """Start the consensus process for a vote"""
    logger.info(f"Starting consensus process for vote {vote_id}")
    
    # If we're the leader, broadcast the vote proposal to followers
    if node_state.is_leader:
        await broadcast_vote_proposal(vote_id, vote)
    else:
        # If we're not the leader, forward the vote to the leader
        # Find the leader node
        leader_node = None
        for node_key in r.scan_iter("{nodes}.*"):
            node_data = r.hgetall(node_key)
            if node_data.get("role") == "leader" and node_data.get("status") == "active":
                leader_node = node_data.get("node_id")
                break
        
        if leader_node:
            logger.info(f"Forwarding vote {vote_id} to leader node {leader_node}")
            communicator.send_message("vote_proposal", "vote_forward", {
                "vote_id": vote_id,
                "vote": vote.dict()
            })
        else:
            logger.warning("No active leader found for vote forwarding")
    
    # Check consensus achievement periodically
    await check_consensus(vote_id)

async def broadcast_vote_proposal(vote_id: str, vote: Vote):
    """Broadcast a vote proposal to all nodes for approval"""
    logger.info(f"Broadcasting vote proposal {vote_id} to all nodes")
    
    communicator.send_message("vote_proposal", "vote_propose", {
        "vote_id": vote_id,
        "vote": vote.dict()
    })

async def check_consensus(vote_id: str):
    """Check if consensus has been achieved for a vote"""
    # Wait a bit to allow for votes to be received
    await asyncio.sleep(2)
    
    # If vote isn't in pending votes anymore, it's already been finalized or rejected
    if vote_id not in consensus.pending_votes:
        logger.debug(f"Vote {vote_id} is no longer pending")
        return
    
    # Get total node count (including this node)
    node_count = len(node_state.connected_nodes) + 1
    
    # Get approval count
    approvals = consensus.vote_approvals.get(vote_id, set())
    approval_count = len(approvals)
    
    # Check if we've reached a majority
    if approval_count > node_count / 2:
        logger.info(f"Consensus achieved for vote {vote_id} with {approval_count}/{node_count} approvals")
        await finalize_vote(vote_id)
    else:
        logger.debug(f"Consensus not yet achieved for vote {vote_id}: {approval_count}/{node_count} approvals")
        
        # Retry after a delay if we haven't reached consensus
        if vote_id in consensus.pending_votes:
            await asyncio.sleep(3)
            await check_consensus(vote_id)

async def finalize_vote(vote_id: str):
    """Finalize a vote once consensus is achieved"""
    if vote_id not in consensus.pending_votes:
        return
        
    vote = consensus.pending_votes[vote_id]
    
    # Move vote from pending to finalized
    consensus.finalized_votes[vote_id] = vote
    del consensus.pending_votes[vote_id]
    
    # Record voter history to prevent duplicate votes
    if vote.voter_id not in consensus.voter_history:
        consensus.voter_history[vote.voter_id] = {}
    consensus.voter_history[vote.voter_id][vote.election_id] = vote_id
    
    # Update vote count
    node_state.votes_processed += 1
    
    logger.info(f"Vote {vote_id} finalized and recorded")
    
    # If we're the leader, broadcast the finalization to all nodes
    if node_state.is_leader:
        communicator.send_message("vote_finalization", "vote_finalized", {
            "vote_id": vote_id,
            "vote": vote.dict()
        })

# Enhanced message handlers
def handle_vote_proposal(message):
    """Handle a vote proposal from another node"""
    data = message.get("data", {})
    sender = message.get("sender", "unknown")
    
    # Extract vote data
    vote_id = data.get("vote_id")
    vote_data = data.get("vote")
    
    if not vote_id or not vote_data:
        logger.warning(f"Received invalid vote proposal from {sender}: missing vote_id or vote data")
        return
    
    logger.info(f"Received vote proposal {vote_id} from {sender}")
    
    # Convert to Vote object
    try:
        vote = Vote(**vote_data)
        
        # Add to pending votes if not already there
        if vote_id not in consensus.pending_votes:
            consensus.pending_votes[vote_id] = vote
        
        # Initialize approvals if needed
        if vote_id not in consensus.vote_approvals:
            consensus.vote_approvals[vote_id] = set()
        
        # Record our approval
        consensus.vote_approvals[vote_id].add(NODE_ID)
        
        # Record sender's approval
        consensus.vote_approvals[vote_id].add(sender)
        
        # Respond with acknowledgment
        communicator.send_message("vote_response", "vote_acknowledge", {
            "vote_id": vote_id,
            "status": "approved"
        })
        
        # If we're the leader, check for consensus
        if node_state.is_leader:
            asyncio.create_task(check_consensus(vote_id))
            
    except Exception as e:
        logger.error(f"Error processing vote proposal {vote_id} from {sender}: {e}", exc_info=True)

def handle_vote_acknowledgment(message):
    """Handle a vote acknowledgment from another node"""
    data = message.get("data", {})
    sender = message.get("sender", "unknown")
    
    # Extract vote info
    vote_id = data.get("vote_id")
    status = data.get("status")
    
    if not vote_id:
        logger.warning(f"Received invalid vote acknowledgment from {sender}: missing vote_id")
        return
    
    if status == "approved":
        logger.info(f"Received approval for vote {vote_id} from {sender}")
        
        # Record approval
        if vote_id not in consensus.vote_approvals:
            consensus.vote_approvals[vote_id] = set()
        
        consensus.vote_approvals[vote_id].add(sender)
        
        # If we're the leader, check for consensus
        if node_state.is_leader:
            asyncio.create_task(check_consensus(vote_id))
    else:
        logger.warning(f"Received rejection for vote {vote_id} from {sender}")

def handle_vote_finalization(message):
    """Handle a vote finalization from the leader"""
    data = message.get("data", {})
    sender = message.get("sender", "unknown")
    
    # Extract vote info
    vote_id = data.get("vote_id")
    vote_data = data.get("vote")
    
    if not vote_id or not vote_data:
        logger.warning(f"Received invalid vote finalization from {sender}: missing vote_id or vote data")
        return
    
    logger.info(f"Received vote finalization for {vote_id} from {sender}")
    
    try:
        vote = Vote(**vote_data)
        
        # Record in finalized votes
        consensus.finalized_votes[vote_id] = vote
        
        # Remove from pending if present
        if vote_id in consensus.pending_votes:
            del consensus.pending_votes[vote_id]
        
        # Record voter history
        if vote.voter_id not in consensus.voter_history:
            consensus.voter_history[vote.voter_id] = {}
            
        consensus.voter_history[vote.voter_id][vote.election_id] = vote_id
        
        # Update vote count
        node_state.votes_processed += 1
        
        logger.info(f"Vote {vote_id} finalized based on leader decision")
        
    except Exception as e:
        logger.error(f"Error processing vote finalization {vote_id} from {sender}: {e}")

def handle_time_sync(message):
    """Handle time synchronization messages from the leader or followers"""
    # Pass the complete message to the clock sync module
    clock_sync.handle_time_sync_message(message)

def handle_leader_election(message):
    """Handle leader election messages"""
    # This will be implemented more fully in the leader election phase
    data = message.get("data", {})
    sender = message.get("sender", "unknown")
    
    logger.info(f"Received leader election message from {sender}")
    # Basic acknowledgment for now
    if "candidate" in data:
        logger.info(f"Node {data['candidate']} is proposing itself as leader")

async def heartbeat_task():
    """Send periodic heartbeats to Redis to indicate node is alive"""
    heartbeat_logger.info("Starting heartbeat task")
    failures = 0
    
    while True:
        try:
            # Update heartbeat - using hash slot aware key
            current_time = time.time()
            node_key = f"{{nodes}}.{NODE_ID}"
            r.hset(node_key, "last_heartbeat", current_time)
            r.hset(node_key, "status", "active")
            r.expire(node_key, 10)  # TTL of 10 seconds
            
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
            
            # Scan for all registered nodes - using hash slot aware pattern
            for key in r.scan_iter("{nodes}.*"):
                node_count += 1
                node_data = r.hgetall(key)
                node_id = key.split(".", 1)[1]  # Extract node_id from key format {nodes}.node1
                
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
                # Store global system time - using hash slot aware key
                r.set("{system}.time", current_time)
                # Publish time sync message
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