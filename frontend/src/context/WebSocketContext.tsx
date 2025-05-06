import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';

interface WebSocketContextType {
  status: WebSocketStatus;
  lastMessage: any;
  sendMessage: (message: any) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    
    const ws = new WebSocket(API_ENDPOINTS.websocket);
    setStatus('connecting');
    
    ws.onopen = () => {
      setStatus('connected');
      console.log('WebSocket connection established');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        console.log('Received:', data);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', event.data);
      }
    };
    
    ws.onclose = () => {
      setStatus('disconnected');
      setTimeout(() => connect(), 5000); // Try to reconnect after 5 seconds
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };
    
    setSocket(ws);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, [socket]);

  const subscribe = useCallback((topic: string) => {
    sendMessage({
      action: 'subscribe',
      topic
    });
  }, [sendMessage]);

  const unsubscribe = useCallback((topic: string) => {
    sendMessage({
      action: 'unsubscribe',
      topic
    });
  }, [sendMessage]);

  // Connect on component mount
  useEffect(() => {
    connect();
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [connect]);

  // Automatically subscribe to vote_updates
  useEffect(() => {
    if (status === 'connected') {
      subscribe('vote_updates');
    }
  }, [status, subscribe]);

  return (
    <WebSocketContext.Provider value={{ status, lastMessage, sendMessage, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};