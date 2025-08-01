"""
Get a test token from Supabase
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

print("=== Supabase Test Token Generator ===\n")
print("Choose an option:")
print("1. Sign in with existing user")
print("2. Create new test user")

choice = input("\nEnter choice (1 or 2): ")

if choice == "1":
    email = input("Email: ")
    password = input("Password: ")
    
    try:
        auth = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if auth.session:
            print(f"\n✅ Success! Here's your access token:\n")
            print(auth.session.access_token)
            print(f"\n\nTest it with:")
            print(f'curl -H "Authorization: Bearer {auth.session.access_token[:20]}..." http://localhost:8000/api/auth/me')
        else:
            print("\n❌ Sign in failed")
    except Exception as e:
        print(f"\n❌ Error: {e}")

elif choice == "2":
    email = input("New user email: ")
    password = input("New user password (min 6 chars): ")
    
    try:
        auth = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        if auth.session:
            print(f"\n✅ User created! Here's your access token:\n")
            print(auth.session.access_token)
            print(f"\n\nTest it with:")
            print(f'curl -H "Authorization: Bearer {auth.session.access_token[:20]}..." http://localhost:8000/api/auth/me')
        else:
            print("\n❌ Sign up failed - user might already exist")
    except Exception as e:
        print(f"\n❌ Error: {e}")