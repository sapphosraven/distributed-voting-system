import { API_ENDPOINTS, getToken } from '../config/api';

export interface ElectionResults {
  election_id: string;
  title: string;
  description: string;
  candidates: any[];
  votes: {
    candidate_id: string;
    name: string;
    count: number;
  }[];
  total_votes: number;
}

export const getResults = async (electionId: string): Promise<ElectionResults> => {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(API_ENDPOINTS.electionResults(electionId), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch results');
  }

  return response.json();
};