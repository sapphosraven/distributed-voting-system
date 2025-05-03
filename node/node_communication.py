import json
import logging
import asyncio
from typing import Dict, Callable, Any
from redis.cluster import RedisCluster
from redis.exceptions import RedisError

logger = logging.getLogger("node.communication")

class NodeCommunicator:
    """Handles communication between nodes using Redis Cluster pub/sub"""
    
    def __init__(self, redis_client: RedisCluster, node_id: str):
        self.redis = redis_client
        self.node_id = node_id
        self.handlers = {}
        self.pubsub = None
        self.running = False
        logger.info(f"NodeCommunicator initialized for {node_id}")
        
    def initialize(self):
        """Initialize the pub/sub connection"""
        try:
            self.pubsub = self.redis.pubsub()
            # Subscribe to specific channels instead of everything
            self.pubsub.subscribe("vote_proposal", "vote_response", "vote_finalization", "time_sync", "leader_election")
            self.running = True
            logger.info(f"Node {self.node_id} subscribed to communication channels")
        except RedisError as e:
            logger.error(f"Failed to initialize pub/sub: {e}")
            raise
    
    def register_handler(self, message_type: str, handler: Callable):
        """Register a handler for a specific message type"""
        self.handlers[message_type] = handler
        logger.debug(f"Registered handler for '{message_type}' messages")
    
    async def listen_for_messages(self):
        """Listen for messages on subscribed channels"""
        logger.info(f"Starting message listener for node {self.node_id}")
        
        if not self.pubsub:
            logger.error("Cannot start listener - pub/sub not initialized")
            return
            
        while self.running:
            try:
                # Get message from pubsub
                message = self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                
                if message:
                    # Process message
                    channel = message.get('channel', '')
                    data = message.get('data', '')
                    
                    # Convert bytes to string if needed
                    if isinstance(channel, bytes):
                        channel = channel.decode('utf-8')
                    
                    # Debug log to trace message flow
                    logger.debug(f"Received message on channel: {channel}")
                    
                    if isinstance(data, str):
                        try:
                            data_dict = json.loads(data)
                            
                            # Skip messages from ourselves
                            if data_dict.get('sender') == self.node_id:
                                continue
                                
                            # Handle message if we have a registered handler
                            if channel in self.handlers:
                                logger.debug(f"Processing {channel} message from {data_dict.get('sender', 'unknown')}")
                                self.handlers[channel](data_dict)
                            else:
                                logger.debug(f"No handler for message type {channel}")
                                
                        except json.JSONDecodeError:
                            logger.warning(f"Received invalid JSON data on channel {channel}")
                        except Exception as e:
                            logger.error(f"Error processing message: {e}", exc_info=True)
                
                # Small delay to prevent CPU spinning
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in message listener: {e}", exc_info=True)
                await asyncio.sleep(1)
                
        logger.info("Message listener stopped")
    
    def send_message(self, channel: str, message_type: str, data: Dict[str, Any]):
        """Send a message to a channel"""
        try:
            message = {
                "sender": self.node_id,
                "type": message_type,
                "timestamp": asyncio.get_event_loop().time(),
                "data": data
            }
            
            self.redis.publish(channel, json.dumps(message))
            logger.debug(f"Sent {message_type} message to {channel}")
            return True
        except Exception as e:
            logger.error(f"Failed to send message: {e}", exc_info=True)
            return False
    
    def stop(self):
        """Stop the listener"""
        logger.info(f"Stopping communicator for node {self.node_id}")
        self.running = False
        
        if self.pubsub:
            try:
                self.pubsub.punsubscribe()
                self.pubsub.close()
                logger.debug("Closed pub/sub connection")
            except Exception as e:
                logger.error(f"Error closing pub/sub: {e}")