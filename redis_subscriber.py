import asyncio
import json
import logging
from typing import Dict, Any
import os
from redis.cluster import RedisCluster, ClusterNode
from websocket_manager import connection_manager

logger = logging.getLogger("redis_subscriber")

class VoteEventSubscriber:
    def __init__(self):
        self.redis_nodes = os.getenv("REDIS_NODES", "redis-node-1:7000,redis-node-2:7001,redis-node-3:7002").split(",")
        self.redis_client = None
        self.pubsub = None
        self.running = False
    
    async def connect(self):
        """Connect to Redis Cluster"""
        if self.redis_client:
            return
                
        # Add debug logging
        logger.info(f"Connecting to Redis nodes: {self.redis_nodes}")

        # Format host/port for RedisCluster - Use ClusterNode objects
        startup_nodes = []
        for node in self.redis_nodes:
            host, port = node.split(":")
            startup_nodes.append(ClusterNode(host=host, port=int(port)))

        try:
            # Connect to Redis Cluster
            self.redis_client = RedisCluster(
                startup_nodes=startup_nodes,
                decode_responses=True
            )
            self.pubsub = self.redis_client.pubsub()
            logger.info("Connected to Redis Cluster")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def subscribe(self):
        """Subscribe to vote-related channels"""
        if not self.redis_client:
            await self.connect()
                
        channels = [
            "vote_finalization",  # Vote finalized events
            "vote_proposal",      # New vote proposals
            "vote_response"       # Vote approvals
        ]
        
        try:
            # IMPORTANT FIX: Don't await the subscribe method - it's synchronous!
            for channel in channels:
                self.pubsub.subscribe(channel)  # Remove await here
            logger.info(f"Subscribed to channels: {channels}")
        except Exception as e:
            logger.error(f"Failed to subscribe to Redis channels: {e}")
            raise
    
    async def listen_for_events(self):
        """Listen for events and broadcast to WebSocket clients"""
        self.running = True
        
        try:
            while self.running:
                # IMPORTANT FIX: Don't await get_message - it's synchronous!
                message = self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)  # Remove await
                
                if message:
                    channel = message.get("channel", "")
                    data = message.get("data", "{}")
                    
                    try:
                        if isinstance(data, str):
                            data = json.loads(data)
                                
                        # Format and broadcast the message
                        ws_message = self._format_vote_event(channel, data)
                        if ws_message:
                            await connection_manager.broadcast(ws_message)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse Redis message: {data}")
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                
                # Small delay to prevent CPU hogging
                await asyncio.sleep(0.01)
        except Exception as e:
            logger.error(f"Error in Redis event listener: {e}")
        finally:
            self.running = False
            
    def _format_vote_event(self, channel: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Format the Redis message for WebSocket clients"""
        event_type = channel
        
        if channel == "vote_finalization":
            return {
                "event": "vote_finalized",
                "vote_id": data.get("vote_id"),
                "election_id": data.get("election_id"),
                "timestamp": data.get("timestamp")
            }
        elif channel == "vote_proposal":
            return {
                "event": "vote_received",
                "vote_id": data.get("vote_id"),
                "election_id": data.get("election_id"),
                "timestamp": data.get("timestamp")
            }
        elif channel == "vote_response" and data.get("response") == "approved":
            return {
                "event": "vote_approved",
                "vote_id": data.get("vote_id"),
                "node_id": data.get("node_id"),
                "timestamp": data.get("timestamp")
            }
        
        return None
    
    async def stop(self):
        """Stop the subscriber"""
        self.running = False
        if self.pubsub:
            # IMPORTANT FIX: Don't await unsubscribe - it's synchronous!
            self.pubsub.unsubscribe()  # Remove await
        if self.redis_client:
            # IMPORTANT FIX: RedisCluster doesn't have an async close method
            # Just set to None to allow garbage collection
            self.redis_client = None
            self.pubsub = None
        logger.info("Stopped Redis subscriber")

# Create a global subscriber instance
vote_subscriber = VoteEventSubscriber()