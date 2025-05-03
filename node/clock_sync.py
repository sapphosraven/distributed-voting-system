import time
import asyncio
import logging
from statistics import median

logger = logging.getLogger("node.clock_sync")

# These will be imported from node_server.py
communicator = None
node_state = None

# Store last few sync times to smooth out corrections
SYNC_HISTORY_SIZE = 5
sync_history = []

def init_clock_sync(comm, state):
    """Initialize clock sync with communicator and node state references"""
    global communicator, node_state
    communicator = comm
    node_state = state
    logger.info("Clock synchronization module initialized")

async def leader_time_sync_loop():
    """Leader broadcasts time to all followers periodically"""
    logger.info("Starting leader time sync loop")
    
    while True:
        if node_state and node_state.is_leader:
            try:
                current_time = time.time()
                node_state.system_time = current_time  # Leader uses system time
                
                if communicator:
                    communicator.send_message("time_sync", "broadcast", {
                        "system_time": current_time
                    })
                logger.debug(f"Leader broadcast system time: {current_time}")
            except Exception as e:
                logger.error(f"Error in leader time sync: {e}")
                
        await asyncio.sleep(5)  # Broadcast more frequently (every 5 seconds)

async def drift_detection_loop():
    """Detect and correct clock drift on follower nodes"""
    logger.info("Starting clock drift detection loop")
    global sync_history
    
    while True:
        if node_state and not node_state.is_leader:
            try:
                # Get master time from the most recent sync
                master_time = node_state.system_time
                local_time = time.time()
                drift = master_time - local_time
                
                # Store drift in history for smoothing
                sync_history.append(drift)
                if len(sync_history) > SYNC_HISTORY_SIZE:
                    sync_history.pop(0)
                
                # Use median drift for more stable corrections
                median_drift = median(sync_history)
                
                if abs(median_drift) > 1.0:  # More than 1 second drift
                    logger.warning(f"Clock drift detected: {median_drift:.4f}s")
                    # Apply gradual correction (60% of the drift)
                    correction = median_drift * 0.6
                    node_state.system_time = local_time + correction
                    logger.info(f"Applied clock correction of {correction:.4f}s")
                    
            except Exception as e:
                logger.error(f"Error in drift detection: {e}")
                
        await asyncio.sleep(10)  # Check every 10 seconds

def get_corrected_time():
    """Get the current time, adjusted for any drift correction"""
    if not node_state:
        return time.time()
    
    if node_state.is_leader:
        # Leader always uses system time
        return time.time()
    else:
        # Followers apply correction
        local_time = time.time()
        # If system_time is not set, use local time
        last_sync = getattr(node_state, 'system_time', local_time)
        
        # Calculate how much time has elapsed since the last sync
        elapsed = local_time - last_sync
        
        # Return the corrected time
        return last_sync + elapsed

def handle_time_sync_message(data):
    """Process an incoming time sync message"""
    if node_state and not node_state.is_leader:
        try:
            system_time = float(data.get('system_time', 0))
            if system_time > 0:
                # Store the leader's time
                node_state.system_time = system_time
                # Calculate and log the drift
                drift = system_time - time.time()
                logger.debug(f"Time sync received: drift={drift:.4f}s")
        except Exception as e:
            logger.error(f"Error processing time sync: {e}")
