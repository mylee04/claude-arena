"""
Claude Arena - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from config import API_PORT, API_HOST, FRONTEND_URLS

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Claude Arena API",
    description="Gamified leaderboard for Claude Code users",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Claude Arena API",
        "version": "0.1.0"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual DB check
        "timestamp": "2025-07-26T22:00:00Z"
    }

# Import routers
from routers import leaderboard, import_data

# Include routers
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(import_data.router, prefix="/api/import", tags=["import"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT, reload=True)