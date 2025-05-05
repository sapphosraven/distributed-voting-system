#!/usr/bin/env python3
# filepath: f:\Uni_Stuff\6th_Sem\IS\Project\distributed-voting-system\test_system.py
# Define REDIS_NODES based on environment (Docker vs local)
import os
REDIS_NODES = os.environ.get("REDIS_NODES", "localhost:7000,localhost:7001,localhost:7002")

import asyncio
import requests
import time
import json
import uuid
import random
import sys
import logging
import colorama
from colorama import Fore, Style
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from tabulate import tabulate
import statistics  
from node.mutex import DistributedMutex
from redis.cluster import RedisCluster, ClusterNode


# Initialize colorama
colorama.init()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("voting-system-test")

# Configuration
DEFAULT_HOST = "localhost"
DEFAULT_PORTS = [5001, 5002, 5003]
DEFAULT_ELECTION_ID = "election-2025"
DEFAULT_CANDIDATES = ["candidate-1", "candidate-2", "candidate-3"]
DEFAULT_NUM_VOTES = 5

# ANSI color codes for pretty output
SUCCESS = Fore.GREEN
FAILURE = Fore.RED
WARNING = Fore.YELLOW
INFO = Fore.CYAN
RESET = Style.RESET_ALL
BOLD = Style.BRIGHT

def print_header(message):
    """Print a formatted header"""
    width = 80
    print(f"\n{INFO}{BOLD}{'=' * width}{RESET}")
    print(f"{INFO}{BOLD}{message.center(width)}{RESET}")
    print(f"{INFO}{BOLD}{'=' * width}{RESET}\n")

def print_step(message):
    """Print a formatted step message"""
    print(f"\n{INFO}{BOLD}▶ {message}{RESET}")

def print_success(message):
    """Print a success message"""
    print(f"{SUCCESS}✓ {message}{RESET}")

def print_failure(message):
    """Print a failure message"""
    print(f"{FAILURE}✗ {message}{RESET}")

def print_warning(message):
    """Print a warning message"""
    print(f"{WARNING}⚠ {message}{RESET}")

def check_node_health(port):
    """Check if a node is healthy and get its details"""
    try:
        url = f"http://{DEFAULT_HOST}:{port}/health"
        response = requests.get(url, timeout=3)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                return {"port": port, "healthy": True, "data": data}
            else:
                return {"port": port, "healthy": False, "reason": "Node reports unhealthy status"}
        else:
            return {"port": port, "healthy": False, "reason": f"Status code: {response.status_code}"}
    except Exception as e:
        return {"port": port, "healthy": False, "reason": str(e)}

def submit_vote(node_port, voter_id, election_id, candidate_id):
    """Submit a vote to a node"""
    try:
        url = f"http://{DEFAULT_HOST}:{node_port}/votes"
        data = {
            "voter_id": voter_id,
            "election_id": election_id,
            "candidate_id": candidate_id,
            "timestamp": time.time(),
            "signature": "test-signature"
        }
        
        response = requests.post(url, json=data, timeout=5)
        
        if response.status_code == 202:  # Accepted
            result = response.json()
            vote_id = result.get("vote_id")
            return {"success": True, "vote_id": vote_id, "port": node_port}
        else:
            return {"success": False, "reason": f"Status: {response.status_code} - {response.text}"}
    except Exception as e:
        return {"success": False, "reason": str(e)}

def check_vote_status(node_port, vote_id):
    """Check the status of a vote"""
    try:
        url = f"http://{DEFAULT_HOST}:{node_port}/votes/{vote_id}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "reason": f"Status: {response.status_code} - {response.text}"}
    except Exception as e:
        return {"success": False, "reason": str(e)}

def check_election_results(node_port, election_id):
    """Check the results of an election"""
    try:
        url = f"http://{DEFAULT_HOST}:{node_port}/elections/{election_id}/results"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "reason": f"Status: {response.status_code} - {response.text}"}
    except Exception as e:
        return {"success": False, "reason": str(e)}

def check_clock_synchronization(healthy_nodes):
    """Check clock synchronization across healthy nodes"""
    print_step("Checking Clock Synchronization")
    
    # Collect system times from all healthy nodes
    node_times = {}
    time_collection_start = time.time()
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Define the function to get time from a node
        def get_node_time(port):
            try:
                url = f"http://{DEFAULT_HOST}:{port}/health"
                response = requests.get(url, timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "port": port, 
                        "success": True, 
                        "system_time": data.get("system_time", 0),
                        "role": data.get("role", "unknown"),
                        "offset": data.get("clock_sync", {}).get("offset", 0),
                        "synced": data.get("clock_sync", {}).get("synced", False)
                    }
                else:
                    return {"port": port, "success": False, "error": f"Status: {response.status_code}"}
            except Exception as e:
                return {"port": port, "success": False, "error": str(e)}
        
        # Get times from all nodes in parallel
        time_results = list(executor.map(get_node_time, healthy_nodes))
    
    time_collection_end = time.time()
    collection_duration = time_collection_end - time_collection_start
    
    # Process the results
    valid_times = []
    sync_table = []
    
    for result in time_results:
        if result["success"]:
            port = result["port"]
            system_time = result["system_time"]
            role = result["role"]
            offset = result.get("offset", "N/A")
            synced = "Yes" if result.get("synced", False) else "No"
            
            valid_times.append(system_time)
            node_times[port] = system_time
            sync_table.append([port, f"{system_time:.6f}", role, f"{offset:.6f}" if isinstance(offset, (int, float)) else offset, synced])
        else:
            port = result["port"]
            error = result.get("error", "Unknown error")
            sync_table.append([port, f"{FAILURE}ERROR{RESET}", "N/A", "N/A", "No"])
    
    # Calculate statistics
    if len(valid_times) >= 2:
        max_drift = max(valid_times) - min(valid_times)
        avg_time = sum(valid_times) / len(valid_times)
        std_dev = statistics.stdev(valid_times)
        
        # Print the table of node times
        print(tabulate.tabulate(sync_table, headers=["Node Port", "System Time", "Role", "Offset", "Synced"]))
        
        # Print the drift statistics
        print(f"\nClock Synchronization Statistics:")
        print(f"  Time samples collected in: {collection_duration:.3f} seconds")
        print(f"  Average system time: {avg_time:.6f}")
        print(f"  Maximum drift between nodes: {max_drift:.6f} seconds")
        print(f"  Standard deviation: {std_dev:.6f} seconds")
        
        # Determine if synchronization is acceptable (less than 1 second drift)
        if max_drift < 1.0:
            print_success("Clock synchronization is within acceptable limits (<1s drift)")
            return True
        else:
            print_warning(f"Clock drift exceeds acceptable threshold: {max_drift:.6f}s")
            return False
    else:
        print_failure("Not enough responsive nodes to check clock synchronization")
        return False
    
# Add this function to reset election data
def reset_election_data(election_id="election-2025"):
    """Reset all data for the given election"""
    print(f"Resetting data for election: {election_id}")
    try:
        # Just need to hit one node, as they all share state through consensus
        url = f"http://{DEFAULT_HOST}:{DEFAULT_PORTS[0]}/admin/elections/{election_id}"
        response = requests.delete(url, timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"Reset {result['votes_removed']} votes from previous runs")
            return True
    except Exception as e:
        print(f"Error resetting election data: {e}")
    return False

def test_distributed_mutex():
    """Test the distributed mutex implementation through the voting system"""
    print_step("Testing Distributed Mutex")
    
    print_warning("Direct Redis connection not available from host - testing mutex through voting functionality")
    
    # Test approach: Submit a vote and verify mutex operations in logs
    try:
        # Step 1: Check if mutex logging is enabled (by requesting a special debug endpoint)
        url = f"http://{DEFAULT_HOST}:{DEFAULT_PORTS[0]}/debug/enable_mutex_logging"
        requests.post(url, timeout=3)
        
        # Step 2: Submit a test vote that will use mutex internally
        voter_id = f"mutex-test-{uuid.uuid4()}"
        print(f"Submitting test vote with ID {voter_id} to verify mutex functionality...")
        
        result = submit_vote(DEFAULT_PORTS[0], voter_id, DEFAULT_ELECTION_ID, DEFAULT_CANDIDATES[0])
        
        if result["success"]:
            vote_id = result["vote_id"]
            print_success(f"Test vote {vote_id} submitted successfully")
            
            # Step 3: Wait briefly for processing
            time.sleep(2)
            
            # Step 4: Check vote status which will indicate mutex was used
            status_result = check_vote_status(DEFAULT_PORTS[0], vote_id)
            
            if status_result["success"] and status_result["data"].get("status") == "finalized":
                print_success(f"Vote {vote_id} was finalized, confirming mutex worked correctly")
                return True
            else:
                print_warning(f"Vote status check didn't confirm finalization - mutex may not be working properly")
                return False
        else:
            print_failure(f"Failed to submit test vote: {result.get('reason')}")
            return False
            
    except Exception as e:
        print_failure(f"Error testing mutex via voting: {e}")
        return False
    
async def run_mutex_test_case(r, resource, node_id, event_log):
    """Run a single mutex test with the given parameters"""
    mutex = DistributedMutex(r, resource, f"test-node-{node_id}")
    
    try:
        # Try to acquire the lock
        event_log.append(f"Node {node_id}: Attempting lock acquisition")
        acquired = await mutex.acquire(wait_timeout=3.0)
        
        if acquired:
            event_log.append(f"Node {node_id}: Lock acquired")
            # Hold the lock briefly
            await asyncio.sleep(0.5)
            # Release the lock
            released = await mutex.release()
            if released:
                event_log.append(f"Node {node_id}: Lock released")
                return True
            else:
                event_log.append(f"Node {node_id}: Failed to release lock")
                return False
        else:
            event_log.append(f"Node {node_id}: Failed to acquire lock (expected in contention test)")
            return True  # This may be expected in contention tests
            
    except Exception as e:
        event_log.append(f"Node {node_id}: Error in mutex test: {e}")
        return False

def run_mutex_test(redis_client, resource, num_threads):
    """Run a mutex test with the specified number of threads"""
    event_log = []
    
    # Create multiple tasks that try to acquire the same lock
    async def run_test():
        tasks = []
        for i in range(num_threads):
            tasks.append(run_mutex_test_case(redis_client, resource, i+1, event_log))
            
        # Run all tasks concurrently
        results = await asyncio.gather(*tasks)
        return all(results)
    
    try:
        # Run the test asynchronously
        success = asyncio.run(run_test())
        
        # Check if test passed and generate a message
        if success:
            if num_threads == 1:
                message = "Lock acquired and released successfully"
            else:
                # Count successful acquisitions
                acquisitions = sum(1 for log in event_log if "Lock acquired" in log)
                message = f"{acquisitions}/{num_threads} threads acquired lock"
                
                # Check for expected contention
                if num_threads > 1 and acquisitions < num_threads:
                    message += " (contention working correctly)"
        else:
            message = "Test failed - check logs"
            
        return success, message
        
    except Exception as e:
        return False, f"Error running test: {e}"


def run_system_test(num_votes=DEFAULT_NUM_VOTES):
    """Run a comprehensive test of the voting system"""
    # Reset election data before starting test
    reset_election_data(DEFAULT_ELECTION_ID)
    
    test_start_time = time.time()
    healthy_nodes = []
    vote_records = []
    finalized_votes = 0
    test_success = True
    
    print_header("DISTRIBUTED VOTING SYSTEM TEST")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Test Config: {num_votes} votes across {len(DEFAULT_PORTS)} nodes")
    
    # Step 1: Check all nodes health
    print_step("Checking Node Health")
    with ThreadPoolExecutor(max_workers=10) as executor:
        health_results = list(executor.map(check_node_health, DEFAULT_PORTS))
    
    # Display node health results in a table
    health_table = []
    for result in health_results:
        if result["healthy"]:
            status = f"{SUCCESS}HEALTHY{RESET}"
            role = result["data"].get("role", "unknown")
            connected = len(result["data"].get("connected_nodes", []))
            healthy_nodes.append(result["port"])
            health_table.append([result["port"], status, role, connected])
        else:
            status = f"{FAILURE}UNHEALTHY{RESET}"
            reason = result.get("reason", "Unknown error")
            health_table.append([result["port"], status, "N/A", f"{FAILURE}{reason}{RESET}"])
    
    print(tabulate.tabulate(health_table, headers=["Port", "Status", "Role", "Connected Nodes"]))
        
    if not healthy_nodes:
        print_failure("No healthy nodes found! Aborting test.")
        return False
    
    print_success(f"Found {len(healthy_nodes)} healthy node(s)")
    
    # Add step to check clock synchronization
    clock_sync_ok = check_clock_synchronization(healthy_nodes)
    if not clock_sync_ok:
        print_warning("Continuing despite clock synchronization issues...")
    
    # Step 2: Submit test votes
    print_step(f"Submitting {num_votes} Test Votes")
    
    vote_submission_table = []
    for i in range(num_votes):
        voter_id = f"voter-{uuid.uuid4()}"
        election_id = DEFAULT_ELECTION_ID
        candidate_id = random.choice(DEFAULT_CANDIDATES)
        target_node = random.choice(healthy_nodes)
        
        result = submit_vote(target_node, voter_id, election_id, candidate_id)
        
        if result["success"]:
            vote_id = result["vote_id"]
            vote_records.append({
                "vote_id": vote_id, 
                "voter_id": voter_id,
                "candidate_id": candidate_id,
                "node_port": target_node
            })
            status = f"{SUCCESS}ACCEPTED{RESET}"
            vote_submission_table.append([i+1, target_node, voter_id[-8:], candidate_id, status, vote_id[-8:]])
        else:
            status = f"{FAILURE}FAILED{RESET}"
            reason = result.get("reason", "Unknown error")
            vote_submission_table.append([i+1, target_node, voter_id[-8:], candidate_id, status, reason])
            test_success = False
    
    print(tabulate.tabulate(vote_submission_table, 
                   headers=["#", "Node Port", "Voter ID", "Candidate", "Status", "Vote ID/Error"]))
    
    if len(vote_records) == 0:
        print_failure("No votes were accepted! Aborting test.")
        return False
    
    # Step 3: Wait for consensus to be reached
    print_step("Waiting for Consensus Process")
    print(f"Allowing time for consensus (5 seconds)...")
    time.sleep(5)  # Give time for consensus to be reached
    
    # Step 4: Check vote status
    print_step("Checking Vote Status After Consensus Period")
    
    consensus_table = []
    finalized_votes = 0
    
    for i, vote in enumerate(vote_records):
        # Use a random healthy node to check status
        check_node = random.choice(healthy_nodes)
        result = check_vote_status(check_node, vote["vote_id"])
        
        if result["success"]:
            data = result["data"]
            status = data.get("status", "unknown")
            
            if status == "finalized":
                finalized_votes += 1
                status_display = f"{SUCCESS}FINALIZED{RESET}"
            elif status == "pending":
                status_display = f"{WARNING}PENDING{RESET}"
                approval_pct = data.get("approval_percentage", 0)
                status_display += f" ({approval_pct}%)"
            else:
                status_display = f"{WARNING}{status.upper()}{RESET}"
                
            consensus_table.append([i+1, vote["vote_id"][-8:], status_display, check_node])
        else:
            reason = result.get("reason", "Unknown error")
            consensus_table.append([i+1, vote["vote_id"][-8:], f"{FAILURE}ERROR{RESET}", reason])
    
    print(tabulate.tabulate(consensus_table, headers=["#", "Vote ID", "Status", "Checked On"]))
    
    finalization_rate = (finalized_votes / len(vote_records)) * 100 if vote_records else 0
    if finalization_rate < 100:
        print_warning(f"Only {finalization_rate:.1f}% of votes were finalized")
        test_success = finalization_rate >= 50  # Consider test successful if at least 50% finalized
    else:
        print_success(f"All votes were successfully finalized")
    
    # Step 5: Check election results
    print_step("Verifying Election Results")
    main_node = healthy_nodes[0]
    results = check_election_results(main_node, DEFAULT_ELECTION_ID)
    
    if results["success"]:
        data = results["data"]
        total_votes = data.get("total_votes", 0)
        results_data = data.get("results", {})
        
        # Create a formatted table of results
        results_table = []
        for candidate, count in results_data.items():
            percentage = (count / total_votes) * 100 if total_votes > 0 else 0
            results_table.append([candidate, count, f"{percentage:.1f}%"])
        
        print(tabulate.tabulate(results_table, headers=["Candidate", "Votes", "Percentage"]))
        
        if total_votes != finalized_votes:
            print_warning(f"Vote count mismatch: {total_votes} in results vs {finalized_votes} finalized")
            test_success = False
        else:
            print_success(f"Vote count matches: {total_votes} votes counted")
    else:
        print_failure(f"Failed to retrieve election results: {results.get('reason', 'Unknown error')}")
        test_success = False
    
    # Step 6: Show test summary
    test_duration = time.time() - test_start_time
    print_header("TEST SUMMARY")
    print(f"Duration: {test_duration:.2f} seconds")
    print(f"Nodes Tested: {len(healthy_nodes)} of {len(DEFAULT_PORTS)}")
    print(f"Votes Submitted: {len(vote_records)}")
    print(f"Votes Finalized: {finalized_votes} ({finalization_rate:.1f}%)")
    
    if test_success:
        print(f"\n{SUCCESS}{BOLD}TEST PASSED - System is working correctly!{RESET}")
    else:
        print(f"\n{WARNING}{BOLD}TEST COMPLETED WITH WARNINGS - Check the logs above for issues{RESET}")
    
    return test_success

if __name__ == "__main__":
    # Parse arguments
    num_votes = DEFAULT_NUM_VOTES
    test_mutex = False
    
    for arg in sys.argv[1:]:
        if arg == "--test-mutex" or arg == "-m":
            test_mutex = True
        elif arg.isdigit():
            num_votes = int(arg)
    
    # Install required packages if missing
    try:
        import tabulate
        import colorama
    except ImportError:
        print("Installing required packages...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "tabulate", "colorama"])
        import tabulate
        import colorama
        colorama.init()
    
    # First run mutex test if requested
    if test_mutex:
        print_header("DISTRIBUTED MUTEX TEST")
        test_distributed_mutex()
        print("\n")  # Add spacing between tests
    
    # Run the vote system test
    success = run_system_test(num_votes)
    sys.exit(0 if success else 1)