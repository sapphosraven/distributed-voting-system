import { API_ENDPOINTS, getToken } from '../config/api';

export interface VoteResponse {
  message: string;
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
      candidate_id: candidateId
    })
  });

  if (!response.ok) {
    throw new Error('Failed to submit vote');
  }

  return response.json();
};