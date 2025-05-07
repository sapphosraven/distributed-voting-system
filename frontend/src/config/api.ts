// If you're using Docker's host networking
export const API_URL = "http://localhost:8000";
export const WS_BASE_URL = 'ws://localhost:8000/ws';

export const API_ENDPOINTS = {
  login: `${API_URL}/auth/login`,
  candidates: `${API_URL}/candidates`,
  vote: `${API_URL}/votes`,
  results: `${API_URL}/results`,
  elections: `${API_URL}/elections`,
  votedElections: `${API_URL}/user/voted-elections`,
};