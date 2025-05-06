from fastapi import WebSocket
from typing import List, Dict, Any, Set
import logging
import json
import asyncio

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        # active_connections: WebSocket -> Set[str] (subscribed topics)
        self.active_connections: Dict[WebSocket, Set[str]] = {}
        
    async def connect(self, websocket: WebSocket, topics: List[str] = None):
        """Connect a WebSocket client and optionally subscribe to topics"""
        await websocket.accept()
        if topics is None:
            topics = ["vote_updates"]  # Default topic
        
        self.active_connections[websocket] = set(topics)
        logger.info(f"Client connected - Subscribed to: {topics}")
        
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client"""
        if websocket in self.active_connections:
            self.active_connections.pop(websocket)
            logger.info("Client disconnected")
    
    async def subscribe(self, websocket: WebSocket, topic: str):
        """Subscribe a client to a topic"""
        if websocket in self.active_connections:
            self.active_connections[websocket].add(topic)
            logger.info(f"Client subscribed to: {topic}")
            return True
        return False
    
    async def unsubscribe(self, websocket: WebSocket, topic: str):
        """Unsubscribe a client from a topic"""
        if websocket in self.active_connections and topic in self.active_connections[websocket]:
            self.active_connections[websocket].remove(topic)
            logger.info(f"Client unsubscribed from: {topic}")
            return True
        return False
    
    async def broadcast(self, message: Dict[str, Any], topic: str = "vote_updates"):
        """Broadcast a message to all clients subscribed to the topic"""
        disconnected_websockets = []
        
        for websocket, topics in self.active_connections.items():
            if topic in topics:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
                    disconnected_websockets.append(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected_websockets:
            self.disconnect(websocket)
        
        if disconnected_websockets:
            logger.info(f"Removed {len(disconnected_websockets)} disconnected clients")

# Create a global connection manager instance
connection_manager = ConnectionManager()