import { API_ENDPOINTS } from "../config/api";
import { Election, ElectionListItem } from "../types/election";
import { getToken } from "./login";

// Get elections the user is eligible to vote in
export const getEligibleElections = async (): Promise<ElectionListItem[]> => {
  const response = await fetch(API_ENDPOINTS.elections, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch eligible elections');
  }
  
  return response.json();
};

// Get specific election details
export const getElectionDetails = async (electionId: string): Promise<Election> => {
  const response = await fetch(`${API_ENDPOINTS.elections}/${electionId}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch election details for ${electionId}`);
  }
  
  return response.json();
};

// Create a new election
export const createElection = async (election: Omit<Election, 'id'>): Promise<Election> => {
  const response = await fetch(API_ENDPOINTS.elections, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(election)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create election');
  }
  
  return response.json();
};

// Get elections the user has voted in
export const getVotedElections = async (): Promise<ElectionListItem[]> => {
  const response = await fetch(API_ENDPOINTS.votedElections, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch voted elections');
  }
  
  return response.json();
};

// Get candidates for a specific election
export const getElectionCandidates = async (electionId: string) => {
  const response = await fetch(`${API_ENDPOINTS.elections}/${electionId}/candidates`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch candidates for election ${electionId}`);
  }
  
  return response.json();
};