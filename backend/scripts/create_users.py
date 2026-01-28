"""
Script to create test users for the 2B platform.
Run this from the backend directory: python scripts/create_users.py
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ubyghfhlawbwvqwmrzbw.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieWdoZmhsYXdid3Zxd21yemJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM4Njg5MSwiZXhwIjoyMDg0OTYyODkxfQ.Xjc6FLfBx6trsgOp3Fc7L429IdnMZb6KdAYNw-PqgM0"
)

# Demo organization ID (from FULL_SETUP.sql)
ORGANIZATION_ID = "11111111-1111-1111-1111-111111111111"

# Users to create
USERS = [
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


def create_users():
    """Create test users using Supabase Admin API."""
    print("Creating test users for 2B Platform...")
    print(f"   Supabase URL: {SUPABASE_URL}")
    print()

    # Create admin client with service role
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    for user_data in USERS:
        email = user_data["email"]
        password = user_data["password"]
        full_name = user_data["full_name"]
        role = user_data["role"]

        print(f"Creating user: {email}")

        try:
            # Step 1: Create auth user
            auth_response = supabase.auth.admin.create_user(
                {
                    "email": email,
                    "password": password,
                    "email_confirm": True,  # Auto-confirm email
                    "user_metadata": {
                        "full_name": full_name,
                    },
                }
            )

            if not auth_response.user:
                print(f"   [ERROR] Failed to create auth user")
                continue

            user_id = auth_response.user.id
            print(f"   [OK] Auth user created: {user_id}")

            # Step 2: Update profile with role and organization
            # The profile is auto-created by the trigger, so we just update it
            profile_response = (
                supabase.table("profiles")
                .update({
                    "role": role,
                    "organization_id": ORGANIZATION_ID,
                    "full_name": full_name,
                })
                .eq("id", user_id)
                .execute()
            )

            if profile_response.data:
                print(f"   [OK] Profile updated: role={role}, org={ORGANIZATION_ID[:8]}...")
            else:
                # Profile might not exist yet, create it
                print(f"   [WARN] Profile not found, creating...")
                supabase.table("profiles").insert({
                    "id": user_id,
                    "email": email,
                    "full_name": full_name,
                    "role": role,
                    "organization_id": ORGANIZATION_ID,
                }).execute()
                print(f"   [OK] Profile created")

            print()

        except Exception as e:
            error_msg = str(e)
            if "already been registered" in error_msg or "already exists" in error_msg.lower():
                print(f"   [WARN] User already exists, updating...")

                # Get existing user from profiles
                existing = supabase.table("profiles").select("id").eq("email", email).execute()
                if existing.data:
                    user_id = existing.data[0]["id"]

                    # Update auth user to confirm email and reset password
                    try:
                        supabase.auth.admin.update_user_by_id(
                            user_id,
                            {
                                "email_confirm": True,
                                "password": password,
                            }
                        )
                        print(f"   [OK] Auth user updated (email confirmed, password reset)")
                    except Exception as auth_err:
                        print(f"   [WARN] Could not update auth: {auth_err}")

                    # Update profile
                    supabase.table("profiles").update({
                        "role": role,
                        "organization_id": ORGANIZATION_ID,
                        "full_name": full_name,
                    }).eq("id", user_id).execute()
                    print(f"   [OK] Profile updated")
                print()
            else:
                print(f"   [ERROR] {error_msg}")
                print()

    print("=" * 50)
    print("Done! Test users:")
    print()
    for user_data in USERS:
        print(f"   Email: {user_data['email']}")
        print(f"   Password: {user_data['password']}")
        print(f"   Role: {user_data['role']}")
        print()


if __name__ == "__main__":
    create_users()
