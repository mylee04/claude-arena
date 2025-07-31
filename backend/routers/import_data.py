from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

router = APIRouter(prefix="/api/import", tags=["import"])


# Claude Logs Import Models
class ClaudeLogsImportRequest(BaseModel):
    user_stats: Dict[str, Any]
    tool_usage: Dict[str, int]
    daily_activity: Dict[str, Dict[str, int]]
    achievements: List[str]
    leaderboard_stats: Dict[str, float]
    conversations_included: bool = False
    conversation_samples: Optional[List[Dict[str, Any]]] = []
    total_conversations: Optional[int] = 0
    user_id: Optional[str] = None
    
class ClaudeLogsImportResponse(BaseModel):
    success: bool
    message: str
    user_id: str
    stats_summary: Dict[str, Any]
    leaderboard_rankings: Dict[str, int]
    

@router.post("/claude-logs", response_model=ClaudeLogsImportResponse)
async def import_claude_logs(request: ClaudeLogsImportRequest):
    """Import parsed Claude Code logs data"""
    try:
        # Extract key metrics
        user_stats = request.user_stats
        total_sessions = user_stats.get("total_sessions", 0)
        total_tokens = user_stats.get("total_tokens_used", 0)
        total_hours = user_stats.get("total_hours", 0)
        
        if total_sessions == 0:
            raise HTTPException(status_code=400, detail="No sessions found in import data")
        
        # Calculate leaderboard rankings (mock for now)
        leaderboard_rankings = {
            "precisionist": calculate_ranking(request.leaderboard_stats.get("precisionist_score", 0)),
            "speed_demon": calculate_ranking(request.leaderboard_stats.get("speed_demon_score", 0)),
            "night_owl": calculate_ranking(request.leaderboard_stats.get("night_owl_score", 0)),
            "tool_master": calculate_ranking(request.leaderboard_stats.get("tool_master_score", 0)),
            "marathon_runner": calculate_ranking(request.leaderboard_stats.get("marathon_score", 0))
        }
        
        # Create summary
        stats_summary = {
            "sessions": total_sessions,
            "tokens": total_tokens,
            "hours": total_hours,
            "projects": user_stats.get("projects_count", 0),
            "error_rate": user_stats.get("error_rate", 0),
            "achievements_count": len(request.achievements),
            "conversations_included": request.conversations_included,
            "total_conversations": request.total_conversations if request.conversations_included else 0,
            "top_tools": sorted(
                request.tool_usage.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]
        }
        
        # TODO: Store in Supabase
        # When storing, include:
        # - Basic stats in users table
        # - Achievements in user_achievements table
        # - Conversations in user_conversations table (if included)
        #   with privacy_level field (public/private/friends)
        # For now, generate a mock user_id
        user_id = request.user_id or f"user_{total_sessions}_{int(total_hours)}"
        
        return ClaudeLogsImportResponse(
            success=True,
            message=f"Successfully imported {total_sessions} sessions with {total_hours:.1f} hours of usage",
            user_id=user_id,
            stats_summary=stats_summary,
            leaderboard_rankings=leaderboard_rankings
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def import_status():
    """Check import endpoint status"""
    return {"status": "ready", "version": "2.0.0", "supports": ["claude-logs"]}


def calculate_ranking(score: float) -> int:
    """Calculate mock ranking based on score"""
    # In production, this would query the database
    # For now, return a mock ranking
    if score >= 90:
        return 1
    elif score >= 80:
        return 5
    elif score >= 70:
        return 10
    elif score >= 60:
        return 25
    elif score >= 50:
        return 50
    else:
        return 100