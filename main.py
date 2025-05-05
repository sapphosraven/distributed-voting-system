from fastapi import FastAPI, Depends, HTTPException
from auth.models import VoteRequest
from auth import get_current_user
import logging
import os
from auth.router import auth_router

# Create log directory
if not os.path.exists("logs"):
    os.makedirs("logs")

# Configure logging
logging.basicConfig(
    filename="logs/vote_audit.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

app = FastAPI(title="Distributed Voting System")

# Include authentication routes
app.include_router(auth_router, prefix="/auth")

import httpx

@app.post("/vote")
async def cast_vote(vote: VoteRequest, username: str = Depends(get_current_user)):
    """Cast a vote through the distributed system"""
    logging.info(f"ENTERING cast_vote: User='{username}', Vote='{vote.candidate_id}'")
    
    # Forward to a distributed node
    try:
        # Default to first node - this would be more sophisticated in production
        node_url = os.getenv("VOTING_NODE_URL", "http://localhost:5001/votes")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                node_url,
                json={
                    "voter_id": username,
                    "candidate_id": vote.candidate_id,
                    "election_id": "election-2025"  # Default election ID
                },
                timeout=5.0
            )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "message": f"Vote for {vote.candidate_id} received",
                "vote_id": result.get("vote_id", "unknown"),
                "status": result.get("status", "processed")
            }
        else:
            logging.error(f"Error from node: {response.text}")
            return {"message": f"Vote processing error: {response.status_code}"}
            
    except Exception as e:
        logging.error(f"Error forwarding vote: {e}")
        return {"message": f"Error: {str(e)}"}
    
# Root endpoint
@app.get("/")
def root():
    return {"message": "Distributed Voting System is running!"}
