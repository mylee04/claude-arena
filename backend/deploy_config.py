"""
Production deployment configuration for Claude Arena API
"""
import os
from typing import Dict, Any

def get_deployment_config() -> Dict[str, Any]:
    """Get deployment-specific configuration"""
    
    # Detect deployment platform
    if os.getenv("VERCEL"):
        return {
            "platform": "vercel",
            "region": os.getenv("VERCEL_REGION", "unknown"),
            "url": os.getenv("VERCEL_URL", ""),
            "env": os.getenv("VERCEL_ENV", "production")
        }
    elif os.getenv("RAILWAY_ENVIRONMENT"):
        return {
            "platform": "railway",
            "region": os.getenv("RAILWAY_REGION", "unknown"),
            "url": os.getenv("RAILWAY_PUBLIC_DOMAIN", ""),
            "env": os.getenv("RAILWAY_ENVIRONMENT", "production")
        }
    elif os.getenv("FLY_APP_NAME"):
        return {
            "platform": "fly.io",
            "region": os.getenv("FLY_REGION", "unknown"),
            "url": f"https://{os.getenv('FLY_APP_NAME')}.fly.dev",
            "env": "production"
        }
    elif os.getenv("RENDER"):
        return {
            "platform": "render",
            "region": os.getenv("RENDER_REGION", "unknown"),
            "url": os.getenv("RENDER_EXTERNAL_URL", ""),
            "env": "production"
        }
    else:
        return {
            "platform": "local",
            "region": "local",
            "url": f"http://localhost:{os.getenv('API_PORT', '8281')}",
            "env": os.getenv("ENVIRONMENT", "development")
        }

def get_cors_origins_for_platform() -> list:
    """Get CORS origins based on deployment platform"""
    config = get_deployment_config()
    
    # Base origins
    origins = []
    
    # Add platform-specific URL if available
    if config["url"]:
        origins.append(config["url"])
        # Also add HTTPS version if HTTP
        if config["url"].startswith("http://"):
            origins.append(config["url"].replace("http://", "https://"))
    
    # Add common production URLs
    if config["env"] == "production":
        origins.extend([
            "https://claude-arena.vercel.app",
            "https://www.claude-arena.vercel.app",
            "https://arena.claude.ai"
        ])
    
    return origins