from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, Field
import time
import uuid
import logging
from typing import Dict, Any, Optional

# Import from parent module - adjust paths as needed
from .. import consensus
from ..node_server import start_consensus_process, validate_vote

# Set up logger
logger = logging.getLogger("node.api.votes")

# Create router
vote_router = APIRouter(prefix="/votes", tags=["votes"])

# Vote model - copied from node_server.py to avoid circular imports
class Vote(BaseModel):
    voter_id: str
    election_id: str
    candidate_id: str
    timestamp: float = Field(default_factory=time.time)
    signature: str = ""

# Vote API endpoints
@vote_router.post("", status_code=status.HTTP_202_ACCEPTED)
async def submit_vote(vote: Vote, background_tasks: BackgroundTasks):
    """Submit a vote for processing"""
    logger.info(f"Received vote from voter {vote.voter_id} for election {vote.election_id}")
    
    # Generate a unique ID for this vote
    vote_id = f"{vote.election_id}:{vote.voter_id}:{uuid.uuid4()}"
    
    # Validate the vote (basic checks)
    validation_result = await validate_vote(vote)
    if not validation_result["valid"]:
        logger.warning(f"Vote validation failed: {validation_result['reason']}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_result["reason"]
        )
    
    # Check for duplicate votes
    if vote.voter_id in consensus.voter_history and vote.election_id in consensus.voter_history[vote.voter_id]:
        logger.warning(f"Duplicate vote detected from {vote.voter_id} for election {vote.election_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voter has already cast a vote in this election"
        )
    
    # Store vote in pending votes
    consensus.pending_votes[vote_id] = vote
    
    # Initialize approvals with this node
    consensus.vote_approvals[vote_id] = {NODE_ID}
    
    # Start consensus process in background
    background_tasks.add_task(start_consensus_process, vote_id, vote)
    
    return {"status": "accepted", "vote_id": vote_id}

@vote_router.get("/{vote_id}")
async def get_vote_status(vote_id: str):
    """Get the status of a specific vote"""
    # Check if vote is finalized
    if vote_id in consensus.finalized_votes:
        return {
            "status": "finalized",
            "vote": consensus.finalized_votes[vote_id]
        }
    
    # Check if vote is pending
    if vote_id in consensus.pending_votes:
        node_count = len(node_state.connected_nodes) + 1  # +1 for this node
        approval_count = len(consensus.vote_approvals.get(vote_id, set()))
        
        return {
            "status": "pending",
            "approvals": approval_count,
            "total_nodes": node_count,
            "approval_percentage": int(100 * approval_count / max(1, node_count))
        }
    
    # Vote not found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Vote not found"
    )