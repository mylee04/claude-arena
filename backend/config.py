"""
Configuration settings for Claude Arena
"""
import os
from dotenv import load_dotenv

load_dotenv()

# API Settings
API_PORT = 8282
API_HOST = "0.0.0.0"

# Frontend URLs (for CORS)
FRONTEND_URLS = [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://localhost:5174"
]

# Database
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))