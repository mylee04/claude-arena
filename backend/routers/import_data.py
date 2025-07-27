"""
Data import endpoints for various sources
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict
import json

from schemas.leaderboard import ImportRequest, UserStats

router = APIRouter()

def parse_sniffly_data(data: Dict) -> UserStats:
    """Parse Sniffly export data into our UserStats format"""
    stats = data.get("statistics", {})
    overview = stats.get("overview", {})
    user_interactions = stats.get("user_interactions", {})
    tools = stats.get("tools", {})
    
    # Calculate metrics from Sniffly data
    total_tokens = overview.get("total_tokens", {})
    
    return UserStats(
        user_id="imported_user",  # Will be set by auth
        total_tokens=total_tokens.get("total", 0),
        total_cost=overview.get("total_cost", 0),
        total_sessions=overview.get("total_sessions", 0),
        total_commands=user_interactions.get("total_commands", 0),
        average_tokens_per_task=user_interactions.get("average_tokens_per_command", 0),
        success_rate=1 - (overview.get("error_rate", 0) / 100),
        average_step_length=user_interactions.get("average_step_length", 0),
        interruption_count=user_interactions.get("interruptions", 0),
        tools_diversity_score=len(tools.get("usage_counts", {})) / 20.0  # Assuming 20 total tools
    )

@router.post("/sniffly")
async def import_sniffly_data(request: ImportRequest):
    """Import data from Sniffly JSON export"""
    try:
        user_stats = parse_sniffly_data(request.data)
        
        # TODO: Save to database
        # TODO: Calculate rankings
        
        return {
            "status": "success",
            "message": "Data imported successfully",
            "stats_summary": {
                "total_tokens": user_stats.total_tokens,
                "total_sessions": user_stats.total_sessions,
                "efficiency_score": user_stats.average_tokens_per_task
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse data: {str(e)}")

@router.post("/sniffly/file")
async def import_sniffly_file(file: UploadFile = File(...)):
    """Import Sniffly data from uploaded JSON file"""
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be JSON")
    
    try:
        contents = await file.read()
        data = json.loads(contents)
        
        request = ImportRequest(source_type="sniffly", data=data)
        return await import_sniffly_data(request)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

@router.post("/csv")
async def import_csv_data(file: UploadFile = File(...)):
    """Import data from CSV file (for other tools)"""
    # TODO: Implement CSV parsing
    return {"status": "not_implemented", "message": "CSV import coming soon"}

@router.get("/formats")
async def get_supported_formats():
    """Get list of supported import formats"""
    return {
        "formats": [
            {
                "id": "sniffly",
                "name": "Sniffly JSON Export",
                "description": "Export from Sniffly analytics tool",
                "file_extension": ".json",
                "instructions": "Run 'sniffly export --format json > export.json'"
            },
            {
                "id": "csv",
                "name": "Generic CSV",
                "description": "CSV with standard columns",
                "file_extension": ".csv",
                "status": "coming_soon"
            }
        ]
    }