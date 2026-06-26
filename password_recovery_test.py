#!/usr/bin/env python3
"""Password Recovery Endpoints Test for Futsal Time Hub."""
import requests
import sys
import time
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / ".env")

# Backend URL
BASE_URL = "https://futsal-timer-1.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "pedrompsantos84@gmail.com"
ADMIN_PASSWORD = "Amarense"

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "futsal_time_hub")

# Global state
admin_token = None
admin_user_id = None
reset_token = None


def log(msg, level="INFO"):
    """Log test messages."""
    print(f"[{level}] {msg}")


def get_db():
    """Get MongoDB database connection."""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def test_1_forgot_password_existing_user():
    """Test 1: POST /api/auth/forgot-password with existing admin user."""
    log("Test 1: Testing forgot-password with existing user (pedrompsantos84@gmail.com)...")
    resp = requests.post(
        f"{BASE_URL}/auth/forgot-password",
        json={"email": ADMIN_EMAIL}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data.get("ok") is True, f"Expected ok=True, got {data}"
    assert "message" in data, "Missing message in response"
    log(f"✅ forgot-password returned 200 with message: {data['message']}")
    
    # Verify token was stored in password_resets collection
    log("Verifying token stored in password_resets collection...")
    db = get_db()
    # Get admin user_id first
    admin_user = db.users.find_one({"email": ADMIN_EMAIL})
    assert admin_user is not None, "Admin user not found in database"
    
    # Find reset token
    reset_record = db.password_resets.find_one({"user_id": admin_user["_id"]})
    assert reset_record is not None, "Reset token not found in password_resets collection"
    assert "_id" in reset_record, "Token (_id) missing in reset record"
    assert "expires_at" in reset_record, "expires_at missing in reset record"
    
    global reset_token
    reset_token = reset_record["_id"]
    log(f"✅ Token stored in password_resets collection (token: {reset_token[:8]}...)")
    
    # Check expiry is ~1 hour from now
    expires_at = reset_record["expires_at"]
    now = datetime.utcnow()
    time_diff = (expires_at - now).total_seconds()
    assert 3500 < time_diff < 3700, f"Token expiry should be ~1 hour, got {time_diff} seconds"
    log(f"✅ Token expires in {int(time_diff)} seconds (~1 hour)")


def test_2_forgot_password_nonexistent_user():
    """Test 2: POST /api/auth/forgot-password with non-existent user (should still return 200)."""
    log("Test 2: Testing forgot-password with non-existent user...")
    resp = requests.post(
        f"{BASE_URL}/auth/forgot-password",
        json={"email": "naoexiste@nowhere.pt"}
    )
    assert resp.status_code == 200, f"Expected 200 (security), got {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data.get("ok") is True, "Expected ok=True even for non-existent user"
    log("✅ forgot-password returned 200 for non-existent user (security: no account leakage)")


def test_3_forgot_password_invalid_email():
    """Test 3: POST /api/auth/forgot-password with invalid email format."""
    log("Test 3: Testing forgot-password with invalid email format...")
    resp = requests.post(
        f"{BASE_URL}/auth/forgot-password",
        json={"email": "notanemail"}
    )
    assert resp.status_code == 422, f"Expected 422 validation error, got {resp.status_code} - {resp.text}"
    log("✅ forgot-password returned 422 for invalid email format")


def test_4_reset_password_valid_token():
    """Test 4: POST /api/auth/reset-password with valid token."""
    global admin_token, admin_user_id
    log("Test 4: Testing reset-password with valid token...")
    
    new_password = "TempPassword123"
    resp = requests.post(
        f"{BASE_URL}/auth/reset-password",
        json={"token": reset_token, "password": new_password}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data.get("ok") is True, "Expected ok=True"
    assert "message" in data, "Missing message in response"
    log(f"✅ reset-password returned 200 with message: {data['message']}")
    
    # Verify user can login with new password
    log("Verifying login with new password...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": new_password}
    )
    assert resp.status_code == 200, f"Login with new password failed: {resp.status_code} - {resp.text}"
    data = resp.json()
    assert "access_token" in data, "Missing access_token"
    admin_token = data["access_token"]
    admin_user_id = data["user"]["id"]
    log("✅ User can login with new password")


def test_5_reset_password_token_reuse():
    """Test 5: Token cannot be reused (should be deleted after use)."""
    log("Test 5: Testing token reuse (should fail)...")
    resp = requests.post(
        f"{BASE_URL}/auth/reset-password",
        json={"token": reset_token, "password": "AnotherPassword123"}
    )
    assert resp.status_code == 400, f"Expected 400 for reused token, got {resp.status_code}"
    assert "inválido" in resp.text.lower() or "usado" in resp.text.lower() or "invalid" in resp.text.lower(), \
        f"Error should mention invalid/used token, got: {resp.text}"
    log("✅ Token reuse correctly blocked with 400 'Token inválido ou já usado'")


def test_6_reset_password_invalid_token():
    """Test 6: POST /api/auth/reset-password with invalid token."""
    log("Test 6: Testing reset-password with invalid token...")
    resp = requests.post(
        f"{BASE_URL}/auth/reset-password",
        json={"token": "invalid-token-xyz-123", "password": "NewPassword123"}
    )
    assert resp.status_code == 400, f"Expected 400 for invalid token, got {resp.status_code}"
    assert "inválido" in resp.text.lower() or "invalid" in resp.text.lower(), \
        f"Error should mention invalid token, got: {resp.text}"
    log("✅ Invalid token correctly blocked with 400")


def test_7_reset_password_short_password():
    """Test 7: POST /api/auth/reset-password with password < 6 chars."""
    log("Test 7: Testing reset-password with password < 6 chars...")
    
    # First create a new token for this test
    resp = requests.post(
        f"{BASE_URL}/auth/forgot-password",
        json={"email": ADMIN_EMAIL}
    )
    assert resp.status_code == 200, "Failed to create test token"
    
    # Get the new token
    db = get_db()
    admin_user = db.users.find_one({"email": ADMIN_EMAIL})
    reset_record = db.password_resets.find_one({"user_id": admin_user["_id"]})
    test_token = reset_record["_id"]
    
    # Try to reset with short password
    resp = requests.post(
        f"{BASE_URL}/auth/reset-password",
        json={"token": test_token, "password": "12345"}
    )
    assert resp.status_code == 400, f"Expected 400 for short password, got {resp.status_code}"
    assert "6" in resp.text and ("caracteres" in resp.text.lower() or "character" in resp.text.lower()), \
        f"Error should mention 6 characters minimum, got: {resp.text}"
    log("✅ Short password correctly blocked with 400")
    
    # Clean up the test token
    db.password_resets.delete_one({"_id": test_token})


def test_8_reset_password_expired_token():
    """Test 8: POST /api/auth/reset-password with expired token."""
    log("Test 8: Testing reset-password with expired token...")
    
    # Create an expired token manually in DB
    db = get_db()
    admin_user = db.users.find_one({"email": ADMIN_EMAIL})
    
    import uuid
    expired_token = uuid.uuid4().hex
    db.password_resets.insert_one({
        "_id": expired_token,
        "user_id": admin_user["_id"],
        "expires_at": datetime.utcnow() - timedelta(hours=1),  # Expired 1 hour ago
        "created_at": datetime.utcnow() - timedelta(hours=2),
    })
    log(f"Created expired token in DB: {expired_token[:8]}...")
    
    # Try to reset with expired token
    resp = requests.post(
        f"{BASE_URL}/auth/reset-password",
        json={"token": expired_token, "password": "NewPassword123"}
    )
    assert resp.status_code == 400, f"Expected 400 for expired token, got {resp.status_code}"
    assert "expirado" in resp.text.lower() or "expired" in resp.text.lower(), \
        f"Error should mention expired token, got: {resp.text}"
    log("✅ Expired token correctly blocked with 400 'Token expirado'")


def test_9_restore_admin_password():
    """Test 9: Restore admin password to 'Amarense'."""
    log("Test 9: Restoring admin password to 'Amarense'...")
    
    # Use admin token to reset own password via admin endpoint
    resp = requests.post(
        f"{BASE_URL}/admin/users/{admin_user_id}/password",
        json={"password": ADMIN_PASSWORD},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200, f"Failed to restore password: {resp.status_code} - {resp.text}"
    log("✅ Admin password restored via admin endpoint")
    
    # Verify login with restored password
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert resp.status_code == 200, f"Login with restored password failed: {resp.status_code} - {resp.text}"
    log("✅ Admin can login with restored password 'Amarense'")


def check_backend_logs():
    """Check backend logs for Resend email status."""
    log("=" * 60)
    log("Checking backend logs for Resend email status...")
    log("=" * 60)
    
    import subprocess
    try:
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            log("Backend error log (last 50 lines):")
            print(result.stdout)
            
            # Look for password reset related logs
            if "Password reset requested" in result.stdout:
                log("✅ Found password reset log entries")
            if "Failed to send reset email" in result.stdout:
                log("⚠️  WARNING: Found failed email send attempts")
            if "RESEND_API_KEY not configured" in result.stdout:
                log("⚠️  WARNING: Resend API key not configured")
        else:
            log(f"Failed to read backend logs: {result.stderr}", "ERROR")
    except Exception as e:
        log(f"Error reading backend logs: {e}", "ERROR")


def main():
    """Run all password recovery tests."""
    log("=" * 60)
    log("Starting Password Recovery Endpoints Tests")
    log("=" * 60)
    
    tests = [
        test_1_forgot_password_existing_user,
        test_2_forgot_password_nonexistent_user,
        test_3_forgot_password_invalid_email,
        test_4_reset_password_valid_token,
        test_5_reset_password_token_reuse,
        test_6_reset_password_invalid_token,
        test_7_reset_password_short_password,
        test_8_reset_password_expired_token,
        test_9_restore_admin_password,
    ]
    
    failed = []
    for test in tests:
        try:
            test()
        except AssertionError as e:
            log(f"❌ {test.__name__} FAILED: {e}", "ERROR")
            failed.append((test.__name__, str(e)))
        except Exception as e:
            log(f"❌ {test.__name__} ERROR: {e}", "ERROR")
            failed.append((test.__name__, str(e)))
    
    # Check backend logs
    check_backend_logs()
    
    log("=" * 60)
    if failed:
        log(f"FAILED: {len(failed)} test(s) failed", "ERROR")
        for name, error in failed:
            log(f"  - {name}: {error}", "ERROR")
        sys.exit(1)
    else:
        log("SUCCESS: All password recovery tests passed! ✅")
        log("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    main()
