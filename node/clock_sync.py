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

# Tracking variables for drift calculation
last_sync_time = 0
current_offset = 0
initial_sync_done = False

def init_clock_sync(comm, state):
    """Initialize clock sync with communicator and node state references"""
    global communicator, node_state, initial_sync_done
    communicator = comm
    node_state = state
    initial_sync_done = False
    logger.info("Clock synchronization module initialized")
    
    # Request immediate synchronization if we're a follower
    if node_state and not node_state.is_leader:
        # Set immediate sync flag
        asyncio.create_task(request_immediate_sync())
        
async def request_immediate_sync():
    """Request immediate time sync from the leader"""
    if communicator and not node_state.is_leader:
        logger.info("Requesting immediate time synchronization from leader")
        try:
            # Wait a moment for communicator to be fully initialized
            await asyncio.sleep(0.5)
            # Send sync request to leader
            communicator.send_message("time_sync", "sync_request", {
                "request_time": time.time()
            })
        except Exception as e:
            logger.error(f"Error requesting immediate sync: {e}")

async def leader_time_sync_loop():
    """Leader broadcasts time to all followers periodically"""
    logger.info("Starting leader time sync loop")
    
    # Broadcast immediately at startup
    if node_state and node_state.is_leader and communicator:
        await send_time_sync()
    
    # Then start the regular cycle
    while True:
        if node_state and node_state.is_leader:
            try:
                await send_time_sync()
            except Exception as e:
                logger.error(f"Error in leader time sync: {e}")
                
        # More frequent updates - 2 seconds
        await asyncio.sleep(2)

async def send_time_sync():
    """Send time sync message to all followers"""
    if not communicator:
        return
        
    current_time = time.time()
    node_state.system_time = current_time  # Leader uses system time
    
    communicator.send_message("time_sync", "broadcast", {
        "system_time": current_time,
        "broadcast_id": f"sync-{int(current_time)}"
    })
    logger.debug(f"Leader broadcast system time: {current_time}")

async def drift_detection_loop():
    """Detect and correct clock drift on follower nodes"""
    logger.info("Starting clock drift detection loop")
    global sync_history, current_offset, last_sync_time
    
    while True:
        if node_state and not node_state.is_leader:
            try:
                # Use the latest sync time we have
                master_time = node_state.system_time
                local_time = time.time()
                
                if last_sync_time > 0:
                    # Calculate time since last sync
                    time_since_sync = local_time - last_sync_time
                    
                    # Only check drift if we've received a sync in the last 10 seconds
                    if time_since_sync < 10:
                        # Calculate current drift
                        drift = master_time - local_time
                        
                        # Store drift in history for smoothing
                        sync_history.append(drift)
                        if len(sync_history) > SYNC_HISTORY_SIZE:
                            sync_history.pop(0)
                        
                        # Use median drift for more stable corrections
                        median_drift = median(sync_history)
                        current_offset = median_drift
                        
                        # More aggressive correction based on drift magnitude
                        if abs(median_drift) > 5.0:  # Severe drift
                            correction = median_drift * 0.9  # 90% correction
                            logger.warning(f"Severe clock drift detected: {median_drift:.4f}s")
                            node_state.system_time = local_time + correction
                            logger.info(f"Applied aggressive clock correction of {correction:.4f}s")
                        elif abs(median_drift) > 1.0:  # Moderate drift
                            correction = median_drift * 0.7  # 70% correction
                            logger.warning(f"Clock drift detected: {median_drift:.4f}s")
                            node_state.system_time = local_time + correction
                            logger.info(f"Applied moderate clock correction of {correction:.4f}s")
                        elif abs(median_drift) > 0.1:  # Minor drift
                            correction = median_drift * 0.5  # 50% correction
                            logger.debug(f"Minor clock drift: {median_drift:.4f}s")
                            node_state.system_time = local_time + correction
                            logger.debug(f"Applied minor clock correction of {correction:.4f}s")
                
            except Exception as e:
                logger.error(f"Error in drift detection: {e}")
                
        await asyncio.sleep(1)  # Check more frequently - every 1 second

def update_sync_time(sync_time):
    """Update the last sync time"""
    global last_sync_time, initial_sync_done