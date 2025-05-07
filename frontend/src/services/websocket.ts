import { WS_BASE_URL } from '../config/api';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private isConnecting = false;
  
  constructor() {
    this.connect();
  }
  
  private connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) return;
    
    try {
      this.isConnecting = true;
      this.socket = new WebSocket(WS_BASE_URL);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnecting = false;
        this.resubscribeAll();
        this.connectionHandlers.forEach(handler => handler());
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.socket.onclose = () => {
        this.isConnecting = false;
        console.log('WebSocket connection closed, attempting to reconnect...');
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (error) => {
        this.isConnecting = false;
        console.error('WebSocket error:', error);
        this.socket?.close();
      };
    } catch (error) {
      this.isConnecting = false;
      console.error('Failed to establish WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }
  
  private resubscribeAll() {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    
    // Resubscribe to all topics
    for (const topic of this.subscriptions.keys()) {
      this.subscribe(topic);
    }
  }
  
  private handleMessage(data: any) {
    if (!data.event) return;
    
    // Find all subscribers for this event type
    const handlers = this.subscriptions.get(data.event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
    
    // Also notify "all" subscribers
    const allHandlers = this.subscriptions.get('all');
    if (allHandlers) {
      allHandlers.forEach(handler => handler(data));
    }
  }
  
  public subscribe(topic: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'subscribe',
        topic
      }));
    }
  }
  
  public onMessage(event: string, handler: MessageHandler) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
      this.subscribe(event);
    }
    
    this.subscriptions.get(event)!.add(handler);
    
    return () => {
      const handlers = this.subscriptions.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscriptions.delete(event);
        }
      }
    };
  }
  
  public onConnect(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
    
    // If already connected, call handler immediately
    if (this.socket?.readyState === WebSocket.OPEN) {
      handler();
    }
    
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }
  
  public close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.onclose = null; // Prevent reconnect on intentional close
      this.socket.close();
      this.socket = null;
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();