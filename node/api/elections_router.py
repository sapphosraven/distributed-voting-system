from fastapi import APIRouter, HTTPException
import logging

# Import from parent module
from .. import consensus

# Set up logger
logger = logging.getLogger("node.api.elections")

# Create router
election_router = APIRouter(prefix="/elections", tags=["elections"])

@election_router.get("/{election_id}/results")
async def get_election_results(election_id: str):
    """Get the current results for an election"""
    # Filter finalized votes for this election
    election_votes = [vote for vote in consensus.finalized_votes.values() 
                    if vote.election_id == election_id]
    
    if not election_votes:
        return {"election_id": election_id, "total_votes": 0, "results": {}}
    
    # Count votes per candidate
    results = {}
    for vote in election_votes:
        candidate_id = vote.candidate_id
        results[candidate_id] = results.get(candidate_id, 0) + 1
    
    return {
        "election_id": election_id,
        "total_votes": len(election_votes),
        "results": results
    }

@election_router.delete("/{election_id}", prefix="/admin")
async def reset_election_data(election_id: str):
    """Reset/clear all votes for a specific election (admin endpoint)"""
    
    logger.warning(f"Resetting all vote data for election {election_id}")
    
    # Count votes to be removed
    removed_votes = 0
    
    # Remove votes from finalized_votes
    to_remove = []
    for vote_id, vote in consensus.finalized_votes.items():
        if vote.election_id == election_id:
            to_remove.append(vote_id)
            removed_votes += 1
    
    # Actually remove the votes
    for vote_id in to_remove:
        del consensus.finalized_votes[vote_id]
    
    # Clean voter history for this election
    for voter_id, elections in consensus.voter_history.items():
        if election_id in elections:
            del elections[election_id]
            
    # Also check pending votes
    to_remove = []
    for vote_id, vote in consensus.pending_votes.items():
        if vote.election_id == election_id:
            to_remove.append(vote_id)
            removed_votes += 1
    
    for vote_id in to_remove:
        del consensus.pending_votes[vote_id]
        if vote_id in consensus.vote_approvals:
            del consensus.vote_approvals[vote_id]
    
    return {
        "election_id": election_id,
        "votes_removed": removed_votes,
        "status": "election data reset"
    }