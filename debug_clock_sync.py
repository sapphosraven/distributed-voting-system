#!/usr/bin/env python3
import requests
import time
import json
import sys
import statistics
import tabulate  # Changed from: from tabulate import tabulate
from colorama import Fore, Style, init
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# Initialize colorama
init()

# Color constants
GREEN = Fore.GREEN
RED = Fore.RED
YELLOW = Fore.YELLOW
CYAN = Fore.CYAN
RESET = Style.RESET_ALL
BOLD = Style.BRIGHT

# Configuration
DEFAULT_HOST = "localhost"
DEFAULT_PORTS = [5001, 5002, 5003]
POLL_INTERVAL = 2  # seconds
MAX_SAMPLES = 10   # number of samples to keep for trend analysis

def get_node_time(port):
    """Get time and clock sync information from a node"""
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
                "clock_sync": data.get("clock_sync", {}),
                "timestamp": time.time()
            }
        else:
            return {"port": port, "success": False, "error": f"Status: {response.status_code}"}
    except Exception as e:
        return {"port": port, "success": False, "error": str(e)}

def print_header(text):
    """Print a formatted header"""
    width = 80
    print(f"\n{CYAN}{BOLD}{'-' * width}{RESET}")
    print(f"{CYAN}{BOLD}{text.center(width)}{RESET}")
    print(f"{CYAN}{BOLD}{'-' * width}{RESET}")

def monitor_clock_sync(ports=DEFAULT_PORTS, samples=MAX_SAMPLES):
    """Monitor clock synchronization across nodes over time"""
    print_header("Clock Synchronization Monitor")
    print(f"Monitoring nodes on ports: {ports}")
    print(f"Polling interval: {POLL_INTERVAL} seconds")
    
    # Store historical data for trend analysis
    history = {port: [] for port in ports}
    
    # Main monitoring loop
    try:
        while True:
            current_time = time.time()
            print(f"\n{BOLD}[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]{RESET}")
            
            # Get time from all nodes in parallel
            with ThreadPoolExecutor(max_workers=10) as executor:
                results = list(executor.map(get_node_time, ports))
            
            # Process results
            valid_results = [r for r in results if r["success"]]
            if len(valid_results) < 2:
                print(f"{RED}Not enough responsive nodes to analyze clock sync{RESET}")
                time.sleep(POLL_INTERVAL)
                continue
            
            # Extract system times
            times = [r["system_time"] for r in valid_results]
            max_drift = max(times) - min(times)
            
            # Print time comparison table
            table_data = []
            for result in results:
                if result["success"]:
                    port = result["port"]
                    system_time = result["system_time"]
                    role = result["role"]
                    
                    # Get clock sync info
                    sync_info = result.get("clock_sync", {})
                    offset = sync_info.get("offset", 0)
                    synced = sync_info.get("synced", False)
                    sync_age = sync_info.get("sync_age", float('inf'))
                    
                    # Format for display
                    synced_status = f"{GREEN}Yes{RESET}" if synced else f"{YELLOW}No{RESET}"
                    offset_str = f"{offset:.6f}" if isinstance(offset, (int, float)) else "N/A"
                    sync_age_str = f"{sync_age:.1f}s" if isinstance(sync_age, (int, float)) else "N/A"
                    
                    # Add to table
                    table_data.append([
                        port, 
                        f"{system_time:.6f}", 
                        role,
                        offset_str,
                        synced_status,
                        sync_age_str
                    ])
                    
                    # Store in history
                    history[port].append({
                        "timestamp": current_time,
                        "system_time": system_time,
                        "offset": offset,
                        "synced": synced
                    })
                    
                    # Limit history size
                    if len(history[port]) > samples:
                        history[port].pop(0)
                else:
                    port = result["port"]
                    error = result.get("error", "Unknown error")
                    table_data.append([port, f"{RED}ERROR{RESET}", "N/A", "N/A", "N/A", f"{RED}{error}{RESET}"])
            
            # Print the current state table
            headers = ["Port", "System Time", "Role", "Offset", "Synced", "Sync Age"]
            print(tabulate.tabulate(table_data, headers=headers, tablefmt="pretty"))
            
            # Print drift statistics
            if max_drift < 1.0:
                drift_status = f"{GREEN}Good{RESET}"
            elif max_drift < 5.0:
                drift_status = f"{YELLOW}Warning{RESET}"
            else:
                drift_status = f"{RED}Critical{RESET}"
                
            print(f"\nClock Drift: {max_drift:.6f}s ({drift_status})")
            
            # Analyze trends for each node
            print("\nOffset Trends:")
            for port in ports:
                if port in history and len(history[port]) > 1:
                    node_history = history[port]
                    offsets = [entry["offset"] for entry in node_history if "offset" in entry]
                    
                    if offsets:
                        avg_offset = sum(offsets) / len(offsets)
                        offset_trend = offsets[-1] - offsets[0] if len(offsets) > 1 else 0
                        
                        trend_desc = "Stable"
                        if offset_trend > 0.1:
                            trend_desc = f"{YELLOW}Increasing{RESET}"
                        elif offset_trend < -0.1:
                            trend_desc = f"{YELLOW}Decreasing{RESET}"
                        
                        print(f"  Port {port}: Avg Offset {avg_offset:.6f}s, Trend: {trend_desc}")
                        print(f"    Last few offsets: {', '.join(f'{o:.6f}' for o in offsets[-5:])}")
            
            # Wait for next poll
            time.sleep(POLL_INTERVAL)
    
    except KeyboardInterrupt:
        print("\nMonitoring stopped by user")
        print_header("Summary")
        # Print final statistics and recommendations
        
        # For each node that had sync issues, print guidance
        has_sync_issues = False
        for port, data in history.items():
            recent_entries = data[-min(5, len(data)):]
            synced_status = [e.get("synced", False) for e in recent_entries]
            if not all(synced_status) and synced_status:
                has_sync_issues = True
                print(f"Node {port} sync issues detected:")
                print(f"  - Recent sync status: {synced_status}")
                print(f"  - Recent offsets: {[e.get('offset', 'N/A') for e in recent_entries]}")
        
        if has_sync_issues:
            print(f"\n{YELLOW}Recommendations:{RESET}")
            print("1. Verify that time_sync messages are being passed correctly")
            print("2. Check that the leader is broadcasting time regularly")
            print("3. Look for errors in the logs related to clock synchronization")
        else:
            print(f"\n{GREEN}No persistent synchronization issues detected.{RESET}")

if __name__ == "__main__":
    try:
        # Try to import tabulate, install if missing
        import tabulate
    except ImportError:
        print("Installing required packages...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "tabulate", "colorama"])
        import tabulate
    
    ports = DEFAULT_PORTS
    if len(sys.argv) > 1:
        try:
            # Parse port arguments if provided
            ports = [int(p) for p in sys.argv[1:]]
        except ValueError:
            print(f"Invalid port specified. Using default ports: {DEFAULT_PORTS}")
    
    monitor_clock_sync(ports)
