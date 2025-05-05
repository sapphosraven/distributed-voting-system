from fastapi import APIRouter, Depends, HTTPException
from .models import LoginRequest, TokenResponse, VoteRequest
from .auth import create_access_token, get_current_user
from .users import fake_users_db
import logging

auth_router = APIRouter(tags=["authentication"])

@auth_router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    user = fake_users_db.get(data.username)
    if not user or not user["password"] == data.password:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token(data={"sub": data.username})
    return {"access_token": token, "token_type": "bearer"}

@auth_router.get("/me")
def read_users_me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}