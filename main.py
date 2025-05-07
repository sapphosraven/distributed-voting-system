from fastapi import FastAPI, HTTPException, Depends, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from node.Models import ElectionCreate, ElectionResponse, CandidateBase
import uuid
import logging
import json
from typing import Dict, List
from datetime import datetime

# Import authentication from auth file
from auth.auth import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory databases for demo
elections_db: Dict[str, Dict] = {}
votes_db: Dict[str, Dict] = {}  # election_id -> {user_email -> candidate_id}

# Authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# API Endpoints

@app.get("/")
async def root():
    return {"message": "Distributed Voting System API"}

# Election Management Endpoints

@app.post("/elections", response_model=ElectionResponse)
async def create_election(election: ElectionCreate, username: str = Depends(get_current_user)):
    """Create a new election"""
    try:
        # Generate a unique ID for the election
        election_id = str(uuid.uuid4())
        
        # Store the election
        election_data = election.dict()
        election_data["id"] = election_id
        
        # Convert datetime objects to strings for storage
        election_data["start_date"] = election_data["start_date"].isoformat()
        election_data["end_date"] = election_data["end_date"].isoformat()
        
        # Add candidate IDs if they don't have them
        for i, candidate in enumerate(election_data["candidates"]):
            if "id" not in candidate or not candidate["id"]:
                candidate["id"] = f"{election_id}-candidate-{i+1}"
        
        # Store in our in-memory DB
        elections_db[election_id] = election_data
        
        # Initialize votes for this election
        votes_db[election_id] = {}
        
        logging.info(f"Created new election: {election_id} - {election_data['title']}")
        
        return election_data
    except Exception as e:
        logging.error(f"Error creating election: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create election: {str(e)}")

@app.get("/elections")
async def get_elections(username: str = Depends(get_current_user)):
    """Get list of elections available to the user"""
    try:
        elections_list = []
        for election_id, election_data in elections_db.items():
            # Check if user is eligible by email or domain
            is_eligible = False
            for voter in election_data["eligible_voters"]:
                if voter.startswith("@"):
                    # Domain check
                    if username.endswith(voter):
                        is_eligible = True
                        break
                elif voter == username:
                    # Direct email match
                    is_eligible = True
                    break
            
            if is_eligible:
                # Check if the user has voted
                has_voted = election_id in votes_db and username in votes_db[election_id]
                
                # Create a simpler version for listings
                elections_list.append({
                    "id": election_id,
                    "title": election_data["title"],
                    "description": election_data["description"],
                    "end_date": election_data["end_date"],
                    "hasVoted": has_voted,
                    "status": election_data["status"]
                })
        
        return elections_list
    except Exception as e:
        logging.error(f"Error fetching elections: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch elections: {str(e)}")

@app.get("/elections/{election_id}")
async def get_election(election_id: str, username: str = Depends(get_current_user)):
    """Get details of a specific election"""
    try:
        if election_id not in elections_db:
            raise HTTPException(status_code=404, detail="Election not found")
            
        election_data = elections_db[election_id]
        
        # Check if user is eligible
        is_eligible = False
        for voter in election_data["eligible_voters"]:
            if voter.startswith("@"):
                # Domain check
                if username.endswith(voter):
                    is_eligible = True
                    break
            elif voter == username:
                # Direct email match
                is_eligible = True
                break
                
        if not is_eligible:
            raise HTTPException(status_code=403, detail="Not eligible for this election")
            
        return election_data
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Error fetching election {election_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch election: {str(e)}")

# Voting endpoints

@app.post("/vote")
async def cast_vote(vote: dict, username: str = Depends(get_current_user)):
    """Cast a vote in an election"""
    try:
        # Validate required fields
        if "election_id" not in vote or "candidate_id" not in vote:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        election_id = vote["election_id"]
        candidate_id = vote["candidate_id"]
        
        # Validate election exists
        if election_id not in elections_db:
            raise HTTPException(status_code=404, detail="Election not found")
        
        election = elections_db[election_id]
        
        # Check if election is active
        if election["status"] != "active":
            raise HTTPException(status_code=400, detail="Election is not active")
        
        # Check if user is eligible
        is_eligible = False
        for voter in election["eligible_voters"]:
            if voter.startswith("@"):
                if username.endswith(voter):
                    is_eligible = True
                    break
            elif voter == username:
                is_eligible = True
                break
                
        if not is_eligible:
            raise HTTPException(status_code=403, detail="Not eligible to vote in this election")
        
        # Check if candidate exists
        candidate_exists = False
        for candidate in election["candidates"]:
            if candidate["id"] == candidate_id:
                candidate_exists = True
                break
                
        if not candidate_exists:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Check if user already voted
        if election_id in votes_db and username in votes_db[election_id]:
            raise HTTPException(status_code=400, detail="Already voted in this election")
        
        # Store the vote
        if election_id not in votes_db:
            votes_db[election_id] = {}
        
        votes_db[election_id][username] = candidate_id
        
        return {"message": "Vote recorded successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Error recording vote: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to record vote: {str(e)}")

@app.get("/elections/{election_id}/results")
async def get_election_results(election_id: str, username: str = Depends(get_current_user)):
    """Get results for a specific election"""
    try:
        if election_id not in elections_db:
            raise HTTPException(status_code=404, detail="Election not found")
            
        election_data = elections_db[election_id]
        
        # Count votes for each candidate
        candidate_votes = {}
        total_votes = 0
        
        if election_id in votes_db:
            for voter, candidate_id in votes_db[election_id].items():
                if candidate_id not in candidate_votes:
                    candidate_votes[candidate_id] = 0
                candidate_votes[candidate_id] += 1
                total_votes += 1
        
        # Format results
        results = []
        for candidate in election_data["candidates"]:
            candidate_id = candidate["id"]
            vote_count = candidate_votes.get(candidate_id, 0)
            
            results.append({
                "candidate_id": candidate_id,
                "name": candidate["name"],
                "count": vote_count
            })
        
        return {
            "election_id": election_id,
            "title": election_data["title"],
            "description": election_data["description"],
            "candidates": election_data["candidates"],
            "votes": results,
            "total_votes": total_votes
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Error fetching results for election {election_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch election results: {str(e)}")

@app.get("/user/voted-elections")
async def get_voted_elections(username: str = Depends(get_current_user)):
    """Get list of elections the user has voted in"""
    try:
        voted_elections = []
        
        for election_id, voters in votes_db.items():
            if username in voters and election_id in elections_db:
                election_data = elections_db[election_id]
                
                voted_elections.append({
                    "id": election_id,
                    "title": election_data["title"],
                    "description": election_data["description"],
                    "end_date": election_data["end_date"],
                    "hasVoted": True,
                    "status": election_data["status"]
                })
        
        return voted_elections
    except Exception as e:
        logging.error(f"Error fetching voted elections for {username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch voted elections: {str(e)}")

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Process the received data
            await websocket.send_text(f"Message received: {data}")
    except Exception as e:
        logging.error(f"WebSocket error: {str(e)}")