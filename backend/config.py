"""
Configuration settings for Claude Arena
"""
import os
from dotenv import load_dotenv
from typing import List

load_dotenv()

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

# API Settings
API_PORT = int(os.getenv("API_PORT", "8281"))
API_HOST = os.getenv("API_HOST", "0.0.0.0")

# Import deployment config if available
try:
    from deploy_config import get_cors_origins_for_platform
except ImportError:
    get_cors_origins_for_platform = None

# Frontend URLs (for CORS)
def get_allowed_origins() -> List[str]:
    """Get allowed origins from environment or defaults"""
    origins = []
    
    # First, check environment variable
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
    
    if allowed_origins:
        # Parse comma-separated list from environment
        origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
    else:
        # Default origins for development
        origins = [
            "http://localhost:8282",
            "http://localhost:3000",
            "http://127.0.0.1:8282",
            "http://127.0.0.1:3000"
        ]
    
    # Add platform-specific origins if available
    if get_cors_origins_for_platform:
        platform_origins = get_cors_origins_for_platform()
        for origin in platform_origins:
            if origin and origin not in origins:
                origins.append(origin)
    
    # Always include production URLs if they exist
    production_urls = [
        "https://claude-arena.vercel.app",
        "https://arena.claude.ai"
    ]
    
    for url in production_urls:
        if url not in origins:
            origins.append(url)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_origins = []
    for origin in origins:
        if origin not in seen:
            seen.add(origin)
            unique_origins.append(origin)
    
    return unique_origins

FRONTEND_URLS = get_allowed_origins()

# Database
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if IS_PRODUCTION else "DEBUG")