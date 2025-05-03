import asyncio
import time
from node_server import communicator, node_state, logger

# Interval (s) between sync broadcasts
TIME_SYNC_INTERVAL = 10
# Max tolerated drift (s) before correction
MAX_DRIFT = 0.5
# Fraction of drift to correct each cycle
CORRECTION_FACTOR = 0.5

async def leader_time_sync_loop():
    """Leader periodically broadcasts its system time."""
    while True:
        await asyncio.sleep(TIME_SYNC_INTERVAL)
        communicator.send_message("clock_sync", {
            "system_time": time.time()
        })

async def drift_detection_loop():
    """Follower measures drift and gently corrects its clock offset."""
    while True:
        await asyncio.sleep(TIME_SYNC_INTERVAL)
        if node_state.system_time is None:
            continue
        # local = actual time + offset
        local = time.time() + node_state.time_offset
        drift = node_state.system_time - local
        if abs(drift) > MAX_DRIFT:
            adjust = drift * CORRECTION_FACTOR
            node_state.time_offset += adjust
            logger.info(
                f"Clock drift detected: {drift:.3f}s, adjusted offset by {adjust:.3f}s"
            )