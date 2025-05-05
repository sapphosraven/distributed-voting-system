import time
import uuid
import asyncio
import logging
from typing import Optional

logger = logging.getLogger("node.mutex")

class DistributedMutex:
    """Redis-based distributed mutex implementation"""
    
    def __init__(self, redis_client, resource_name: str, node_id: str, ttl: int = 30):
        """Initialize a distributed mutex
        
        Args:
            redis_client: Redis client instance with cluster support
            resource_name: Name of the resource to lock
            node_id: ID of the current node
            ttl: Time-to-live for the lock in seconds
        """
        self.redis = redis_client
        self.lock_key = f"{{mutex}}:{resource_name}"  # Ensure same hash slot
        self.node_id = node_id
        self.ttl = ttl  # Lock expiration time in seconds
        self.lock_value = f"{node_id}:{uuid.uuid4()}"
        self.owner = False
        
    async def acquire(self, wait_timeout: float = 10.0, retry_delay: float = 0.2) -> bool:
        """Acquire the distributed lock with timeout
        
        Args:
            wait_timeout: Maximum time to wait for lock acquisition in seconds
            retry_delay: Time to wait between retries in seconds
            
        Returns:
            bool: True if the lock was acquired, False otherwise
        """
        start_time = time.time()
        
        # Try to acquire the lock until timeout
        while time.time() - start_time < wait_timeout:
            try:
                # Using Redis SET NX (Not Exists) for atomic lock acquisition
                success = self.redis.set(
                    self.lock_key, 
                    self.lock_value,
                    nx=True,   # Only set if key doesn't exist
                    ex=self.ttl  # Set expiration
                )
                
                if success:
                    logger.debug(f"Node {self.node_id} acquired lock on {self.lock_key}")
                    self.owner = True
                    return True
                    
                # Wait before retrying
                await asyncio.sleep(retry_delay)
                
            except Exception as e:
                logger.error(f"Error acquiring lock: {e}", exc_info=True)
                await asyncio.sleep(retry_delay)
                
        logger.warning(f"Failed to acquire lock after {wait_timeout}s: {self.lock_key}")
        return False
        
    async def release(self) -> bool:
        """Release the lock if we own it
        
        Returns:
            bool: True if the lock was released, False otherwise
        """
        if not self.owner:
            return False
            
        try:
            # Use Lua script for atomic check-and-delete
            script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """
            
            # Execute the script
            result = self.redis.eval(script, 1, self.lock_key, self.lock_value)
            if result:
                logger.debug(f"Node {self.node_id} released lock on {self.lock_key}")
                self.owner = False
                return True
            else:
                logger.warning(f"Lock {self.lock_key} already expired or owned by another node")
                return False
                
        except Exception as e:
            logger.error(f"Error releasing lock: {e}", exc_info=True)
            return False
    
    async def extend(self, additional_time: int = None) -> bool:
        """Extend the lock TTL if we own it
        
        Args:
            additional_time: Additional time to extend in seconds (uses original TTL if None)
            
        Returns:
            bool: True if the lock was extended, False otherwise
        """
        if not self.owner:
            return False
            
        ttl = additional_time if additional_time is not None else self.ttl
        
        try:
            # Use Lua script for atomic check-and-extend
            script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('expire', KEYS[1], ARGV[2])
            else
                return 0
            end
            """
            
            # Execute the script
            result = self.redis.eval(script, 1, self.lock_key, self.lock_value, ttl)
            if result:
                logger.debug(f"Node {self.node_id} extended lock on {self.lock_key} by {ttl}s")
                return True
            else:
                logger.warning(f"Lock {self.lock_key} already expired or owned by another node")
                self.owner = False
                return False
                
        except Exception as e:
            logger.error(f"Error extending lock: {e}", exc_info=True)
            return False
            
    async def __aenter__(self):
        """Context manager support for 'async with' statements"""
        await self.acquire()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        await self.release()