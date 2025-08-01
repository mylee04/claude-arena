"""
Supabase client configuration for authentication and database access
"""
import os
from supabase import create_client, Client
from typing import Optional

# Get environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Warning: Supabase environment variables are not set. Please check your .env file.")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

class AuthError(Exception):
    """Custom exception for authentication errors"""
    pass

async def get_current_user(access_token: str):
    """Get current user from access token"""
    try:
        user = supabase.auth.get_user(access_token)
        if user and user.user:
            return user.user
        return None
    except Exception as e:
        raise AuthError(f"Failed to get user: {str(e)}")

async def verify_user_team_access(user_id: str, team_id: str) -> bool:
    """Verify if user has access to a team"""
    try:
        result = supabase.table("team_members").select("role").eq("user_id", user_id).eq("team_id", team_id).eq("status", "active").single().execute()
        return result.data is not None
    except:
        return False

async def get_user_role(user_id: str, team_id: str) -> Optional[str]:
    """Get user's role in a team"""
    try:
        result = supabase.table("team_members").select("role").eq("user_id", user_id).eq("team_id", team_id).eq("status", "active").single().execute()
        if result.data:
            return result.data.get("role")
        return None
    except:
        return None

async def get_user_default_team(user_id: str) -> Optional[str]:
    """Get user's default team (first team they're a member of)"""
    try:
        result = supabase.table("team_members").select("team_id").eq("user_id", user_id).eq("status", "active").order("joined_at").limit(1).execute()
        if result.data and len(result.data) > 0:
            return result.data[0].get("team_id")
        return None
    except:
        return None

def is_admin_or_owner(role: Optional[str]) -> bool:
    """Check if role is admin or owner"""
    return role in ["admin", "owner"]

def can_manage_resources(role: Optional[str]) -> bool:
    """Check if role can manage resources"""
    return role in ["admin", "owner", "member"]