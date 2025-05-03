import time
import asyncio
import logging
import sys
from statistics import median

# Configure more detailed logging for debugging
logger = logging.getLogger("node.clock_sync")
logger.setLevel(logging.DEBUG)

# These will be imported from node_server.py
communicator = None
node_state = None

# Store last few sync times for smoothing corrections
SYNC_HISTORY_SIZE = 5
sync_history = []

# Track sync status and correction parameters
last_sync_time = 0
current_offset = 0
initial_sync_done = False
sync_request_count = 0
FORCE_SYNC_THRESHOLD = 10.0  # Force immediate sync if drift exceeds this value

def init_clock_sync(comm, state):
    """Initialize clock sync with communicator and node state references"""
    global communicator, node_state, initial_sync_done
    
    communicator = comm
    node_state = state
    
    # Leader is always in sync with itself
    if node_state.is_leader:
        initial_sync_done = True
        logger.info("Leader node initialized with clock sync (reference source)")
    else:
        initial_sync_done = False
        logger.info("Follower node initialized, awaiting time synchronization")
    
    # Request immediate sync on initialization for followers
    if communicator and not node_state.is_leader:
        logger.info("Requesting immediate sync during initialization")
        asyncio.create_task(request_immediate_sync())

async def request_immediate_sync():
    """Request immediate time sync from the leader"""
    global sync_request_count
    
    if not communicator or node_state.is_leader:
        return
    
    sync_request_count += 1
    logger.info(f"Follower requesting time sync from leader (attempt {sync_request_count})")
    
    try:
        # Send sync request to leader
        communicator.send_message("time_sync", "sync_request", {
            "request_time": time.time(),
            "urgent": True,
            "request_id": f"sync-req-{sync_request_count}"
        })
        
        # If this is our first sync attempt, schedule a retry in case it fails
        if not initial_sync_done:
            asyncio.create_task(schedule_retry_sync())
    except Exception as e:
        logger.error(f"Error requesting sync: {e}")
        await asyncio.sleep(2)
        asyncio.create_task(request_immediate_sync())

async def schedule_retry_sync():
    """If we don't get synced quickly, try again"""
    await asyncio.sleep(3)
    if not initial_sync_done:
        logger.warning("Initial sync not received after 3s, requesting again")
        asyncio.create_task(request_immediate_sync())

async def leader_time_sync_loop():
    """Leader broadcasts time to all followers periodically"""
    logger.info("Starting leader time sync loop")
    
    # Send an initial broadcast immediately 
    await send_time_sync(True)
    
    # First minute: sync more frequently to establish baseline
    for _ in range(12):  # 12 * 5s = 60s (1 minute)
        if node_state and node_state.is_leader:
            try:
                await send_time_sync()
            except Exception as e:
                logger.error(f"Error in leader time sync: {e}")
        await asyncio.sleep(5)
    
    # Then continue with normal interval
    while True:
        if node_state and node_state.is_leader:
            try:
                await send_time_sync()
            except Exception as e:
                logger.error(f"Error in leader time sync: {e}")
        await asyncio.sleep(10)  # Normal interval

async def send_time_sync(is_initial=False):
    """Send time sync message to all followers"""
    if not communicator or not node_state.is_leader:
        return
        
    current_time = time.time()
    node_state.system_time = current_time  # Leader's system time is the reference
    
    # Create sync message with unique ID
    sync_id = f"sync-{int(current_time * 1000)}"
    sync_type = "initial" if is_initial else "regular"
    
    message = {
        "type": "broadcast",
        "data": {
            "system_time": current_time,
            "broadcast_id": sync_id,
            "initial": is_initial,
            "sync_type": sync_type,
        }
    }
    
    # Broadcast to all followers
    communicator.send_message("time_sync", "broadcast", message["data"])
    logger.debug(f"Leader broadcast {sync_type} sync: time={current_time:.6f}")

async def drift_detection_loop():
    """Detect and correct clock drift on follower nodes"""
    logger.info("Starting clock drift detection loop")
    global sync_history, current_offset
    
    while True:
        if node_state and not node_state.is_leader:
            try:
                # Only process if we've received at least one sync
                if initial_sync_done and last_sync_time > 0:
                    local_time = time.time()
                    master_time = node_state.system_time
                    time_since_sync = local_time - last_sync_time
                    
                    # Calculate current drift 
                    expected_master_time = master_time + time_since_sync
                    drift = expected_master_time - local_time
                    
                    # Store drift for smoothing
                    sync_history.append(drift)
                    if len(sync_history) > SYNC_HISTORY_SIZE:
                        sync_history.pop(0)
                    
                    # Calculate median drift
                    median_drift = median(sync_history) if sync_history else drift
                    current_offset = median_drift
                    
                    # Apply correction based on drift magnitude
                    if abs(median_drift) > 5.0:  # Severe drift
                        correction = median_drift * 0.8  # 80% correction
                        logger.warning(f"Severe clock drift: {median_drift:.4f}s")
                        node_state.system_time = local_time + correction
                        logger.info(f"Applied strong correction: {correction:.4f}s")
                        
                        # Request immediate sync for severe drift
                        asyncio.create_task(request_immediate_sync())
                        
                    elif abs(median_drift) > 1.0:  # Moderate drift
                        correction = median_drift * 0.6  # 60% correction
                        logger.warning(f"Moderate clock drift: {median_drift:.4f}s")
                        node_state.system_time = local_time + correction
                        logger.info(f"Applied correction: {correction:.4f}s")
                        
                    elif abs(median_drift) > 0.1:  # Minor drift
                        correction = median_drift * 0.3  # 30% correction
                        logger.debug(f"Minor clock drift: {median_drift:.4f}s")
                        node_state.system_time = local_time + correction
                    
                    # Log sync status periodically
                    if time.time() % 30 < 1:  # Approximately once every 30 seconds
                        logger.info(f"Sync status: initial_sync={initial_sync_done}, drift={median_drift:.4f}s, time_since_sync={time_since_sync:.2f}s")
                        
                else:
                    # If we've never synchronized, request it
                    if not initial_sync_done:
                        # Avoid logging too frequently
                        if time.time() % 15 < 0.1:  # Log approximately every 15 seconds
                            logger.warning("Node has not received initial time sync yet")
                            asyncio.create_task(request_immediate_sync())
                
            except Exception as e:
                logger.error(f"Error in drift detection: {e}")
                
        # Check drift every second
        await asyncio.sleep(1)

def get_corrected_time():
    """Get the current time, adjusted for any drift correction"""
    if not node_state:
        return time.time()
    
    if node_state.is_leader:
        # Leader always uses system time as reference
        return time.time()
    else:
        # Followers apply correction if synced
        local_time = time.time()
        
        # If we haven't synced yet, use local time
        if not initial_sync_done:
            return local_time
        
        # Apply the current offset
        return local_time + current_offset

def handle_time_sync_message(message):
    """Process an incoming time sync message"""
    global last_sync_time, initial_sync_done, current_offset
    
    message_type = message.get("type", "")
    data = message.get("data", {})
    sender = message.get("sender", "unknown")
    
    # Debug the message structure
    logger.debug(f"Received time_sync message: type={message_type}, sender={sender}, data_keys={list(data.keys()) if isinstance(data, dict) else 'not_dict'}")
    
    # Skip if we're the leader - leader sets time, doesn't sync to it
    if node_state and node_state.is_leader:
        # But respond to sync requests if we're the leader
        if message_type == "sync_request":
            logger.info(f"Leader received sync request from {sender}")
            # Send an immediate time sync response
            asyncio.create_task(send_time_sync(True))
        return
        
    # Process time broadcast as a follower
    if message_type == "broadcast" or (isinstance(data, dict) and "system_time" in data):
        try:
            # Extract system time from leader
            system_time = float(data.get("system_time", 0))
            if system_time <= 0:
                logger.warning(f"Invalid system_time in message: {system_time}")
                return
                
            # Update sync tracking
            last_sync_time = time.time()
            
            # Mark as initially synced
            if not initial_sync_done:
                initial_sync_done = True
                logger.info(f"Initial time sync established with leader: {system_time}")
            
            # Calculate raw drift
            local_time = time.time()
            drift = system_time - local_time
            
            # Initialize sync history if empty
            if not sync_history:
                for _ in range(SYNC_HISTORY_SIZE):
                    sync_history.append(drift)
            
            # Store drift as current offset
            current_offset = drift
            
            # Apply immediate correction for:
            # 1. Initial sync
            # 2. Large drift
            # 3. Explicit initial sync
            is_initial = data.get("initial", False)
            is_large_drift = abs(drift) > FORCE_SYNC_THRESHOLD
            
            if is_initial or is_large_drift:
                # Apply strong immediate correction (90%)
                correction = drift * 0.9
                node_state.system_time = local_time + correction
                logger.info(f"Applied immediate sync correction: {correction:.4f}s (drift={drift:.4f}s)")
            else:
                # Just update the system time
                node_state.system_time = system_time
                logger.debug(f"Updated system time, drift={drift:.4f}s")
                
        except Exception as e:
            logger.error(f"Error processing time sync: {e}", exc_info=True)

def get_drift_info():
    """Get information about the current clock drift"""
    if not node_state:
        return {"synced": False, "offset": 0, "last_sync": 0}
    
    # Leader is always considered synchronized (it's the reference)
    if node_state.is_leader:
        return {
            "is_leader": True,
            "offset": 0,
            "last_sync": time.time(),
            "synced": True,
            "sync_age": 0
        }
    
    # For followers, calculate synchronization metrics
    current_time = time.time()
    # Use a large but finite value (1 day) instead of infinity for JSON compatibility
    sync_age = current_time - last_sync_time if last_sync_time > 0 else 86400  # 1 day in seconds
    
    return {
        "is_leader": False,
        "offset": current_offset,
        "last_sync": last_sync_time,
        "synced": initial_sync_done and sync_age < 30.0,  # Consider synced if within last 30 seconds
        "sync_age": sync_age
    }
