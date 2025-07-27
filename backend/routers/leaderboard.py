"""
Leaderboard API endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta

from schemas.leaderboard import LeaderboardCategory, LeaderboardEntry, UserStats

router = APIRouter()

# Mock data for MVP
MOCK_LEADERBOARDS = {
    "efficiency": LeaderboardCategory(
        category_id="efficiency",
        name="Most Efficient",
        description="Lowest tokens per completed task",
        icon="🎯",
        entries=[
            LeaderboardEntry(rank=1, user_id="user1", username="alice_dev", score=2500, display_value="2.5K tokens/task"),
            LeaderboardEntry(rank=2, user_id="user2", username="bob_codes", score=3200, display_value="3.2K tokens/task"),
        ]
    ),
    "night_owl": LeaderboardCategory(
        category_id="night_owl",
        name="Night Owls",
        description="Most active during late hours (10pm-6am)",
        icon="🦉",
        entries=[
            LeaderboardEntry(rank=1, user_id="user3", username="nightcoder", score=0.78, display_value="78% night activity"),
            LeaderboardEntry(rank=2, user_id="user4", username="insomniac_dev", score=0.65, display_value="65% night activity"),
        ]
    ),
    "speed_demon": LeaderboardCategory(
        category_id="speed_demon",
        name="Speed Demons",
        description="Fastest average task completion time",
        icon="🚀",
        entries=[
            LeaderboardEntry(rank=1, user_id="user5", username="flash_coder", score=3.2, display_value="3.2 min avg"),
            LeaderboardEntry(rank=2, user_id="user6", username="quick_dev", score=4.5, display_value="4.5 min avg"),
        ]
    ),
    "interruptor": LeaderboardCategory(
        category_id="interruptor",
        name="The Interruptors",
        description="Most interruptions (wear it with pride!)",
        icon="🛑",
        entries=[
            LeaderboardEntry(rank=1, user_id="user7", username="ctrl_c_master", score=147, display_value="147 interruptions"),
            LeaderboardEntry(rank=2, user_id="user8", username="break_king", score=98, display_value="98 interruptions"),
        ]
    ),
    "tool_master": LeaderboardCategory(
        category_id="tool_master",
        name="Tool Masters",
        description="Most diverse tool usage",
        icon="🔧",
        entries=[
            LeaderboardEntry(rank=1, user_id="user9", username="swiss_army", score=18, display_value="18/20 tools used"),
            LeaderboardEntry(rank=2, user_id="user10", username="toolbox", score=15, display_value="15/20 tools used"),
        ]
    )
}

@router.get("/categories", response_model=List[LeaderboardCategory])
async def get_all_leaderboards(
    time_period: Optional[str] = "week"  # week, month, all-time
):
    """Get all leaderboard categories with current rankings"""
    return list(MOCK_LEADERBOARDS.values())

@router.get("/categories/{category_id}", response_model=LeaderboardCategory)
async def get_leaderboard_category(
    category_id: str,
    time_period: Optional[str] = "week",
    limit: Optional[int] = 20
):
    """Get specific leaderboard category"""
    if category_id not in MOCK_LEADERBOARDS:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category = MOCK_LEADERBOARDS[category_id]
    # In real implementation, filter by time_period and limit
    return category

@router.get("/user/{user_id}/stats", response_model=UserStats)
async def get_user_stats(user_id: str):
    """Get detailed stats for a specific user"""
    # Mock data for now
    return UserStats(
        user_id=user_id,
        username="demo_user",
        total_tokens=156000,
        total_cost=23.40,
        total_sessions=45,
        total_commands=892,
        average_tokens_per_task=3200,
        success_rate=0.87,
        average_step_length=4.2,
        most_active_hour=23,
        night_owl_percentage=0.65,
        most_used_tool="Edit",
        tools_diversity_score=0.75,
        interruption_count=34,
        longest_session_minutes=187,
        fastest_task_completion=2.1
    )

@router.get("/user/{user_id}/position/{category_id}")
async def get_user_position(user_id: str, category_id: str):
    """Get user's position in a specific leaderboard"""
    # Mock response
    return {
        "category_id": category_id,
        "rank": 42,
        "total_participants": 1847,
        "percentile": 97.7,
        "score": 2800,
        "display_value": "2.8K tokens/task"
    }