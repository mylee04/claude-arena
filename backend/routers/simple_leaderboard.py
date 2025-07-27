"""
Simple leaderboard endpoints for the frontend
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any
import json
from datetime import datetime

router = APIRouter()

# In-memory storage for leaderboard data
leaderboard_data: List[Dict[str, Any]] = []

@router.get("")
async def get_leaderboard() -> List[Dict[str, Any]]:
    """Get the current leaderboard data"""
    return leaderboard_data

@router.post("")
async def import_leaderboard_data(file: UploadFile = File(...)):
    """Import leaderboard data from JSON file"""
    global leaderboard_data
    
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be JSON")
    
    try:
        contents = await file.read()
        data = json.loads(contents)
        
        # Validate data structure
        if not isinstance(data, list):
            raise HTTPException(status_code=400, detail="Data must be a list of entries")
        
        # Clear existing data and load new data
        leaderboard_data = data
        
        # Sort by total score
        leaderboard_data.sort(key=lambda x: x.get('total_score', 0), reverse=True)
        
        # Update ranks
        for i, entry in enumerate(leaderboard_data):
            entry['rank'] = i + 1
        
        return {
            "username": file.filename.split('.')[0],
            "entries_added": len(data),
            "total_entries": len(leaderboard_data),
            "message": f"Successfully imported {len(data)} entries"
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

@router.delete("")
async def clear_leaderboard():
    """Clear all leaderboard data"""
    global leaderboard_data
    leaderboard_data = []
    return {"message": "Leaderboard cleared"}