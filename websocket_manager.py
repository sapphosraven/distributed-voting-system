import uuid
from fastapi import WebSocket
from typing import List, Dict, Any, Set
import logging
import json
import asyncio

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        # active_connections: WebSocket -> Set[str] (subscribed topics)
        self.active_connections = []
        
    # Add user_id parameter to connect method (find the current connect method)
    async def connect(self, websocket: WebSocket, client_id: str = None, user_id: str = None):
        await websocket.accept()
        self.active_connections.append({
            "websocket": websocket,
            "client_id": client_id or str(uuid.uuid4()),
            "user_id": user_id,
            "subscribed_topics": []
        })
        return self.active_connections[-1]["client_id"]

    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client"""
        for i, connection in enumerate(self.active_connections):
            if connection["websocket"] == websocket:
                self.active_connections.pop(i)
                logger.info("Client disconnected")
                break
    
    async def subscribe(self, websocket: WebSocket, topic: str):
        """Subscribe a client to a topic"""
        for connection in self.active_connections:
            if connection["websocket"] == websocket:
                connection["subscribed_topics"].append(topic)
                logger.info(f"Client subscribed to: {topic}")
                return True
        return False
        
    async def unsubscribe(self, websocket: WebSocket, topic: str):
        """Unsubscribe a client from a topic"""
        for connection in self.active_connections:
            if connection["websocket"] == websocket:
                if topic in connection["subscribed_topics"]:
                    connection["subscribed_topics"].remove(topic)
                    logger.info(f"Client unsubscribed from: {topic}")
                    return True
        return False
    
    async def send_heartbeat(self):
        """Send heartbeat to all connected clients"""
        while True:
            await asyncio.sleep(30)  # Send heartbeat every 30 seconds
            dead_connections = []
            
            for connection in self.active_connections:
                try:
                    await connection["websocket"].send_json({"type": "heartbeat"})
                except Exception as e:
                    # Mark connection for removal
                    dead_connections.append(connection)
                    
            # Remove dead connections
            for connection in dead_connections:
                self.active_connections.remove(connection)
                
    async def broadcast(self, message: Dict[str, Any], topic: str = "vote_updates"):
        """Broadcast a message to all clients subscribed to the topic"""
        disconnected_indices = []
        
        for i, connection in enumerate(self.active_connections):
            if topic in connection["subscribed_topics"]:
                try:
                    await connection["websocket"].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
                    disconnected_indices.append(i)
        
        # Remove disconnected clients (in reverse order to avoid index shifting)
        for i in sorted(disconnected_indices, reverse=True):
            self.active_connections.pop(i)
            
# Create a global connection manager instance
connection_manager = ConnectionManager()