#!/usr/bin/env python3
# filepath: f:\Uni_Stuff\6th_Sem\IS\Project\distributed-voting-system\test_system.py
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

def check_clock_sync_status(healthy_nodes):
    """Check if clock synchronization is working properly across nodes"""
    print_step("Testing Clock Synchronization")
    
    try:
        # Try to get more detailed debug info first
        debug_info = {}
        for port in healthy_nodes:
            try:
                debug_url = f"http://{DEFAULT_HOST}:{port}/debug/clock-sync"
                response = requests.get(debug_url, timeout=3)
                if response.status_code == 200:
                    debug_info[port] = response.json()
                    logger.info(f"Got debug info from port {port}: {debug_info[port]}")
            except Exception as e:
                logger.warning(f"Could not get debug info from port {port}: {e}")
        
        # Get time from all nodes
        node_times = []
        leader_time = None
        leader_node = None
        
        for port in healthy_nodes:
            try:
                health_url = f"http://{DEFAULT_HOST}:{port}/health"
                response = requests.get(health_url, timeout=3)
                
                if response.status_code == 200:
                    data = response.json()
                    system_time = data.get("system_time")
                    role = data.get("role")
                    sync_stats = data.get("clock_sync", {})
                    
                    if role == "leader":
                        leader_time = system_time
                        leader_node = port
                        logger.info(f"Found leader node at port {port} with time {system_time}")
                    
                    node_times.append({
                        "port": port,
                        "role": role,
                        "time": system_time,
                        "offset": sync_stats.get("current_offset", 0),
                        "drift_rate": sync_stats.get("drift_rate", 0),
                        "sync_count": sync_stats.get("sync_count", 0),
                        "last_sync": sync_stats.get("last_sync", 0),
                        "status": sync_stats.get("status", "unknown")
                    })
            except Exception as e:
                logger.error(f"Error checking node at port {port}: {e}")
        
        if not node_times:
            print_failure("No responsive nodes for clock sync test")
            return False
        
        # Calculate time differences
        max_time_diff = 0
        time_diff_table = []
        
        for node in node_times:
            port = node["port"]
            role = node["role"]
            sync_status = node.get("status", "")
            sync_count = node.get("sync_count", 0)
            
            # Handle "no_sync_data" status
            if sync_status == "no_sync_data":
                if role == "leader":
                    status_display = f"{INFO}LEADER (no sync needed){RESET}"
                else:
                    status_display = f"{WARNING}NO SYNC DATA{RESET}"
                    print_warning(f"Follower node at port {port} has no synchronization data!")
                    print_warning("Clock synchronization may not be functioning correctly between nodes.")
                
                time_diff_table.append([
                    port,
                    role,
                    f"N/A",
                    f"N/A",
                    sync_count,
                    status_display
                ])
                continue
            
            node_time = node["time"]
            offset = node["offset"]
            
            # Compare with leader time
            if leader_time is not None and node_time is not None:
                diff = abs(node_time - leader_time)
                max_time_diff = max(max_time_diff, diff)
                
                if diff < 1.0:
                    status = f"{SUCCESS}SYNCED{RESET}"
                elif diff < 3.0:
                    status = f"{WARNING}MINOR DRIFT{RESET}"
                else:
                    status = f"{FAILURE}MAJOR DRIFT{RESET}"
                
                time_diff_table.append([
                    port,
                    role,
                    f"{node_time:.3f}",
                    f"{offset:.6f}",
                    sync_count,
                    status
                ])
            else:
                time_diff_table.append([
                    port,
                    role,
                    f"{node_time:.3f}" if node_time is not None else "N/A",
                    f"{offset:.6f}",
                    sync_count,
                    f"{WARNING}NO COMPARISON{RESET}"
                ])
        
        # Print results
        print(tabulate.tabulate(
            time_diff_table,
            headers=["Port", "Role", "System Time", "Offset", "Sync Count", "Status"]
        ))
        
        # Print additional debug info if available
        if debug_info:
            print("\n--- Clock Sync Debug Information ---")
            for port, info in debug_info.items():
                handlers = info.get("registered_handlers", [])
                history = info.get("recent_sync_history", [])
                print(f"\nNode {port} ({info.get('role', 'unknown')})")
                print(f"  Registered handlers: {', '.join(handlers)}")
                print(f"  Time diff: {info.get('time_diff', 'N/A'):.6f} seconds")
                print(f"  Sync history entries: {len(history)}")
                if "time_sync" not in handlers:
                    print_warning(f"  Node {port} is missing time_sync handler!")
            print("-----------------------------------\n")
        
        # Analysis and recommendations
        if any(node.get("status") == "no_sync_data" for node in node_times if node["role"] != "leader"):
            print_warning("Some follower nodes have no synchronization data!")
            print_warning("Verify that time synchronization tasks are running and check node logs for errors.")
            return False
            
        # Check if the leader was found
        if leader_node is None:
            print_warning("No leader node found! Clock synchronization requires a leader node.")
            return False
        
        # Evaluate overall synchronization
        if max_time_diff == 0:
            # We couldn't compare any times
            if any(node.get("sync_count", 0) > 0 for node in node_times):
                print_warning("Clock synchronization appears to be partially working")
                return True
            else:
                print_failure("Clock synchronization doesn't appear to be working")
                return False
        elif max_time_diff < 1.0:
            print_success(f"Clock synchronization successful (max diff: {max_time_diff:.6f}s)")
            return True
        elif max_time_diff < 3.0:
            print_warning(f"Clock synchronization has minor drift (max diff: {max_time_diff:.6f}s)")
            return True
        else:
            print_failure(f"Clock synchronization has major drift (max diff: {max_time_diff:.6f}s)")
            return False
        
    except Exception as e:
        print_failure(f"Clock sync test failed: {e}")
        logger.error(f"Error testing clock synchronization: {e}", exc_info=True)
        return False

def run_system_test(num_votes=DEFAULT_NUM_VOTES):
    """Run a comprehensive test of the voting system"""
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
    
    # Step 1.5: Add clock sync test after finding healthy nodes
    if healthy_nodes:
        clock_sync_result = check_clock_sync_status(healthy_nodes)
        if not clock_sync_result:
            print_warning("Clock synchronization test failed, but continuing with other tests")
            test_success = False
    
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
    if len(sys.argv) > 1:
        try:
            num_votes = int(sys.argv[1])
        except:
            pass
    
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
    
    # Run the test
    success = run_system_test(num_votes)
    sys.exit(0 if success else 1)