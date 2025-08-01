"""
Authentication dependencies for FastAPI
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from lib.supabase import supabase, get_current_user, get_user_role, is_admin_or_owner

# Security scheme
security = HTTPBearer()

class AuthUser:
    """Authenticated user with team context"""
    def __init__(self, user_data: Dict[str, Any], team_id: Optional[str] = None, role: Optional[str] = None):
        self.id = user_data.get("id")
        self.email = user_data.get("email")
        self.user_metadata = user_data.get("user_metadata", {})
        self.team_id = team_id
        self.role = role
        self.is_authenticated = True

    @property
    def is_admin(self) -> bool:
        return self.role in ["admin", "owner"]
    
    @property
    def is_owner(self) -> bool:
        return self.role == "owner"
    
    @property
    def can_manage_team(self) -> bool:
        return self.role in ["admin", "owner"]
    
    @property
    def can_manage_resources(self) -> bool:
        return self.role in ["admin", "owner", "member"]

async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthUser:
    """Get current authenticated user from bearer token"""
    token = credentials.credentials
    
    try:
        user = await get_current_user(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return AuthUser(user.__dict__ if hasattr(user, '__dict__') else user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_with_team(
    team_id: str,
    current_user: AuthUser = Depends(get_current_user_dependency)
) -> AuthUser:
    """Get current user with team context and role"""
    role = await get_user_role(current_user.id, team_id)
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this team"
        )
    
    current_user.team_id = team_id
    current_user.role = role
    return current_user

async def require_team_member(
    team_id: str,
    current_user: AuthUser = Depends(get_current_user_dependency)
) -> AuthUser:
    """Require user to be a member of the team"""
    return await get_current_user_with_team(team_id, current_user)

async def require_team_admin(
    team_id: str,
    current_user: AuthUser = Depends(get_current_user_dependency)
) -> AuthUser:
    """Require user to be admin or owner of the team"""
    user = await get_current_user_with_team(team_id, current_user)
    
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return user

async def require_team_owner(
    team_id: str,
    current_user: AuthUser = Depends(get_current_user_dependency)
) -> AuthUser:
    """Require user to be owner of the team"""
    user = await get_current_user_with_team(team_id, current_user)
    
    if not user.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required"
        )
    
    return user

async def require_resource_access(
    team_id: str,
    current_user: AuthUser = Depends(get_current_user_dependency)
) -> AuthUser:
    """Require user to have resource management access (member or higher)"""
    user = await get_current_user_with_team(team_id, current_user)
    
    if not user.can_manage_resources:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage resources"
        )
    
    return user

# Optional authentication - doesn't fail if no token
async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthUser]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    try:
        return await get_current_user_dependency(credentials)
    except:
        return None