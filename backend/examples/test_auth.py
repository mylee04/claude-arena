"""
Test authentication endpoints
This script demonstrates how to use the authentication system
"""

import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file")
    exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

async def test_auth_flow():
    """Test the authentication flow"""
    
    print("=== Supabase Authentication Test ===\n")
    
    # Note: For testing, you would normally:
    # 1. Use the Supabase dashboard to create a test user
    # 2. Or implement email/password auth for testing
    # 3. Or use the OAuth flow through a browser
    
    # Example: Sign in with email/password (if enabled)
    email = input("Enter test email (or press Enter to skip): ")
    if email:
        password = input("Enter password: ")
        
        try:
            # Sign in
            auth_response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if auth_response.user:
                print(f"\n✅ Successfully signed in as: {auth_response.user.email}")
                print(f"User ID: {auth_response.user.id}")
                print(f"Access Token: {auth_response.session.access_token[:20]}...")
                
                # Test API endpoints
                import httpx
                
                headers = {
                    "Authorization": f"Bearer {auth_response.session.access_token}"
                }
                
                async with httpx.AsyncClient() as client:
                    # Test /me endpoint
                    response = await client.get(
                        "http://localhost:8000/api/v1/auth/me",
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        user_data = response.json()
                        print(f"\n✅ User Profile:")
                        print(f"  - Username: {user_data.get('username')}")
                        print(f"  - Email: {user_data.get('email')}")
                        print(f"  - Full Name: {user_data.get('full_name')}")
                    else:
                        print(f"\n❌ Failed to get user profile: {response.status_code}")
                        print(response.text)
                    
                    # Test teams endpoint
                    response = await client.get(
                        "http://localhost:8000/api/v1/auth/teams",
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        teams = response.json()
                        print(f"\n✅ User Teams ({len(teams)}):")
                        for team in teams:
                            print(f"  - {team['name']} (Role: {team['role']})")
                    else:
                        print(f"\n❌ Failed to get teams: {response.status_code}")
                
                # Sign out
                supabase.auth.sign_out()
                print("\n✅ Successfully signed out")
                
        except Exception as e:
            print(f"\n❌ Authentication failed: {str(e)}")
    
    else:
        print("\nSkipping authentication test...")
        print("\nTo test authentication:")
        print("1. Create a user in your Supabase dashboard")
        print("2. Enable email/password auth in Supabase")
        print("3. Or use the OAuth flow through your frontend")
        
        print("\n=== Testing Database Connection ===")
        
        # Test if we can connect to the database
        try:
            result = supabase.table("achievements").select("*").limit(1).execute()
            print("✅ Database connection successful")
            print(f"Found {len(result.data)} achievements")
        except Exception as e:
            print(f"❌ Database connection failed: {str(e)}")

if __name__ == "__main__":
    print("Starting authentication test...")
    print("Make sure the backend server is running on http://localhost:8000\n")
    
    asyncio.run(test_auth_flow())