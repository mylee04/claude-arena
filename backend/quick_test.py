#!/usr/bin/env python3
"""
Quick test script for authentication
"""
import asyncio
import httpx
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_public_endpoints():
    """Test endpoints that don't require auth"""
    async with httpx.AsyncClient() as client:
        print("=== Testing Public Endpoints ===\n")
        
        # Test root
        response = await client.get(f"{BASE_URL}/")
        print(f"GET / - Status: {response.status_code}")
        print(f"Response: {response.json()}\n")
        
        # Test health
        response = await client.get(f"{BASE_URL}/health")
        print(f"GET /health - Status: {response.status_code}")
        print(f"Response: {response.json()}\n")
        
        # Test API docs
        response = await client.get(f"{BASE_URL}/docs")
        print(f"GET /docs - Status: {response.status_code} (Should be 200 if not in production)\n")

async def test_auth_endpoints_without_token():
    """Test auth endpoints without a token (should fail)"""
    async with httpx.AsyncClient() as client:
        print("=== Testing Auth Endpoints Without Token ===\n")
        
        # Test /me without token
        response = await client.get(f"{BASE_URL}/api/auth/me")
        print(f"GET /api/auth/me - Status: {response.status_code} (Should be 403)")
        print(f"Response: {response.json()}\n")
        
        # Test /teams without token
        response = await client.get(f"{BASE_URL}/api/auth/teams")
        print(f"GET /api/auth/teams - Status: {response.status_code} (Should be 403)")
        print(f"Response: {response.json()}\n")

async def test_with_mock_token():
    """Test with a mock token to see the auth flow"""
    async with httpx.AsyncClient() as client:
        print("=== Testing With Mock Token ===\n")
        
        headers = {"Authorization": "Bearer mock-token-12345"}
        
        # Test /me with mock token
        response = await client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print(f"GET /api/auth/me - Status: {response.status_code}")
        print(f"Response: {response.json()}\n")
        
        print("Note: This should fail with 'Invalid authentication credentials'")
        print("To test with a real token, you need to:")
        print("1. Create a user in Supabase dashboard")
        print("2. Get their access token")
        print("3. Replace 'mock-token-12345' with the real token\n")

async def main():
    print(f"\n{'='*50}")
    print(f"Claude Arena Authentication Test")
    print(f"Time: {datetime.now()}")
    print(f"Server: {BASE_URL}")
    print(f"{'='*50}\n")
    
    # Check if server is running
    try:
        async with httpx.AsyncClient() as client:
            await client.get(f"{BASE_URL}/", timeout=2.0)
    except Exception as e:
        print(f"❌ ERROR: Cannot connect to server at {BASE_URL}")
        print(f"   Make sure the backend is running: python main.py")
        print(f"   Error: {e}")
        return
    
    await test_public_endpoints()
    await test_auth_endpoints_without_token()
    await test_with_mock_token()
    
    print("\n=== Next Steps ===")
    print("1. Create a test user in Supabase dashboard")
    print("2. Use examples/test_auth.py for full authentication flow")
    print("3. Or use the frontend to sign in and get a token")
    print("4. Check http://localhost:8000/docs for interactive API testing")

if __name__ == "__main__":
    asyncio.run(main())