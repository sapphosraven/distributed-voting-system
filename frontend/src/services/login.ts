import { API_ENDPOINTS } from '../config/api';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const signin = async (payload: { email: string; password: string }): Promise<LoginResponse> => {
  const response = await fetch(API_ENDPOINTS.login, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: payload.email,
      password: payload.password,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const data = await response.json();
  localStorage.setItem('token', JSON.stringify(data));
  
  return data;
};

export const signout = () => {
  localStorage.removeItem('token');
};