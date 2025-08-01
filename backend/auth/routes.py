"""
Authentication routes for user management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .dependencies import get_current_user_dependency, AuthUser, require_team_admin
from lib.supabase import supabase

router = APIRouter(prefix="/auth", tags=["authentication"])

class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    org_type: Optional[str]
    created_at: datetime

class Team(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    role: Optional[str]  # User's role in this team
    created_at: datetime

class TeamMember(BaseModel):
    id: str
    user_id: str
    email: str
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    status: str
    joined_at: datetime

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str]
    username: Optional[str]
    avatar_url: Optional[str]

class CreateTeamRequest(BaseModel):
    name: str
    description: Optional[str]

class InviteTeamMemberRequest(BaseModel):
    email: EmailStr
    role: str = "member"

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Get current user's profile"""
    result = supabase.table("users").select("*").eq("id", current_user.id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return UserProfile(**result.data)

@router.patch("/me", response_model=UserProfile)
async def update_current_user_profile(
    updates: UpdateProfileRequest,
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Update current user's profile"""
    update_data = updates.dict(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No updates provided"
        )
    
    # Check username uniqueness if updating
    if "username" in update_data:
        existing = supabase.table("users").select("id").eq("username", update_data["username"]).execute()
        if existing.data and existing.data[0]["id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    result = supabase.table("users").update(update_data).eq("id", current_user.id).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
    
    return UserProfile(**result.data[0])

@router.get("/teams", response_model=List[Team])
async def get_user_teams(
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Get all teams the user belongs to"""
    result = supabase.table("team_members").select(
        "role, teams(id, name, slug, description, created_at)"
    ).eq("user_id", current_user.id).eq("status", "active").execute()
    
    teams = []
    for member in result.data:
        team_data = member["teams"]
        team_data["role"] = member["role"]
        teams.append(Team(**team_data))
    
    return teams

@router.post("/teams", response_model=Team)
async def create_team(
    team_data: CreateTeamRequest,
    current_user: AuthUser = Depends(get_current_user_dependency)
):
    """Create a new team"""
    # Generate unique slug
    base_slug = team_data.name.lower().replace(" ", "-")
    slug = base_slug
    counter = 1
    
    while True:
        existing = supabase.table("teams").select("id").eq("slug", slug).execute()
        if not existing.data:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Create team
    team_result = supabase.table("teams").insert({
        "name": team_data.name,
        "slug": slug,
        "description": team_data.description,
        "created_by": current_user.id
    }).execute()
    
    if not team_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create team"
        )
    
    team = team_result.data[0]
    
    # Add creator as owner
    member_result = supabase.table("team_members").insert({
        "team_id": team["id"],
        "user_id": current_user.id,
        "role": "owner",
        "status": "active"
    }).execute()
    
    if not member_result.data:
        # Rollback team creation
        supabase.table("teams").delete().eq("id", team["id"]).execute()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add team owner"
        )
    
    team["role"] = "owner"
    return Team(**team)

@router.get("/teams/{team_id}/members", response_model=List[TeamMember])
async def get_team_members(
    team_id: str,
    current_user: AuthUser = Depends(require_team_admin)
):
    """Get all members of a team (admin only)"""
    result = supabase.table("team_members").select(
        "id, user_id, role, status, created_at, users(email, username, full_name, avatar_url)"
    ).eq("team_id", team_id).execute()
    
    members = []
    for member in result.data:
        user_data = member["users"]
        members.append(TeamMember(
            id=member["id"],
            user_id=member["user_id"],
            email=user_data["email"],
            username=user_data["username"],
            full_name=user_data["full_name"],
            avatar_url=user_data["avatar_url"],
            role=member["role"],
            status=member["status"],
            joined_at=member["created_at"]
        ))
    
    return members

@router.post("/teams/{team_id}/members")
async def invite_team_member(
    team_id: str,
    invite: InviteTeamMemberRequest,
    current_user: AuthUser = Depends(require_team_admin)
):
    """Invite a new member to the team (admin only)"""
    # Check if user exists
    user_result = supabase.table("users").select("id").eq("email", invite.email).execute()
    
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. They need to sign up first."
        )
    
    user_id = user_result.data[0]["id"]
    
    # Check if already a member
    existing = supabase.table("team_members").select("id").eq("team_id", team_id).eq("user_id", user_id).execute()
    
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team"
        )
    
    # Add member
    result = supabase.table("team_members").insert({
        "team_id": team_id,
        "user_id": user_id,
        "role": invite.role,
        "status": "invited"
    }).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invite member"
        )
    
    return {"message": "Member invited successfully"}

@router.delete("/teams/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: AuthUser = Depends(require_team_admin)
):
    """Remove a member from the team (admin only, cannot remove owners)"""
    # Check member exists and role
    member = supabase.table("team_members").select("role").eq("team_id", team_id).eq("user_id", user_id).single().execute()
    
    if not member.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    if member.data["role"] == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove team owner"
        )
    
    # Remove member
    result = supabase.table("team_members").delete().eq("team_id", team_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove member"
        )
    
    return {"message": "Member removed successfully"}