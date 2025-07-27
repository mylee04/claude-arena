"""
Claude Arena - Main FastAPI Application
"""
import logging
import sys
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv

from config import (
    API_PORT, API_HOST, FRONTEND_URLS, IS_PRODUCTION, 
    LOG_LEVEL, SUPABASE_URL, SUPABASE_KEY
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Claude Arena API",
    description="Gamified leaderboard for Claude Code users",
    version="0.1.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Global exception handler
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP exception: {exc.detail}", exc_info=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}", exc_info=True)
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "details": exc.errors(),
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error" if IS_PRODUCTION else str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Health check utilities
async def check_database_health() -> Dict[str, Any]:
    """Check database connectivity"""
    try:
        # TODO: Implement actual Supabase health check
        if SUPABASE_URL and SUPABASE_KEY:
            return {"status": "healthy", "connected": True}
        else:
            return {"status": "not_configured", "connected": False}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "connected": False, "error": str(e)}

@app.get("/")
async def root():
    """Basic health check endpoint"""
    return {
        "status": "online",
        "service": "Claude Arena API",
        "version": "0.1.0",
        "environment": "production" if IS_PRODUCTION else "development"
    }

@app.get("/health")
async def health_check():
    """Detailed health check for monitoring services"""
    db_health = await check_database_health()
    
    overall_status = "healthy"
    if db_health["status"] != "healthy":
        overall_status = "degraded" if db_health["status"] == "not_configured" else "unhealthy"
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "service": {
            "name": "Claude Arena API",
            "version": "0.1.0",
            "environment": "production" if IS_PRODUCTION else "development"
        },
        "checks": {
            "database": db_health,
            "api": {"status": "healthy"}
        }
    }

@app.get("/api/health")
async def api_health_check():
    """API-specific health check"""
    return await health_check()

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting Claude Arena API in {'production' if IS_PRODUCTION else 'development'} mode")
    logger.info(f"CORS enabled for origins: {FRONTEND_URLS}")
    
    # Check database connection on startup
    db_health = await check_database_health()
    if db_health["status"] == "unhealthy":
        logger.warning("Database connection failed on startup")
    else:
        logger.info(f"Database status: {db_health['status']}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Claude Arena API")

# Import routers
try:
    from routers import leaderboard, import_data, simple_leaderboard
    
    # Include routers
    app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
    app.include_router(import_data.router, prefix="/api/import", tags=["import"])
    app.include_router(simple_leaderboard.router, prefix="/api/simple", tags=["simple"])
    
    logger.info("All routers loaded successfully")
except ImportError as e:
    logger.error(f"Failed to import routers: {e}")
    if not IS_PRODUCTION:
        raise

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {API_HOST}:{API_PORT}")
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=not IS_PRODUCTION,
        log_level=LOG_LEVEL.lower()
    )