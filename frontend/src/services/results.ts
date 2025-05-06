import { API_ENDPOINTS } from '../config/api';
import { getToken } from './login';

export interface ElectionResults {
  candidates: {
    [key: string]: number;
  };
  total_votes: number;
}

export const getResults = async (electionId?: string): Promise<ElectionResults> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Use the election ID if provided
  const url = electionId 
    ? `${API_ENDPOINTS.baseUrl}/elections/${electionId}/results`
    : API_ENDPOINTS.results;
  
  const response = await fetch(url, {
    method: 'GET',
    headers
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch results');
  }
  
  return response.json();
};