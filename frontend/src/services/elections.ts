import { API_ENDPOINTS } from '../config/api';
import { getToken } from './login';

export interface Election {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  eligible_domains: string[];
  has_voted: boolean;
}

export const fetchElections = async (): Promise<Election[]> => {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_ENDPOINTS.baseUrl}/elections`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch elections');
  }

  return response.json();
};

export interface CreateElectionRequest {
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    eligible_emails?: string[];
    eligible_domains?: string[];
    candidates: {
      name: string;
      description?: string;
      party?: string;
    }[];
  }
  
  export interface CreateElectionResponse {
    id: string;
    title: string;
    created_by: string;
    status: string;
  }
  
  export const createElection = async (
    electionData: CreateElectionRequest
  ): Promise<CreateElectionResponse> => {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
  
    const response = await fetch(API_ENDPOINTS.createElection, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(electionData),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create election');
    }
  
    return response.json();
  };