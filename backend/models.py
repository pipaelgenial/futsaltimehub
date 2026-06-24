"""Pydantic models for Futsal Time Hub."""
from datetime import datetime
from typing import List, Optional, Literal, Any, Dict
from pydantic import BaseModel, Field, EmailStr
import uuid


def _now() -> datetime:
    return datetime.utcnow()


def _uid() -> str:
    return str(uuid.uuid4())


# ============ USER ============

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    status: Literal["pending", "approved", "rejected"]
    is_admin: bool
    created_at: datetime


class UserUpdate(BaseModel):
    status: Optional[Literal["pending", "approved", "rejected"]] = None
    is_admin: Optional[bool] = None
    name: Optional[str] = None


class PasswordReset(BaseModel):
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ============ TEAM ============

class TeamCreate(BaseModel):
    name: str
    coach: Optional[str] = ""
    color: Optional[str] = "#d4ff1a"


class TeamOut(BaseModel):
    id: str
    owner_id: str
    name: str
    coach: str
    color: str
    created_at: datetime


# ============ ATHLETE ============

class AthleteCreate(BaseModel):
    number: int = Field(ge=1, le=99)
    name: str
    position: str  # 'GR' | 'FIXO' | 'ALA' | 'PIVOT'


class AthleteOut(BaseModel):
    id: str
    owner_id: str
    number: int
    name: str
    position: str
    created_at: datetime


# ============ MATCH ============

class MatchSave(BaseModel):
    """Full payload for saving a finished match."""
    opponent: str
    competition: Optional[str] = ""
    matchday: Optional[str] = ""
    venue: Optional[str] = ""
    date: str  # ISO date string
    team_name: str
    home_score: int = 0
    away_score: int = 0
    fouls_committed: int = 0
    fouls_suffered: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    total_duration: int = 0
    half_reached: int = 1
    players: List[Dict[str, Any]] = []
    subs: List[Dict[str, Any]] = []
    goals: List[Dict[str, Any]] = []
    fouls: List[Dict[str, Any]] = []
    cards: List[Dict[str, Any]] = []


class MatchOut(BaseModel):
    id: str
    owner_id: str
    opponent: str
    competition: str
    matchday: str
    venue: str
    date: str
    team_name: str
    home_score: int
    away_score: int
    fouls_committed: int
    fouls_suffered: int
    yellow_cards: int
    red_cards: int
    total_duration: int
    half_reached: int
    players: List[Dict[str, Any]]
    subs: List[Dict[str, Any]]
    goals: List[Dict[str, Any]]
    fouls: List[Dict[str, Any]]
    cards: List[Dict[str, Any]]
    created_at: datetime
