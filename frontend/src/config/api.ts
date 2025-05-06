export const API_BASE_URL = 'http://localhost:8000';
export const WS_BASE_URL = 'ws://localhost:8000/ws';

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login`,
  vote: `${API_BASE_URL}/vote`,
  candidates: `${API_BASE_URL}/candidates`,
  results: `${API_BASE_URL}/results`,
  systemStatus: `${API_BASE_URL}/system/status`,
  websocket: WS_BASE_URL
};