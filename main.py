from fastapi import FastAPI, Depends, HTTPException
from models import LoginRequest, VoteRequest, TokenResponse
from users import fake_users_db
from auth import create_access_token, get_current_user
import logging
import os
import json

app = FastAPI()

VALID_CANDIDATES = {"Candidate_A", "Candidate_B", "Candidate_C"}

# Create log directory and logger
if not os.path.exists("logs"):
    os.makedirs("logs")

logging.basicConfig(
    filename="logs/vote_audit.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

@app.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    user = fake_users_db.get(data.username)
    if not user or not user["password"] == data.password:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token(data={"sub": data.username})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/vote")
def cast_vote(vote: VoteRequest, username: str = Depends(get_current_user)):
    logging.info(f"ENTERING cast_vote: User='{username}', Vote='{vote.candidate_id}'")
    print(f"User '{username}' voted for '{vote.candidate_id}'")
    return {"message": f"Vote for {vote.candidate_id} received from {username}"}

@app.get("/")
def root():
    return {"message": "Distributed Voting Backend is running!"}
