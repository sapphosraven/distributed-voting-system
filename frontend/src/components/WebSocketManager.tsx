// Create or replace with:
import { useEffect } from 'react';
import { webSocketService } from '../services/websocket';

interface WebSocketManagerProps {
  onVoteUpdate?: (data: any) => void;
}

const WebSocketManager: React.FC<WebSocketManagerProps> = ({ onVoteUpdate }) => {
  useEffect(() => {
    console.log('Setting up WebSocket listeners...');
    
    // Connect to WebSocket server
    const connectCleanup = webSocketService.onConnect(() => {
      console.log('WebSocket connected in component');
    });
    
    // Subscribe to vote update events
    const voteUpdateCleanup = webSocketService.onMessage('vote_update', (data) => {
      console.log('Vote update received:', data);
      if (onVoteUpdate) onVoteUpdate(data);
    });
    
    return () => {
      connectCleanup();
      voteUpdateCleanup();
    };
  }, [onVoteUpdate]);

  return null; // This component doesn't render anything
};

export default WebSocketManager;