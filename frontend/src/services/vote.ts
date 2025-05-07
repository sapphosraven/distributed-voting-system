// Replace the entire file with:
import { API_ENDPOINTS } from '../config/api';
import { getToken } from './login';

export interface Candidate {
  id: string;
  name: string;
  photo?: string;
  party?: string;
  description?: string;
}

export interface VoteResponse {
  message: string;
  vote_id: string;
  status: string;
}

export const submitVote = async (electionId: string, candidateId: string): Promise<VoteResponse> => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
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
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.detail || 
        `Failed to submit vote: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting vote:', error);
    throw error;
  }
};

export const getVoteStatus = async (voteId: string): Promise<any> => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.vote}/${voteId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vote status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching vote status for vote ${voteId}:`, error);
    throw error;
  }
};