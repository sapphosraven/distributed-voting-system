// Replace the entire file with:
import { API_ENDPOINTS } from '../config/api';
import { getToken } from './login';

export interface ElectionResults {
  election_id: string;
  total_votes: number;
  results: {
    [candidateId: string]: number;
  };
}

export const getResults = async (electionId: string): Promise<ElectionResults> => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.results}/${electionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch results: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching results:', error);
    throw error;
  }
};