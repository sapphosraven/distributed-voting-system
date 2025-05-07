import { API_ENDPOINTS, getToken } from '../config/api';

export interface Election {
  id: string;
  title: string;
  description: string;
  end_date: string;
  hasVoted: boolean;
  status: string;
}



export const getEligibleElections = async (): Promise<Election[]> => {
  const token = getToken();
  console.log('Using token:', token?.substring(0, 20) + '...');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  // Ensure proper header format for Bearer token
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  try {
    const response = await fetch(API_ENDPOINTS.elections, {
      method: 'GET',
      headers,
      credentials: 'include' // Add this line for cookies if needed
    });
    
    console.log('Elections API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error('Failed to fetch elections');
    }

    return response.json();
  } catch (error) {
    console.error('Error in getEligibleElections:', error);
    throw error;
  }
};

export const getElectionDetails = async (electionId: string) => {

  
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_ENDPOINTS.elections}/${electionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch election details');
  }

  return response.json();
};

// Update the createElection function with better error handling
export const createElection = async (electionData: any) => {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log("Creating election with token:", token?.substring(0, 15) + "...");
  
  try {
    const response = await fetch(API_ENDPOINTS.elections, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(electionData)
    });

    console.log("API response status:", response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to create election';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // If parsing fails, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    console.error('Error in createElection:', error);
    throw error;
  }
};

export const getVotedElections = async (): Promise<Election[]> => {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(API_ENDPOINTS.votedElections, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch voted elections');
  }

  return response.json();
};