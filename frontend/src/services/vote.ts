import { API_ENDPOINTS } from '../config/api';
import { getToken } from './login';

export interface Candidate {
  id: string;
  name: string;
  photo: string;
  party?: string;
  shortDesc?: string;
  longDesc?: string;
  description?: string;
}

export interface VoteResponse {
  message: string;
  vote_id: string;
  status: string;
}

export const submitVote = async (electionId: string, candidateId: string): Promise<VoteResponse> => {
  let token = getToken();
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
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    throw new Error(errorData.message || errorData.detail || 'Failed to submit vote');
  }

  return response.json();
};

// Fetch all candidates (legacy/global)
export const fetchCandidates = async (): Promise<Candidate[]> => {
  const response = await fetch(API_ENDPOINTS.candidates);
  if (!response.ok) {
    throw new Error('Failed to fetch candidates');
  }
  return response.json();
};

// Fetch candidates for a specific election
export const fetchElectionCandidates = async (electionId: string): Promise<Candidate[]> => {
  const token = getToken();
  const response = await fetch(`${API_ENDPOINTS.elections}/${electionId}/candidates`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch candidates for this election');
  }
  return response.json();
};