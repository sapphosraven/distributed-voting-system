// Replace the entire file with:
import { API_ENDPOINTS } from "../config/api";
import { Election, ElectionListItem } from "../types/election";
import { getToken } from "./login";


const token = getToken();
console.log('Using token:', token);
console.log('Full header:', `Bearer ${token}`);
// Get elections the user is eligible to vote in
export const getEligibleElections = async (): Promise<ElectionListItem[]> => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(API_ENDPOINTS.elections, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch eligible elections: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching elections:', error);
    throw error;
  }
};

// Get specific election details
export const getElectionDetails = async (electionId: string): Promise<Election> => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.elections}/${electionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch election details: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Error fetching election ${electionId}:`, error);
    throw error;
  }
};

// Create a new election
export const createElection = async (election: Omit<Election, 'id'>): Promise<Election> => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(API_ENDPOINTS.elections, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(election)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.detail || 
        `Failed to create election: ${response.status}`
      );
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating election:', error);
    throw error;
  }
};

// Get elections the user has voted in
export const getVotedElections = async (): Promise<ElectionListItem[]> => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(API_ENDPOINTS.votedElections, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch voted elections: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching voted elections:', error);
    throw error;
  }
};

// Get candidates for a specific election
export const getElectionCandidates = async (electionId: string) => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.elections}/${electionId}/candidates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch candidates: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Error fetching candidates for election ${electionId}:`, error);
    throw error;
  }
};