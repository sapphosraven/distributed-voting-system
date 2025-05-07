// Replace with:
// Base URLs for API and WebSocket
export const API_URL = "http://localhost:8000";  // API Gateway
export const WS_BASE_URL = "ws://localhost:8000/ws";  // WebSocket endpoint

export const API_ENDPOINTS = {
  login: `${API_URL}/auth/login`,
  elections: `${API_URL}/elections`,
  candidates: `${API_URL}/candidates`,
  vote: `${API_URL}/vote`,
  results: `${API_URL}/results`,
  votedElections: `${API_URL}/user/voted-elections`,
};