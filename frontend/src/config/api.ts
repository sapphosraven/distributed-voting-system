// If you're using Docker's host networking
export const API_URL = "http://localhost:5002/api";
export const WS_BASE_URL = 'ws://localhost:5002/ws';

export const API_ENDPOINTS = {
  login: `${API_URL}/auth/login`,
  register: `${API_URL}/auth/register`,
  candidates: `${API_URL}/candidates`,
  vote: `${API_URL}/vote/cast`,
  results: `${API_URL}/vote/results`,
  elections: `${API_URL}/elections`,
  votedElections: `${API_URL}/user/voted-elections`,
  websocket: WS_BASE_URL
};