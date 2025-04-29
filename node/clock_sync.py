import time
import logging
import statistics
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger("node.clock_sync")

class ClockSynchronizer:
    """Class to manage clock synchronization between nodes"""
    
    def __init__(self, node_id: str, is_leader: bool = False):
        self.node_id = node_id
        self.is_leader = is_leader
        self.reference_time = time.time()  # Local reference time
        self.offset = 0.0  # Offset between local time and system time
        self.last_sync_time = 0.0
        self.sync_history = []  # Keep track of recent sync events for drift detection
        self.max_history_size = 10
        self.drift_threshold = 0.5  # Seconds
        self.dynamic_threshold_enabled = True  # Enable dynamic adjustment of drift threshold
        logger.info(f"Clock synchronizer initialized for node {node_id} as {'leader' if is_leader else 'follower'}")
    
    def get_adjusted_time(self) -> float:
        """Get the current adjusted system time"""
        return time.time() + self.offset
    
    def record_sync_event(self, reference_time: float, local_time: float) -> None:
        """Record a synchronization event for drift analysis"""
        # Calculate the new offset
        new_offset = reference_time - local_time
        
        # Add to history
        self.sync_history.append({
            "timestamp": time.time(),
            "reference_time": reference_time,
            "local_time": local_time,
            "offset": new_offset
        })
        
        # Keep history bounded
        if len(self.sync_history) > self.max_history_size:
            self.sync_history.pop(0)
        
        # Update the last sync time
        self.last_sync_time = time.time()
        
        logger.debug(f"Recorded sync event: reference={reference_time}, local={local_time}, offset={new_offset}")
    
    def update_offset(self, system_time: float) -> float:
        """Update the offset based on received system time"""
        local_time = time.time()
        old_offset = self.offset
        
        # Calculate new offset
        self.offset = system_time - local_time
        
        # Record this sync event
        self.record_sync_event(system_time, local_time)
        
        # Check for drift
        drift = self.offset - old_offset
        if abs(drift) > self.drift_threshold:
            logger.warning(f"Significant clock drift detected: {drift:.6f} seconds")
        
        # Dynamically adjust drift threshold if enabled
        if self.dynamic_threshold_enabled:
            self.adjust_drift_threshold()
        
        logger.info(f"Updated time offset to {self.offset:.6f} seconds")
        return self.offset
    
    def detect_drift(self) -> Optional[float]:
        """Detect if there is significant drift in the clock"""
        if len(self.sync_history) < 2:
            return None
        
        # Calculate drift rate (change in offset over time)
        recent = sorted(self.sync_history, key=lambda x: x["timestamp"], reverse=True)
        newest = recent[0]
        oldest = recent[-1]
        
        time_diff = newest["timestamp"] - oldest["timestamp"]
        if time_diff == 0:
            return 0
        
        offset_diff = newest["offset"] - oldest["offset"]
        drift_rate = offset_diff / time_diff  # Drift in seconds per second
        
        return drift_rate
    
    def estimate_drift_correction(self) -> float:
        """Estimate drift correction factor based on history"""
        drift_rate = self.detect_drift()
        if drift_rate is None:
            return 0.0
        
        # Calculate how much we need to adjust the offset based on the drift rate
        time_since_last_sync = time.time() - self.last_sync_time
        correction = drift_rate * time_since_last_sync
        
        logger.debug(f"Estimated drift correction: {correction:.6f} seconds")
        return correction
    
    def apply_drift_correction(self) -> None:
        """Apply drift correction to the current offset"""
        if not self.is_leader:  # Only followers need to correct drift
            correction = self.estimate_drift_correction()
            if correction != 0:
                self.offset += correction
                logger.info(f"Applied drift correction of {correction:.6f} seconds. New offset: {self.offset:.6f}")
    
    def adjust_drift_threshold(self) -> None:
        """Dynamically adjust the drift threshold based on historical drift rates"""
        if len(self.sync_history) < 2:
            return
        
        # Calculate the standard deviation of offsets
        offsets = [entry["offset"] for entry in self.sync_history]
        std_dev = statistics.stdev(offsets) if len(offsets) > 1 else 0
        
        # Adjust the threshold to be slightly above the standard deviation
        new_threshold = max(0.5, std_dev * 2)
        if new_threshold != self.drift_threshold:
            logger.info(f"Adjusted drift threshold from {self.drift_threshold:.6f} to {new_threshold:.6f}")
            self.drift_threshold = new_threshold
    
    def get_sync_stats(self) -> Dict[str, Any]:
        """Get synchronization statistics for diagnostics"""
        if not self.sync_history:
            return {"status": "no_sync_data"}
        
        offsets = [entry["offset"] for entry in self.sync_history]
        drift_rate = self.detect_drift()
        
        return {
            "current_offset": self.offset,
            "drift_rate": drift_rate if drift_rate is not None else 0,
            "min_offset": min(offsets),
            "max_offset": max(offsets),
            "avg_offset": statistics.mean(offsets) if offsets else 0,
            "last_sync": self.last_sync_time,
            "sync_count": len(self.sync_history),
            "drift_threshold": self.drift_threshold
        }
    
    def validate_timestamp(self, timestamp: float, tolerance: float = 5.0) -> bool:
        """Validate if a timestamp is within acceptable range of the current system time"""
        current_time = self.get_adjusted_time()
        time_diff = abs(current_time - timestamp)
        
        # Check if timestamp is in the future beyond tolerance
        if timestamp > current_time + tolerance:
            logger.warning(f"Timestamp validation failed: timestamp is {time_diff:.2f} seconds in the future")
            return False
        
        # Check if timestamp is too old (e.g., more than 1 minute old)
        if timestamp < current_time - 60:
            logger.warning(f"Timestamp validation failed: timestamp is {time_diff:.2f} seconds in the past")
            return False
            
        return True
