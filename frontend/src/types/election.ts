export interface Election {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    created_by: string;
    eligible_voters: string[]; // emails or domains
    candidates: Candidate[];
    status: 'active' | 'completed' | 'upcoming';
}

export interface ElectionListItem {
    id: string;
    title: string;
    description: string;
    end_date: string;
    hasVoted: boolean;
    status: 'active' | 'completed' | 'upcoming';
}

export interface Candidate {
    id: string;
    name: string;
    photo?: string;
    party?: string;
    description?: string;
}

export interface VoteRecord {
    election_id: string;
    candidate_id: string;
    timestamp: string;
}

export interface ElectionResult {
    election_id: string;
    title: string;
    candidates: Candidate[];
    votes: {
      candidate_id: string;
      count: number;
    }[];
    total_votes: number;
    end_date: string;
}