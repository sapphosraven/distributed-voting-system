import { API_ENDPOINTS } from '../config/api';

export const setupWebSocket = (electionId: string, onUpdate: (data: any) => void) => {
  const ws = new WebSocket(API_ENDPOINTS.websocket);
  
  ws.onopen = () => {
    console.log('WebSocket connection established');
    ws.send(JSON.stringify({
      action: 'subscribe',
      election_id: electionId
    }));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onUpdate(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  return {
    close: () => ws.close()
  };
};