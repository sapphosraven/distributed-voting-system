import { API_ENDPOINTS } from '../config/api';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const signin = async (payload: { email: string; password: string }): Promise<LoginResponse> => {
  const response = await fetch(API_ENDPOINTS.login, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  // Normalize backend response to { access_token, token_type }
  const data = await response.json();
  if (data.token) {
    return { access_token: data.token, token_type: 'bearer' };
  }
  // fallback for legacy/other responses
  return data;
};

export const getToken = (): string | null => {
  const tokenData = localStorage.getItem('token');
  if (!tokenData) return null;
  
  try {
    const parsed = JSON.parse(tokenData);
    return parsed.access_token;
  } catch (e) {
    return null;
  }
};