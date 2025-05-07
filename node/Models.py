# Create this file if it doesn't exist

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CandidateBase(BaseModel):
    name: str
    photo: Optional[str] = None
    party: Optional[str] = None
    description: Optional[str] = None
    id: Optional[str] = None

class ElectionCreate(BaseModel):
    title: str
    description: str
    start_date: datetime
    end_date: datetime
    eligible_voters: List[str]
    candidates: List[CandidateBase]
    status: str = "active"
    created_by: str

class ElectionResponse(BaseModel):
    id: str
    title: str
    description: str
    start_date: str  # ISO format string
    end_date: str    # ISO format string
    eligible_voters: List[str]
    candidates: List[dict]
    status: str
    created_by: str