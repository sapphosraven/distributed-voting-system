import { API_ENDPOINTS } from '../config/api';
import { getToken } from './login';

export interface Candidate {
  id: string;
  name: string;
  photo: string;
  party?: string;
  shortDesc?: string;
  longDesc?: string;
}

export interface VoteResponse {
  message: string;
  vote_id: string;
  status: string;
}

export const submitVote = async (electionId: string, candidateId: string): Promise<VoteResponse> => {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(API_ENDPOINTS.vote, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      election_id: electionId,
      candidate_id: candidateId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to submit vote');
  }

  return response.json();
};

export const fetchCandidates = async (): Promise<Candidate[]> => {
  const response = await fetch(API_ENDPOINTS.candidates);
  
  if (!response.ok) {
    throw new Error('Failed to fetch candidates');
  }
  
  return response.json();
};