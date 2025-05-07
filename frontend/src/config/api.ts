export const API_URL = "http://localhost:8000";  // Update with your server address

export const API_ENDPOINTS = {
  login: `${API_URL}/auth/login`,
  candidates: `${API_URL}/candidates`,
  vote: `${API_URL}/vote`,
  elections: `${API_URL}/elections`,
  votedElections: `${API_URL}/user/voted-elections`,
  electionResults: (id: string) => `${API_URL}/elections/${id}/results`,
  websocket: `ws://localhost:8000/ws`
};

// Token helper function
export const getToken = (): string | null => {
  const tokenData = localStorage.getItem('token');
  if (!tokenData) return null;
  
  try {
    // Parse the stored token JSON
    const parsed = JSON.parse(tokenData);
    
    // If the token is a string, return it directly
    if (typeof parsed === 'string') return parsed;
    
    // If there's an access_token field, return that
    if (parsed.access_token) return parsed.access_token;
    
    // If token is stored directly in the top level object
    if (parsed.token) return parsed.token;
    
    // Otherwise return the whole parsed object as a string
    return JSON.stringify(parsed);
  } catch {
    // If JSON parsing fails, return the raw token string
    return tokenData;
  }
};

export const debugToken = () => {
  const tokenData = localStorage.getItem('token');
  console.log('Raw token from localStorage:', tokenData);
  
  try {
    if (tokenData) {
      const parsed = JSON.parse(tokenData);
      console.log('Parsed token:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('Error parsing token:', error);
  }
  return null;
};