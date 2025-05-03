import time
import random
import asyncio
import logging

# Constants
MIN_ELECTION_TIMEOUT = 5.0  # seconds
MAX_ELECTION_TIMEOUT = 10.0  # seconds
LEADER_HEARTBEAT_INTERVAL = 2.0  # seconds
ELECTION_TIMEOUT_CHECK_INTERVAL = 0.5  # seconds

# Logger
logger = logging.getLogger("node.leader_election")
logger.setLevel(logging.DEBUG)

# References to be set during initialization
communicator = None
node_state = None

def init_leader_election(comm, state):
    """Initialize leader election with communicator and node state"""
    global communicator, node_state
    communicator = comm
    node_state = state
    
    # Initialize election state based on current role
    if node_state.is_leader:
        node_state.election_state = "leader"
        logger.info(f"Node {node_state.node_id} initialized as leader for term {node_state.current_term}")
    else:
        node_state.election_state = "follower" 
        logger.info(f"Node {node_state.node_id} initialized as follower for term {node_state.current_term}")

async def leader_heartbeat_task():
    """Leader sends periodic heartbeats to maintain leadership"""
    logger.info("Starting leader heartbeat task")
    
    while True:
        if node_state.election_state == "leader":
            try:
                # Send heartbeat to all followers
                logger.debug(f"Leader sending heartbeat for term {node_state.current_term}")
                communicator.send_message("leader_election", "leader_heartbeat", {
                    "term": node_state.current_term,
                    "leader_id": node_state.node_id,
                    "timestamp": time.time()
                })
            except Exception as e:
                logger.error(f"Error sending leader heartbeat: {e}")
        
        # Send heartbeats at regular intervals
        await asyncio.sleep(LEADER_HEARTBEAT_INTERVAL)

async def election_timeout_task():
    """Monitor leader heartbeats and start election if timeout occurs"""
    logger.info("Starting election timeout monitoring task")
    
    while True:
        try:
            # Only followers and candidates monitor timeout
            if node_state.election_state != "leader":
                current_time = time.time()
                time_since_heartbeat = current_time - node_state.last_leader_heartbeat
                
                # Check if we've timed out waiting for leader
                if time_since_heartbeat > node_state.election_timeout:
                    logger.warning(f"Election timeout after {time_since_heartbeat:.1f}s, starting election")
                    await start_election()
                    
                    # Reset timeout with jitter to prevent split votes
                    node_state.election_timeout = random.uniform(MIN_ELECTION_TIMEOUT, MAX_ELECTION_TIMEOUT)
                    logger.debug(f"New election timeout: {node_state.election_timeout:.1f}s")
        except Exception as e:
            logger.error(f"Error in election timeout task: {e}")
        
        await asyncio.sleep(ELECTION_TIMEOUT_CHECK_INTERVAL)

async def start_election():
    """Start a new election by becoming a candidate and requesting votes"""
    # Increment term and update state
    node_state.current_term += 1
    node_state.election_state = "candidate"
    node_state.voted_for = node_state.node_id  # Vote for self
    node_state.votes_received = {node_state.node_id}  # Count self-vote
    
    logger.info(f"Starting election for term {node_state.current_term}")
    
    # Reset heartbeat timestamp to avoid immediate re-election
    node_state.last_leader_heartbeat = time.time()
    
    # Request votes from all other nodes
    communicator.send_message("leader_election", "request_vote", {
        "term": node_state.current_term,
        "candidate_id": node_state.node_id,
        "timestamp": time.time()
    })
    
    # Wait for votes (responses will come through message handler)
    # We'll transition to leader if we receive majority votes

def handle_leader_election_message(message):
    """Process leader election related messages"""
    global node_state
    
    if not node_state:
        logger.warning("Node state not initialized, ignoring leader election message")
        return
    
    message_type = message.get("type", "")
    data = message.get("data", {})
    sender = message.get("sender", "unknown")
    term = data.get("term", 0)
    
    # Always update term if we see higher term
    if term > node_state.current_term:
        logger.info(f"Discovered higher term {term} from {sender}, updating local term")
        node_state.current_term = term
        node_state.voted_for = None
        
        # If we were leader or candidate, step down
        if node_state.election_state != "follower":
            node_state.election_state = "follower"
            node_state.is_leader = False
            logger.warning(f"Stepping down: higher term {term} detected from {sender}")
    
    # Process message based on type
    if message_type == "leader_heartbeat":
        handle_leader_heartbeat(data, sender, term)
    elif message_type == "request_vote":
        handle_vote_request(data, sender, term)
    elif message_type == "vote_response":
        handle_vote_response(data, sender, term)
    else:
        logger.warning(f"Unknown leader election message type: {message_type}")

def handle_leader_heartbeat(data, sender, term):
    """Process heartbeat from leader"""
    # Accept heartbeat if term is current or higher
    if term >= node_state.current_term:
        # Update leader information
        leader_id = data.get("leader_id")
        logger.debug(f"Received heartbeat from leader {leader_id} for term {term}")
        
        # Update state
        node_state.last_leader_heartbeat = time.time()
        node_state.current_term = term
        node_state.current_leader = leader_id  # Track recognized leader
        
        # Ensure we're in follower state
        if node_state.election_state != "follower" and sender != node_state.node_id:
            node_state.election_state = "follower"
            node_state.is_leader = False
            logger.info(f"Node {node_state.node_id} becoming follower for term {term}, recognizing leader {leader_id}")
        
        # Reset election timeout with jitter
        node_state.election_timeout = random.uniform(MIN_ELECTION_TIMEOUT, MAX_ELECTION_TIMEOUT)
        
def handle_vote_request(data, sender, term):
    """Process vote request from a candidate"""
    candidate_id = data.get("candidate_id")
    
    # Determine if we should grant our vote
    grant_vote = False
    
    # Vote if:
    # 1. The candidate's term is at least as high as ours
    # 2. We haven't voted for anyone else in this term
    if term >= node_state.current_term and (node_state.voted_for is None or node_state.voted_for == candidate_id):
        grant_vote = True
        node_state.voted_for = candidate_id
        logger.info(f"Granting vote to candidate {candidate_id} for term {term}")
    else:
        logger.info(f"Rejecting vote for candidate {candidate_id} for term {term}, already voted for {node_state.voted_for}")
    
    # Send vote response
    communicator.send_message("leader_election", "vote_response", {
        "term": node_state.current_term,
        "vote_granted": grant_vote,
        "candidate_id": candidate_id
    })

def handle_vote_response(data, sender, term):
    """Process vote response from another node"""
    # Only care about vote responses if we're still a candidate
    if node_state.election_state != "candidate":
        return
    
    # Check if vote was granted
    vote_granted = data.get("vote_granted", False)
    candidate_id = data.get("candidate_id")
    
    # If the vote is for us and was granted
    if candidate_id == node_state.node_id and vote_granted:
        # Track votes received
        if not hasattr(node_state, 'votes_received'):
            node_state.votes_received = set([node_state.node_id])  # Start with self-vote
        
        node_state.votes_received.add(sender)
        logger.info(f"Received vote from {sender}, total votes: {len(node_state.votes_received)}")
        
        # Check if we have majority
        total_nodes = len(node_state.connected_nodes) + 1  # +1 for self
        votes_needed = total_nodes // 2 + 1
        
        if len(node_state.votes_received) >= votes_needed:
            # We won the election!
            become_leader()

def become_leader():
    """Transition to leader state after winning election"""
    node_state.election_state = "leader"
    node_state.is_leader = True
    
    logger.info(f"Node {node_state.node_id} became leader for term {node_state.current_term}")
    
    # Send immediate heartbeat to establish authority
    communicator.send_message("leader_election", "leader_heartbeat", {
        "term": node_state.current_term,
        "leader_id": node_state.node_id,
        "timestamp": time.time()
    })

def get_election_info():
    """Get information about the current election state"""
    if not node_state:
        return {"initialized": False}
    
    # Determine recognized leader
    recognized_leader = None
    if node_state.election_state == "leader":
        recognized_leader = node_state.node_id
    elif hasattr(node_state, 'current_leader') and node_state.current_leader:
        recognized_leader = node_state.current_leader
    
    return {
        "node_id": node_state.node_id,
        "state": node_state.election_state,
        "term": node_state.current_term,
        "is_leader": node_state.is_leader,
        "voted_for": node_state.voted_for,
        "recognized_leader": recognized_leader,
        "election_timeout": f"{node_state.election_timeout:.1f}s",
        "time_since_heartbeat": f"{time.time() - node_state.last_leader_heartbeat:.1f}s",
        "votes": len(getattr(node_state, 'votes_received', set())) if hasattr(node_state, 'votes_received') else 0
    }