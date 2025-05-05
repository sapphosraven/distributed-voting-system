from fastapi import FastAPI, Depends
import logging
import os
import uvicorn

# Create log directory
if not os.path.exists("logs"):
    os.makedirs("logs")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename="logs/main.log"
)
logger = logging.getLogger("main")

# Create main FastAPI app
app = FastAPI(title="Distributed Voting System")

# Mount node app (this will be connected after nodes are initialized)
@app.get("/")
def read_root():
    return {"message": "Distributed Voting System API"}

@app.on_event("startup")
async def startup_event():
    logger.info("Starting main application")
    # We'll import and mount node_app here after nodes are initialized
    # This will be handled in docker-compose by starting nodes first

# Add more routes or include more routers as needed

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)