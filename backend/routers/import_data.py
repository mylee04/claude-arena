from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

router = APIRouter(prefix="/api/import", tags=["import"])

class Message(BaseModel):
    type: str
    message: Optional[Dict[str, Any]] = None
    timestamp: str
    sessionId: str = Field(..., alias="sessionId")
    uuid: str
    parentUuid: Optional[str] = Field(None, alias="parentUuid")
    toolUseResult: Optional[Dict[str, Any]] = Field(None, alias="toolUseResult")
    
    class Config:
        populate_by_name = True

class ImportRequest(BaseModel):
    messages: List[Message]
    userId: str = Field(..., alias="user_id")
    
    class Config:
        populate_by_name = True

class ImportStats(BaseModel):
    total_messages: int
    user_messages: int
    assistant_messages: int
    unique_sessions: int
    tool_uses: Dict[str, int]
    date_range: Dict[str, str]
    hourly_activity: Dict[int, int]
    
class ImportResponse(BaseModel):
    success: bool
    message: str
    stats: ImportStats

@router.post("/", response_model=ImportResponse)
async def import_data(request: ImportRequest):
    """Import JSONL data from Sniffly export"""
    try:
        messages = request.messages
        
        if not messages:
            raise HTTPException(status_code=400, detail="No messages provided")
        
        # Calculate statistics
        total_messages = len(messages)
        user_messages = sum(1 for m in messages if m.type == "user")
        assistant_messages = sum(1 for m in messages if m.type == "assistant")
        
        # Get unique sessions
        unique_sessions = len(set(m.sessionId for m in messages))
        
        # Extract tool usage
        tool_uses = {}
        for msg in messages:
            if msg.type == "assistant" and msg.message and "content" in msg.message:
                content = msg.message.get("content", [])
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "tool_use":
                        tool_name = item.get("name", "unknown")
                        tool_uses[tool_name] = tool_uses.get(tool_name, 0) + 1
            
            # Also check toolUseResult
            if msg.toolUseResult:
                # Count this as a tool use completion
                pass
        
        # Calculate date range
        timestamps = [datetime.fromisoformat(m.timestamp.replace('Z', '+00:00')) for m in messages]
        date_range = {
            "start": min(timestamps).isoformat() if timestamps else "",
            "end": max(timestamps).isoformat() if timestamps else ""
        }
        
        # Calculate hourly activity
        hourly_activity = {}
        for ts in timestamps:
            hour = ts.hour
            hourly_activity[hour] = hourly_activity.get(hour, 0) + 1
        
        # Create response stats
        stats = ImportStats(
            total_messages=total_messages,
            user_messages=user_messages,
            assistant_messages=assistant_messages,
            unique_sessions=unique_sessions,
            tool_uses=tool_uses,
            date_range=date_range,
            hourly_activity=hourly_activity
        )
        
        # TODO: Store data in Supabase
        # For now, just return the statistics
        
        return ImportResponse(
            success=True,
            message=f"Successfully imported {total_messages} messages from {unique_sessions} sessions",
            stats=stats
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def import_status():
    """Check import endpoint status"""
    return {"status": "ready", "version": "1.0.0"}