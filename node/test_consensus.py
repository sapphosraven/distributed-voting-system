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

def wait_for_finalization(vote_ids, responsive_nodes, retries=5, delay=5):
    """Wait for all votes to be finalized"""
    logger.info("Waiting for all votes to be finalized...")
    finalized_votes = set()
    
    for attempt in range(retries):
        for vote_id in vote_ids:
            if vote_id in finalized_votes:
                continue
            
            port = random.choice(responsive_nodes)
            status = check_vote_status(port, vote_id)
            
            if status and status.get("status") == "finalized":
                finalized_votes.add(vote_id)
        
        if len(finalized_votes) == len(vote_ids):
            logger.info("All votes have been finalized.")
            return True
        
        logger.info(f"Finalization progress: {len(finalized_votes)}/{len(vote_ids)} votes finalized. Retrying in {delay}s...")
        time.sleep(delay)
    
    logger.warning(f"Finalization incomplete after {retries} retries: {len(finalized_votes)}/{len(vote_ids)} votes finalized.")
    return False

def verify_tally(vote_data, election_id, responsive_nodes):
    """Verify that the election results match the submitted votes"""
    logger.info("Verifying vote tally...")
    port = random.choice(responsive_nodes)
    results = check_election_results(port, election_id)
    
    if not results:
        logger.error("Failed to fetch election results for verification.")
        return False
    
    # Count submitted votes per candidate
    submitted_tally = {}
    for vote_id, candidate_id in vote_data.items():
        submitted_tally[candidate_id] = submitted_tally.get(candidate_id, 0) + 1
    
    # Compare with results
    total_expected = sum(submitted_tally.values())
    total_actual = results.get("total_votes", 0)
    
    if total_expected != total_actual:
        logger.error(f"Vote count mismatch: expected {total_expected}, got {total_actual}")
        return False
    
    for candidate, count in submitted_tally.items():
        if results["results"].get(candidate, 0) != count:
            logger.error(f"Tally mismatch for {candidate}: expected {count}, got {results['results'].get(candidate, 0)}")
            return False
    
    logger.info("Vote tally verification successful.")
    return True

def clear_election_results(node_port, election_id):
    """Clear the results for a specific election (for testing purposes)"""
    try:
        url = f"http://{DEFAULT_HOST}:{node_port}/elections/{election_id}/clear"
        response = requests.delete(url)
        
        if response.status_code == 200:
            logger.info(f"Successfully cleared results for election {election_id}")
            return True
        else:
            logger.error(f"Failed to clear election results via HTTP: {response.status_code} - {response.text}")
            # Fallback to Redis CLI if HTTP fails
            return clear_tally_directly(election_id)
    except Exception as e:
        logger.error(f"Error clearing election results via HTTP: {e}")
        # Fallback to Redis CLI if HTTP fails
        return clear_tally_directly(election_id)

def clear_tally_directly(election_id):
    """Fallback to clearing the tally directly using Redis CLI"""
    try:
        import redis
        r = redis.Redis(host="localhost", port=7000)  # Connect to the first Redis node
        tally_key = f"{{tally}}.{election_id}"
        if r.delete(tally_key):
            logger.info(f"Successfully cleared tally key {tally_key} directly in Redis")
            return True
        else:
            logger.warning(f"Tally key {tally_key} does not exist or could not be cleared")
            return False
    except Exception as e:
        logger.error(f"Error clearing tally key directly in Redis: {e}")
        return False

def reset_election(node_port, election_id):
    """Reset the election by clearing all related data (for testing purposes)"""
    try:
        url = f"http://{DEFAULT_HOST}:{node_port}/elections/{election_id}/reset"
        response = requests.post(url)
        
        if response.status_code == 200:
            logger.info(f"Successfully reset election {election_id}")
            return True
        else:
            logger.error(f"Failed to reset election: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error resetting election: {e}")
        return False

def run_test(num_votes=DEFAULT_NUM_VOTES, election_id=DEFAULT_ELECTION_ID, reset_results=True):
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
    
    # Reset election if requested
    if reset_results:
        logger.info(f"Resetting election {election_id}")
        port = random.choice(responsive_nodes)
        if not reset_election(port, election_id):
            logger.warning(f"Could not reset election {election_id}. Counts may be inaccurate.")
    
    # Submit votes
    vote_ids = []
    vote_data = {}  # Store the vote data for verification
    
    for i in range(num_votes):
        voter_id = f"voter-{uuid.uuid4()}"
        candidate_id = random.choice(DEFAULT_CANDIDATES)
        port = random.choice(responsive_nodes)
        
        vote_id = submit_vote(port, voter_id, election_id, candidate_id)
        if vote_id:
            vote_ids.append(vote_id)
            vote_data[vote_id] = candidate_id  # Store the candidate for this vote
    
    logger.info(f"Submitted {len(vote_ids)} votes successfully")
    
    # Wait for consensus to be reached
    if not wait_for_finalization(vote_ids, responsive_nodes):
        logger.error("Not all votes were finalized. Test failed.")
        return False
    
    # Verify election results - update to use stored vote data
    if not verify_tally(vote_data, election_id, responsive_nodes):
        logger.error("Vote tally verification failed. Test failed.")
        return False
    
    logger.info("Test completed successfully. All votes finalized and tally verified.")
    return True

if __name__ == "__main__":
    # Parse arguments
    num_votes = DEFAULT_NUM_VOTES
    clear_results = True
    
    if len(sys.argv) > 1:
        try:
            num_votes = int(sys.argv[1])
        except:
            pass
    
    if len(sys.argv) > 2 and sys.argv[2].lower() == "false":
        clear_results = False
    
    # Run the test
    success = run_test(num_votes, DEFAULT_ELECTION_ID, clear_results)
    sys.exit(0 if success else 1)
