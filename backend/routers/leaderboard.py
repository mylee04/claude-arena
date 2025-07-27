"""
Leaderboard API endpoints with rich mock data
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from schemas.leaderboard import LeaderboardCategory, LeaderboardEntry, UserStats
from services.mock_data import MOCK_DATA, get_user_personality

router = APIRouter()

# Leaderboard metadata
LEADERBOARD_INFO = {
    "efficiency": {
        "name": "Most Efficient",
        "description": "Lowest tokens per completed task",
        "icon": "🎯"
    },
    "night_owl": {
        "name": "Night Owls",
        "description": "Most active during late hours (10pm-6am)",
        "icon": "🦉"
    },
    "speed_demon": {
        "name": "Speed Demons",
        "description": "Fastest average task completion time",
        "icon": "🚀"
    },
    "interruptor": {
        "name": "The Interruptors",
        "description": "Most interruptions (wear it with pride!)",
        "icon": "🛑"
    },
    "tool_master": {
        "name": "Tool Masters",
        "description": "Most diverse tool usage",
        "icon": "🔧"
    },
    "precisionist": {
        "name": "The Precisionists",
        "description": "Lowest error rate",
        "icon": "🎯"
    },
    "marathon_runner": {
        "name": "Marathon Runners",
        "description": "Longest coding sessions",
        "icon": "💪"
    },
    "early_bird": {
        "name": "Early Birds",
        "description": "Most active during morning hours",
        "icon": "🌅"
    }
}

@router.get("/categories", response_model=List[LeaderboardCategory])
async def get_all_leaderboards(
    time_period: Optional[str] = "week",  # week, month, all-time
    limit: Optional[int] = 10
):
    """Get all leaderboard categories with current rankings"""
    categories = []
    
    for category_id, info in LEADERBOARD_INFO.items():
        # Get entries from mock data
        if category_id in MOCK_DATA["leaderboards"]:
            entries = MOCK_DATA["leaderboards"][category_id][:limit]
            
            # Convert to LeaderboardEntry objects
            leaderboard_entries = [
                LeaderboardEntry(
                    rank=entry["rank"],
                    user_id=entry["user_id"],
                    username=entry["username"],
                    score=entry["score"],
                    display_value=entry["display_value"],
                    avatar_url=entry.get("avatar_url")
                )
                for entry in entries
            ]
            
            categories.append(
                LeaderboardCategory(
                    category_id=category_id,
                    name=info["name"],
                    description=info["description"],
                    icon=info["icon"],
                    entries=leaderboard_entries,
                    total_participants=len(MOCK_DATA["leaderboards"][category_id])
                )
            )
    
    return categories

@router.get("/categories/{category_id}", response_model=LeaderboardCategory)
async def get_leaderboard_category(
    category_id: str,
    time_period: Optional[str] = "week",
    limit: Optional[int] = 20
):
    """Get specific leaderboard category with full rankings"""
    if category_id not in LEADERBOARD_INFO:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if category_id not in MOCK_DATA["leaderboards"]:
        raise HTTPException(status_code=404, detail="No data for this category")
    
    info = LEADERBOARD_INFO[category_id]
    entries = MOCK_DATA["leaderboards"][category_id][:limit]
    
    # Convert to LeaderboardEntry objects
    leaderboard_entries = [
        LeaderboardEntry(
            rank=entry["rank"],
            user_id=entry["user_id"],
            username=entry["username"],
            score=entry["score"],
            display_value=entry["display_value"],
            avatar_url=entry.get("avatar_url")
        )
        for entry in entries
    ]
    
    return LeaderboardCategory(
        category_id=category_id,
        name=info["name"],
        description=info["description"],
        icon=info["icon"],
        entries=leaderboard_entries,
        total_participants=len(MOCK_DATA["leaderboards"][category_id])
    )

@router.get("/user/{user_id}/stats")
async def get_user_stats(user_id: str):
    """Get detailed stats for a specific user"""
    # Find user in mock data
    user_data = None
    for user in MOCK_DATA["users"]:
        if user["user_id"] == user_id:
            user_data = user
            break
    
    if not user_data:
        # Generate random user if not found
        from services.mock_data import generate_user_stats
        user_data = generate_user_stats(user_id, f"user_{user_id}")
    
    # Add personality type
    personality = get_user_personality(user_data)
    
    return {
        **user_data,
        "personality_type": personality,
        "badges": generate_user_badges(user_data),
        "rank_summary": get_user_rank_summary(user_id)
    }

@router.get("/user/{user_id}/position/{category_id}")
async def get_user_position(user_id: str, category_id: str):
    """Get user's position in a specific leaderboard"""
    if category_id not in MOCK_DATA["leaderboards"]:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Find user's position
    leaderboard = MOCK_DATA["leaderboards"][category_id]
    user_entry = None
    
    for entry in leaderboard:
        if entry["user_id"] == user_id:
            user_entry = entry
            break
    
    if not user_entry:
        # User not in top rankings
        return {
            "category_id": category_id,
            "rank": len(leaderboard) + 1,
            "total_participants": len(MOCK_DATA["users"]),
            "percentile": 50.0,
            "score": 0,
            "display_value": "Not ranked"
        }
    
    percentile = ((len(leaderboard) - user_entry["rank"] + 1) / len(leaderboard)) * 100
    
    return {
        "category_id": category_id,
        "rank": user_entry["rank"],
        "total_participants": len(MOCK_DATA["users"]),
        "percentile": round(percentile, 1),
        "score": user_entry["score"],
        "display_value": user_entry["display_value"]
    }

@router.get("/stats/summary")
async def get_platform_summary():
    """Get overall platform statistics"""
    total_tokens = sum(user["total_tokens"] for user in MOCK_DATA["users"])
    total_cost = sum(user["total_cost"] for user in MOCK_DATA["users"])
    
    return {
        "total_users": len(MOCK_DATA["users"]),
        "total_tokens": total_tokens,
        "total_cost": round(total_cost, 2),
        "total_sessions": sum(user["total_sessions"] for user in MOCK_DATA["users"]),
        "average_success_rate": round(
            sum(user["success_rate"] for user in MOCK_DATA["users"]) / len(MOCK_DATA["users"]), 2
        ),
        "most_popular_tool": max(
            MOCK_DATA["users"], 
            key=lambda x: MOCK_DATA["users"].count(x["most_used_tool"])
        )["most_used_tool"],
        "categories": list(LEADERBOARD_INFO.keys()),
        "last_updated": MOCK_DATA["metadata"]["generated_at"]
    }

def generate_user_badges(user_stats: Dict[str, Any]) -> List[Dict[str, str]]:
    """Generate achievement badges based on user stats"""
    badges = []
    
    # Efficiency badges
    if user_stats["average_tokens_per_task"] < 2000:
        badges.append({"id": "ultra_efficient", "name": "Ultra Efficient", "icon": "⚡"})
    elif user_stats["average_tokens_per_task"] < 3000:
        badges.append({"id": "efficient", "name": "Efficient Coder", "icon": "💡"})
    
    # Night owl badge
    if user_stats["night_owl_percentage"] > 0.7:
        badges.append({"id": "night_owl", "name": "Night Owl", "icon": "🦉"})
    elif user_stats["night_owl_percentage"] < 0.3:
        badges.append({"id": "early_bird", "name": "Early Bird", "icon": "🌅"})
    
    # Speed badges
    if user_stats["fastest_task_completion"] < 2:
        badges.append({"id": "lightning_fast", "name": "Lightning Fast", "icon": "⚡"})
    
    # Precision badges
    if user_stats["success_rate"] > 0.95:
        badges.append({"id": "perfectionist", "name": "Perfectionist", "icon": "💎"})
    
    # Tool mastery
    if user_stats["tools_diversity_score"] > 0.8:
        badges.append({"id": "tool_master", "name": "Tool Master", "icon": "🔧"})
    
    # Marathon coder
    if user_stats["longest_session_minutes"] > 300:
        badges.append({"id": "marathon", "name": "Marathon Coder", "icon": "🏃"})
    
    # Interruption badges
    if user_stats["interruption_count"] > 100:
        badges.append({"id": "persistent", "name": "Persistent Explorer", "icon": "🔍"})
    
    return badges

def get_user_rank_summary(user_id: str) -> Dict[str, Any]:
    """Get user's rank across all categories"""
    summary = {}
    
    for category_id, leaderboard in MOCK_DATA["leaderboards"].items():
        for entry in leaderboard:
            if entry["user_id"] == user_id:
                summary[category_id] = {
                    "rank": entry["rank"],
                    "display_value": entry["display_value"]
                }
                break
    
    return summary