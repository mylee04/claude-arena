"""
Agent-related routes using existing schema
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..auth.dependencies import get_current_user_dependency, AuthUser, require_team_member
from ..lib.supabase import supabase, get_user_default_team

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])

class XPEventRequest(BaseModel):
    agent_name: str
    event_type: str  # "task_completed", "achievement_unlocked", etc.
    base_points: int
    bonus_points: Optional[int] = 0
    metadata: Optional[Dict[str, Any]] = {}
    session_id: Optional[str] = None
    team_id: Optional[str] = None  # Optional team context

class AgentStatsResponse(BaseModel):
    agent_name: str
    total_xp: int
    current_level: str
    total_usage: int
    success_rate: float
    avg_completion_time: Optional[str]
    streak_days: int
    last_used: Optional[datetime]
    achievements_count: int

class UserAgentResponse(BaseModel):
    id: str
    agent_name: str
    agent_display_name: Optional[str]
    agent_description: Optional[str]
    is_favorite: bool
    total_usage: int
    total_xp: int
    current_level: str
    unlock_date: datetime
    last_used: Optional[datetime]

@router.post("/track-xp")
async def track_xp_event(
    event: XPEventRequest,
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Track XP event for an agent"""
    # Get team context - use provided team_id or user's default team
    team_id = event.team_id
    if not team_id:
        team_id = await get_user_default_team(current_user.id)
    
    # Verify team access if team_id provided
    if team_id and event.team_id:  # Only verify if explicitly provided
        user = await require_team_member(team_id, current_user)
    
    # Get or create user_agent record
    user_agent_result = supabase.table("user_agents").select("*").eq("user_id", current_user.id).eq("agent_name", event.agent_name).execute()
    
    if not user_agent_result.data:
        # Create new user_agent
        new_agent = {
            "user_id": current_user.id,
            "agent_name": event.agent_name,
            "team_id": team_id,
            "total_usage": 1,
            "total_xp": event.base_points + event.bonus_points,
            "last_used": datetime.utcnow().isoformat()
        }
        user_agent_result = supabase.table("user_agents").insert(new_agent).execute()
        user_agent_id = user_agent_result.data[0]["id"]
    else:
        user_agent = user_agent_result.data[0]
        user_agent_id = user_agent["id"]
        
        # Update user_agent stats
        updated_stats = {
            "total_usage": user_agent["total_usage"] + 1,
            "total_xp": user_agent["total_xp"] + event.base_points + event.bonus_points,
            "last_used": datetime.utcnow().isoformat()
        }
        
        # Update level based on XP thresholds
        total_xp = updated_stats["total_xp"]
        if total_xp >= 10000:
            updated_stats["current_level"] = "legendary"
        elif total_xp >= 5000:
            updated_stats["current_level"] = "master"
        elif total_xp >= 2000:
            updated_stats["current_level"] = "expert"
        elif total_xp >= 500:
            updated_stats["current_level"] = "veteran"
        elif total_xp >= 100:
            updated_stats["current_level"] = "skilled"
        
        supabase.table("user_agents").update(updated_stats).eq("id", user_agent_id).execute()
    
    # Create XP event record
    xp_event = {
        "user_id": current_user.id,
        "agent_name": event.agent_name,
        "event_type": event.event_type,
        "base_points": event.base_points,
        "bonus_points": event.bonus_points,
        "total_points": event.base_points + event.bonus_points,
        "metadata": event.metadata,
        "session_id": event.session_id,
        "team_id": team_id
    }
    
    result = supabase.table("xp_events").insert(xp_event).execute()
    
    # Update user's total XP
    user_result = supabase.table("users").select("total_xp").eq("id", current_user.id).single().execute()
    if user_result.data:
        new_total_xp = user_result.data["total_xp"] + event.base_points + event.bonus_points
        supabase.table("users").update({"total_xp": new_total_xp}).eq("id", current_user.id).execute()
    
    return {
        "success": True,
        "xp_earned": event.base_points + event.bonus_points,
        "total_agent_xp": updated_stats["total_xp"] if 'updated_stats' in locals() else event.base_points + event.bonus_points,
        "event_id": result.data[0]["id"]
    }

@router.get("/{agent_name}/stats", response_model=AgentStatsResponse)
async def get_agent_stats(
    agent_name: str,
    team_id: Optional[str] = Query(None),
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Get stats for a specific agent"""
    # Build query
    query = supabase.table("user_agents").select("*").eq("user_id", current_user.id).eq("agent_name", agent_name)
    
    if team_id:
        query = query.eq("team_id", team_id)
    
    result = query.single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    agent = result.data
    
    # Get agent stats if exists
    stats_result = supabase.table("agent_stats").select("*").eq("user_agent_id", agent["id"]).single().execute()
    stats = stats_result.data if stats_result.data else {}
    
    # Get achievements count
    achievements_result = supabase.table("agent_achievements").select("id").eq("user_agent_id", agent["id"]).execute()
    achievements_count = len(achievements_result.data) if achievements_result.data else 0
    
    return AgentStatsResponse(
        agent_name=agent["agent_name"],
        total_xp=agent["total_xp"],
        current_level=agent["current_level"],
        total_usage=agent["total_usage"],
        success_rate=stats.get("success_rate", 0.0),
        avg_completion_time=stats.get("avg_completion_time"),
        streak_days=stats.get("streak_days", 0),
        last_used=agent["last_used"],
        achievements_count=achievements_count
    )

@router.get("/my-agents", response_model=List[UserAgentResponse])
async def get_my_agents(
    team_id: Optional[str] = Query(None),
    favorites_only: bool = Query(False),
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Get all agents for the current user"""
    query = supabase.table("user_agents").select("*").eq("user_id", current_user.id)
    
    if team_id:
        query = query.eq("team_id", team_id)
    
    if favorites_only:
        query = query.eq("is_favorite", True)
    
    query = query.order("last_used", desc=True)
    
    result = query.execute()
    
    return [UserAgentResponse(**agent) for agent in result.data]

@router.put("/{agent_name}/favorite")
async def toggle_favorite(
    agent_name: str,
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Toggle favorite status for an agent"""
    # Get current status
    result = supabase.table("user_agents").select("id, is_favorite").eq("user_id", current_user.id).eq("agent_name", agent_name).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Toggle favorite
    new_status = not result.data["is_favorite"]
    update_result = supabase.table("user_agents").update({"is_favorite": new_status}).eq("id", result.data["id"]).execute()
    
    return {
        "success": True,
        "is_favorite": new_status
    }

@router.get("/leaderboard")
async def get_agent_leaderboard(
    period: str = Query("all", regex="^(today|week|month|all)$"),
    category: str = Query("total_xp", regex="^(total_xp|usage|achievements)$"),
    team_id: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Get agent leaderboard"""
    # For team leaderboard, verify access
    if team_id:
        await require_team_member(team_id, current_user)
    
    # Query leaderboard entries
    query = supabase.table("leaderboard_entries").select(
        "*, users(username, avatar_url)"
    ).eq("category", category).eq("period", period)
    
    if team_id:
        # Filter by team members
        team_members = supabase.table("team_members").select("user_id").eq("team_id", team_id).execute()
        user_ids = [m["user_id"] for m in team_members.data]
        query = query.in_("user_id", user_ids)
    
    query = query.order("rank", ascending=True).limit(limit)
    
    result = query.execute()
    
    return {
        "period": period,
        "category": category,
        "entries": result.data
    }