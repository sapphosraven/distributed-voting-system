import requests
import time
import json
import uuid
import random
import sys
import logging
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("consensus-test")

# Configuration
DEFAULT_HOST = "localhost"
DEFAULT_PORTS = [5001, 5002, 5003]  # Node ports
DEFAULT_NUM_VOTES = 5
DEFAULT_ELECTION_ID = "election-2025"
DEFAULT_CANDIDATES = ["candidate-1", "candidate-2", "candidate-3"]

def submit_vote(node_port, voter_id, election_id, candidate_id):
    """Submit a vote to a node"""
    try:
        url = f"http://{DEFAULT_HOST}:{node_port}/votes"
        data = {
            "voter_id": voter_id,
            "election_id": election_id,
            "candidate_id": candidate_id,
            "timestamp": time.time(),
            "signature": "test-signature"  # In production, this would be a real signature
        }
        
        logger.info(f"Submitting vote for {voter_id} to node on port {node_port}")
        response = requests.post(url, json=data)
        
        if response.status_code == 202:  # Accepted
            result = response.json()
            vote_id = result.get("vote_id")
            logger.info(f"Vote accepted with ID: {vote_id}")
            return vote_id
        else:
            logger.error(f"Vote submission failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error submitting vote: {e}")
        return None

def check_vote_status(node_port, vote_id):
    """Check the status of a vote"""
    try:
        url = f"http://{DEFAULT_HOST}:{node_port}/votes/{vote_id}"
        response = requests.get(url)
        
        if response.status_code == 200:
            status = response.json()
            logger.info(f"Vote {vote_id} status: {json.dumps(status)}")
            return status
        else:
            logger.error(f"Failed to get vote status: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error checking vote status: {e}")
        return None

def check_election_results(node_port, election_id):
    """Check the results of an election"""
    try:
        url = f"http://{DEFAULT_HOST}:{node_port}/elections/{election_id}/results"
        response = requests.get(url)
        
        if response.status_code == 200:
            results = response.json()
            logger.info(f"Election {election_id} results: {json.dumps(results)}")
            return results
        else:
            logger.error(f"Failed to get election results: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error checking election results: {e}")
        return None

def run_test(num_votes=DEFAULT_NUM_VOTES, election_id=DEFAULT_ELECTION_ID):
    """Run a test of the voting system"""
    logger.info(f"Starting consensus test with {num_votes} votes")
    
    # Check if at least one node is responsive
    responsive_nodes = []
    for port in DEFAULT_PORTS:
        try:
            health_url = f"http://{DEFAULT_HOST}:{port}/health"
            response = requests.get(health_url, timeout=2)
            if response.status_code == 200:
                responsive_nodes.append(port)
        except:
            pass
    
    if not responsive_nodes:
        logger.error("No responsive nodes found. Make sure the voting system is running.")
        return False
    
    logger.info(f"Found {len(responsive_nodes)} responsive nodes: {responsive_nodes}")
    
    # Submit votes
    vote_ids = []
    for i in range(num_votes):
        voter_id = f"voter-{uuid.uuid4()}"
        candidate_id = random.choice(DEFAULT_CANDIDATES)
        port = random.choice(responsive_nodes)
        
        vote_id = submit_vote(port, voter_id, election_id, candidate_id)
        if vote_id:
            vote_ids.append(vote_id)
    
    logger.info(f"Submitted {len(vote_ids)} votes successfully")
    
    # Wait for consensus to be reached
    logger.info("Waiting for consensus to be reached...")
    time.sleep(5)
    
    # Check status of all votes
    finalized_votes = 0
    for vote_id in vote_ids:
        port = random.choice(responsive_nodes)
        status = check_vote_status(port, vote_id)
        
        if status and status.get("status") == "finalized":
            finalized_votes += 1
    
    logger.info(f"{finalized_votes} out of {len(vote_ids)} votes have been finalized")
    
    # Check election results
    port = random.choice(responsive_nodes)
    results = check_election_results(port, election_id)
    
    if results:
        logger.info(f"Test completed. Total votes counted: {results.get('total_votes', 0)}")
        return True
    else:
        logger.error("Failed to retrieve election results")
        return False

if __name__ == "__main__":
    # Parse arguments
    num_votes = DEFAULT_NUM_VOTES
    if len(sys.argv) > 1:
        try:
            num_votes = int(sys.argv[1])
        except:
            pass
    
    # Run the test
    success = run_test(num_votes)
    sys.exit(0 if success else 1)
