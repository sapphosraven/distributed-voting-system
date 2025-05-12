import { API_ENDPOINTS } from '../config/api';

export const register = async (payload: { email: string; password: string }) => {
  const response = await fetch(API_ENDPOINTS.register, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Registration failed');
  }

  return response.json();
};
