
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class VoteRequest(BaseModel):
    candidate_id: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
