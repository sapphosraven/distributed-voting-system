import { API_ENDPOINTS } from '../config/api';
import { getToken } from './login';

export interface ElectionResults {
  candidates: {
    [key: string]: number;
  };
  total_votes: number;
}

export const getResults = async (electionId: string): Promise<ElectionResults> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_ENDPOINTS.elections}/${electionId}/results`, {
    method: 'GET',
    headers
  });
  if (!response.ok) {
    throw new Error('Failed to fetch results');
  }
  return response.json();
};