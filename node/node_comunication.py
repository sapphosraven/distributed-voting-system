import json
import asyncio
import redis
import time
from typing import Dict, Any, Callable, List, Optional
import os

# Import our custom logger
from logger_config import setup_logger

# Configuration
NODE_ID = os.environ.get("NODE_ID", "node1")
LOG_DIR = os.environ.get("LOG_DIR", "../logs")

# Setup logger
logger = setup_logger("node.communication", log_dir=LOG_DIR, node_id=NODE_ID)

class NodeCommunicator:
    def __init__(self, redis_client, node_id):
        self.redis = redis_client
        self.node_id = node_id
        self.message_handlers = {}
        self.pubsub = None
        self.active = False
        self.messages_processed = 0
        self.errors_encountered = 0
        logger.info(f"NodeCommunicator initialized for node {node_id}")
        
    def initialize(self):
        """Initialize the pub/sub connection and start listening for messages"""
        try:
            self.pubsub = self.redis.pubsub(ignore_subscribe_messages=True)
            
            # Subscribe to channels
            channels = {
                "broadcast": self._handle_broadcast,
                f"node:{self.node_id}": self._handle_direct_message,
                "time_sync": self._handle_time_sync
            }
            
            self.pubsub.subscribe(**channels)
            logger.info(f"Subscribed to channels: {', '.join(channels.keys())}")
            self.active = True
            
        except Exception as e:
            logger.error(f"Failed to initialize pub/sub: {e}", exc_info=True)
            self.active = False
            raise
        
    def register_handler(self, message_type: str, handler: Callable):
        """Register a handler for a specific message type"""
        logger.debug(f"Registering handler for message type: {message_type}")
        self.message_handlers[message_type] = handler
        
    def broadcast_message(self, message_type: str, data: Dict[str, Any]):
        """Send a message to all nodes"""
        message = {
            "sender": self.node_id,
            "type": message_type,
            "data": data,
            "timestamp": time.time(),
            "message_id": f"{self.node_id}-{time.time()}-{self.messages_processed}"
        }
        
        try:
            message_json = json.dumps(message)
            recipients = self.redis.publish("broadcast", message_json)
            logger.debug(f"Broadcast message '{message_type}' sent to {recipients} recipients", 
                      extra={"message_id": message["message_id"]})
            return True
        except Exception as e:
            logger.error(f"Failed to broadcast message '{message_type}': {e}", exc_info=True)
            self.errors_encountered += 1
            return False
        
    def send_direct_message(self, target_node: str, message_type: str, data: Dict[str, Any]):
        """Send a message to a specific node"""
        message = {
            "sender": self.node_id,
            "type": message_type,
            "data": data,
            "timestamp": time.time(),
            "message_id": f"{self.node_id}-{time.time()}-{self.messages_processed}"
        }
        
        try:
            message_json = json.dumps(message)
            recipients = self.redis.publish(f"node:{target_node}", message_json)
            
            if recipients > 0:
                logger.debug(f"Direct message '{message_type}' sent to node {target_node}", 
                          extra={"message_id": message["message_id"], "recipient": target_node})
                return True
            else:
                logger.warning(f"Direct message sent but no recipients for node {target_node}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send direct message to {target_node}: {e}", exc_info=True)
            self.errors_encountered += 1
            return False
        
    def _handle_broadcast(self, message):
        """Process a broadcast message"""
        try:
            parsed = json.loads(message["data"])
            
            # Skip messages from self
            if parsed["sender"] == self.node_id:
                return
                
            logger.debug(f"Received broadcast: {parsed.get('type')} from {parsed.get('sender')}",
                      extra={"message_id": parsed.get("message_id", "unknown")})
            
            self._dispatch_message(parsed)
            self.messages_processed += 1
            
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in broadcast message: {message['data'][:100]}...")
            self.errors_encountered += 1
        except Exception as e:
            logger.error(f"Error handling broadcast message: {e}", exc_info=True)
            self.errors_encountered += 1
            
    def _handle_direct_message(self, message):
        """Process a direct message"""
        try:
            parsed = json.loads(message["data"])
            logger.debug(f"Received direct message: {parsed.get('type')} from {parsed.get('sender')}",
                      extra={"message_id": parsed.get("message_id", "unknown")})
            
            self._dispatch_message(parsed)
            self.messages_processed += 1
            
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in direct message: {message['data'][:100]}...")
            self.errors_encountered += 1
        except Exception as e:
            logger.error(f"Error handling direct message: {e}", exc_info=True)
            self.errors_encountered += 1
            
    def _handle_time_sync(self, message):
        """Process a time sync message"""
        try:
            parsed = json.loads(message["data"])
            logger.debug(f"Received time sync from {parsed.get('sender')}")
            
            # If we're not the leader, update our time
            from node_server import node_state
            if not node_state.is_leader and "system_time" in parsed:
                node_state.system_time = parsed["system_time"]
                logger.debug(f"Synchronized time to {parsed['system_time']}")
                
        except Exception as e:
            logger.error(f"Error handling time sync message: {e}", exc_info=True)
            
    def _dispatch_message(self, message):
        """Dispatch message to the appropriate handler"""
        message_type = message.get("type")
        
        if message_type in self.message_handlers:
            try:
                handler = self.message_handlers[message_type]
                logger.debug(f"Dispatching message '{message_type}' to registered handler")
                handler(message)
            except Exception as e:
                logger.error(f"Error in handler for {message_type}: {e}", exc_info=True)
                self.errors_encountered += 1
        else:
            logger.warning(f"No handler registered for message type: {message_type}")
            
    async def listen_for_messages(self):
        """Continuously listen for messages in a background task"""
        logger.info("Starting message listener task")
        
        while self.active:
            try:
                # Get message with small timeout
                message = self.pubsub.get_message(timeout=0.01)
                
                if message:
                    channel = message.get("channel")
                    
                    # Route message to appropriate handler based on channel
                    if isinstance(channel, bytes):
                        channel_str = channel.decode('utf-8')
                    else:
                        channel_str = channel
                        
                    if channel_str == "broadcast":
                        self._handle_broadcast(message)
                    elif channel_str == f"node:{self.node_id}":
                        self._handle_direct_message(message)
                    elif channel_str == "time_sync":
                        self._handle_time_sync(message)
                        
                # Small sleep to prevent CPU hogging
                await asyncio.sleep(0.01)
                
            except redis.RedisError as e:
                logger.error(f"Redis error in message listener: {e}")
                await asyncio.sleep(1)  # Longer sleep on Redis error
                
            except Exception as e:
                logger.error(f"Error in message listener: {e}", exc_info=True)
                await asyncio.sleep(1)  # Longer sleep on error
                
        logger.info("Message listener task stopped")
        
    def get_stats(self):
        """Get communication statistics"""
        return {
            "messages_processed": self.messages_processed,
            "errors_encountered": self.errors_encountered,
            "active": self.active
        }