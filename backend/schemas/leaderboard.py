"""
Pydantic schemas for leaderboard data
"""
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class UserStats(BaseModel):
    """User statistics for leaderboard"""
    user_id: str
    username: Optional[str] = "Anonymous"
    
    # Core metrics
    total_tokens: int = 0
    total_cost: float = 0.0
    total_sessions: int = 0
    total_commands: int = 0
    
    # Efficiency metrics
    average_tokens_per_task: float = 0.0
    success_rate: float = 0.0
    average_step_length: float = 0.0
    
    # Time-based metrics
    most_active_hour: Optional[int] = None
    night_owl_percentage: float = 0.0  # % of activity between 10pm-6am
    
    # Tool usage
    most_used_tool: Optional[str] = None
    tools_diversity_score: float = 0.0  # How many different tools used
    
    # Fun metrics
    interruption_count: int = 0
    longest_session_minutes: int = 0
    fastest_task_completion: Optional[float] = None

class LeaderboardEntry(BaseModel):
    """Entry in a specific leaderboard category"""
    rank: int
    user_id: str
    username: str
    score: float
    display_value: str  # Formatted value to show
    badge: Optional[str] = None  # Emoji badge if earned

class LeaderboardCategory(BaseModel):
    """A specific leaderboard category"""
    category_id: str
    name: str
    description: str
    icon: str  # Emoji icon
    entries: List[LeaderboardEntry]
    
class ImportRequest(BaseModel):
    """Request to import data from Sniffly or other sources"""
    source_type: str = "sniffly"  # sniffly, csv, manual
    data: Dict
    user_id: Optional[str] = None
    
class Badge(BaseModel):
    """Achievement badge"""
    badge_id: str
    name: str
    description: str
    icon: str
    criteria: str
    earned_at: Optional[datetime] = None