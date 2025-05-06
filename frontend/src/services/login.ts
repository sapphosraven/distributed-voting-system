import { API_ENDPOINTS } from '../config/api';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const singin = async (payload: { username: string; password: string }): Promise<LoginResponse> => {
  const response = await fetch(API_ENDPOINTS.login, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: payload.username,
      password: payload.password,
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  return response.json();
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