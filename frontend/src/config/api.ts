// If you're using Docker's host networking
export const API_URL = "http://localhost:8000";
export const WS_BASE_URL = 'ws://localhost:8000/ws';

export const API_ENDPOINTS = {
  login: `${API_URL}/auth/login`,
  vote: `${API_URL}/vote`,
  candidates: `${API_URL}/candidates`,
  results: `${API_URL}/results`,
  systemStatus: `${API_URL}/system/status`,
  websocket: WS_BASE_URL
};