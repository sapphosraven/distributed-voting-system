# Distributed Voting Backend (JWT-Protected)

This is a minimal FastAPI-based backend for a voting system using JWT for authentication.

## Features

- Login with dummy credentials
- Get a JWT token
- Submit a vote using the token

## Run Instructions

1. Install dependencies:

```bash
pip install -r requirements.txt

#Start the server:

uvicorn main:app --reload

#test the login and vote

 .\test_login_vote.ps1 
