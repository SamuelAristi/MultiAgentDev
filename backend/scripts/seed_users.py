"""
Seed Test Users Script
Creates admin and regular test users in Supabase Auth.

Run with: python -m scripts.seed_users
"""

import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ubyghfhlawbwvqwmrzbw.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Demo Organization ID (must match migration)
DEMO_ORG_ID = "11111111-1111-1111-1111-111111111111"

# Test Users
TEST_USERS = [
    {
        "email": "admin@2b.com",
        "password": "Admin123!",
        "full_name": "Admin 2B",
        "role": "admin",
    },
    {
        "email": "user@2b.com",
        "password": "User123!",
        "full_name": "Usuario Demo",
        "role": "user",
    },
]


def create_supabase_admin_client() -> Client:
    """Create Supabase client with service role key for admin operations."""
    if not SUPABASE_SERVICE_KEY:
        raise ValueError(
            "SUPABASE_SERVICE_ROLE_KEY environment variable is required. "
            "Get it from Supabase Dashboard > Settings > API"
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def seed_users():
    """Create test users in Supabase Auth."""
    print("=" * 60)
    print("Seeding Test Users")
    print("=" * 60)

    try:
        supabase = create_supabase_admin_client()
    except ValueError as e:
        print(f"\n❌ Error: {e}")
        print("\nTo fix this:")
        print("1. Go to Supabase Dashboard > Settings > API")
        print("2. Copy the 'service_role' key (NOT the anon key)")
        print("3. Set it as SUPABASE_SERVICE_ROLE_KEY environment variable")
        return

    for user_data in TEST_USERS:
        print(f"\n📧 Creating user: {user_data['email']}")

        try:
            # Create user in Auth
            auth_response = supabase.auth.admin.create_user(
                {
                    "email": user_data["email"],
                    "password": user_data["password"],
                    "email_confirm": True,  # Auto-confirm email
                    "user_metadata": {
                        "full_name": user_data["full_name"],
                    },
                }
            )

            if auth_response.user:
                user_id = auth_response.user.id
                print(f"   ✅ Auth user created: {user_id}")

                # Update profile with role and organization
                profile_update = supabase.table("profiles").update(
                    {
                        "role": user_data["role"],
                        "organization_id": DEMO_ORG_ID,
                        "full_name": user_data["full_name"],
                    }
                ).eq("id", user_id).execute()

                if profile_update.data:
                    print(f"   ✅ Profile updated: role={user_data['role']}")
                else:
                    print(f"   ⚠️ Profile update may have failed")

        except Exception as e:
            error_msg = str(e)
            if "already been registered" in error_msg or "already exists" in error_msg:
                print(f"   ℹ️ User already exists, updating profile...")

                # Get existing user
                existing = supabase.table("profiles").select("id").eq(
                    "email", user_data["email"]
                ).single().execute()

                if existing.data:
                    # Update existing profile
                    supabase.table("profiles").update(
                        {
                            "role": user_data["role"],
                            "organization_id": DEMO_ORG_ID,
                            "full_name": user_data["full_name"],
                        }
                    ).eq("id", existing.data["id"]).execute()
                    print(f"   ✅ Existing profile updated")
            else:
                print(f"   ❌ Error: {error_msg}")

    print("\n" + "=" * 60)
    print("Test User Credentials")
    print("=" * 60)
    for user in TEST_USERS:
        print(f"\n👤 {user['role'].upper()}")
        print(f"   Email: {user['email']}")
        print(f"   Password: {user['password']}")

    print("\n✅ Seeding complete!")


if __name__ == "__main__":
    seed_users()
