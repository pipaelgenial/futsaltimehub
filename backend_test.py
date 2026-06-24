#!/usr/bin/env python3
"""Backend API tests for Futsal Time Hub."""
import requests
import sys
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://futsal-timer-1.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "pedrompsantos84@gmail.com"
ADMIN_PASSWORD = "Amarense"
TEST_USER_EMAIL = "joao@teste.pt"
TEST_USER_PASSWORD = "senha123"

# Global state
admin_token = None
admin_user_id = None
test_user_id = None
test_user_token = None


def log(msg, level="INFO"):
    """Log test messages."""
    print(f"[{level}] {msg}")


def test_health():
    """Test 1: Health check."""
    log("Testing health endpoint...")
    resp = requests.get(f"{BASE_URL}/")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert "service" in data, "Missing 'service' in response"
    assert data["status"] == "ok", "Status should be 'ok'"
    log("✅ Health check passed")


def test_admin_login():
    """Test 2: Admin login."""
    global admin_token, admin_user_id
    log("Testing admin login...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.status_code} - {resp.text}"
    data = resp.json()
    assert "access_token" in data, "Missing access_token"
    assert "user" in data, "Missing user"
    assert data["user"]["is_admin"] is True, "User should be admin"
    assert data["user"]["status"] == "approved", "Admin should be approved"
    admin_token = data["access_token"]
    admin_user_id = data["user"]["id"]
    log(f"✅ Admin login successful (user_id: {admin_user_id})")


def test_register_new_user():
    """Test 3: Register new user (should be pending)."""
    global test_user_id
    log("Testing user registration...")
    resp = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "name": "João Silva",
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
    )
    assert resp.status_code == 201, f"Registration failed: {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data["status"] == "pending", f"New user should be pending, got {data['status']}"
    assert data["is_admin"] is False, "New user should not be admin"
    test_user_id = data["id"]
    log(f"✅ User registered with status=pending (user_id: {test_user_id})")


def test_pending_user_login_blocked():
    """Test 4: Pending user cannot login."""
    log("Testing pending user login (should fail)...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    assert resp.status_code == 403, f"Expected 403 for pending user, got {resp.status_code}"
    assert "aguarda aprovação" in resp.text.lower() or "pending" in resp.text.lower(), \
        "Error message should mention pending approval"
    log("✅ Pending user login correctly blocked with 403")


def test_auth_me_admin():
    """Test 5: GET /auth/me with admin token."""
    log("Testing /auth/me with admin token...")
    resp = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data["id"] == admin_user_id, "User ID mismatch"
    assert data["is_admin"] is True, "Should be admin"
    log("✅ /auth/me returned admin user correctly")


def test_admin_list_users():
    """Test 6: Admin lists all users."""
    log("Testing admin list users...")
    resp = requests.get(
        f"{BASE_URL}/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    users = resp.json()
    assert isinstance(users, list), "Response should be a list"
    assert len(users) >= 2, f"Should have at least 2 users (admin + test user), got {len(users)}"
    # Find the pending user
    pending_user = next((u for u in users if u["id"] == test_user_id), None)
    assert pending_user is not None, "Test user not found in user list"
    assert pending_user["status"] == "pending", "Test user should be pending"
    log(f"✅ Admin listed {len(users)} users, including pending test user")


def test_admin_approve_user():
    """Test 7: Admin approves the pending user."""
    global test_user_token
    log("Testing admin approve user...")
    resp = requests.patch(
        f"{BASE_URL}/admin/users/{test_user_id}",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data["status"] == "approved", f"User should be approved, got {data['status']}"
    log("✅ User approved successfully")
    
    # Now test user can login
    log("Testing approved user login...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    assert resp.status_code == 200, f"Approved user login failed: {resp.status_code} - {resp.text}"
    data = resp.json()
    test_user_token = data["access_token"]
    log("✅ Approved user can now login successfully")


def test_admin_self_demote_blocked():
    """Test 8: Admin cannot demote themselves."""
    log("Testing admin self-demote prevention...")
    resp = requests.patch(
        f"{BASE_URL}/admin/users/{admin_user_id}",
        json={"is_admin": False},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 400, f"Expected 400 for self-demote, got {resp.status_code}"
    assert "próprio" in resp.text.lower() or "self" in resp.text.lower(), \
        "Error should mention self-demotion"
    log("✅ Admin self-demote correctly blocked with 400")


def test_admin_delete_admin_blocked():
    """Test 9: Cannot delete an admin user."""
    log("Testing admin deletion prevention...")
    resp = requests.delete(
        f"{BASE_URL}/admin/users/{admin_user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 400, f"Expected 400 for admin deletion, got {resp.status_code}"
    assert "administrador" in resp.text.lower() or "admin" in resp.text.lower(), \
        "Error should mention admin protection"
    log("✅ Admin deletion correctly blocked with 400")


def test_admin_reset_user_password():
    """Test 10: Admin resets user password."""
    log("Testing admin password reset...")
    new_password = "novapwd123"
    resp = requests.post(
        f"{BASE_URL}/admin/users/{test_user_id}/password",
        json={"password": new_password},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    log("✅ Password reset successful")
    
    # Test login with new password
    log("Testing login with new password...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": new_password}
    )
    assert resp.status_code == 200, f"Login with new password failed: {resp.status_code} - {resp.text}"
    log("✅ User can login with new password")


def test_team_crud():
    """Test 11: Team CRUD (user-scoped)."""
    log("Testing team CRUD...")
    
    # GET team (should be null initially)
    resp = requests.get(
        f"{BASE_URL}/team",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data is None, f"Team should be null initially, got {data}"
    log("✅ GET /team returned null (no team yet)")
    
    # POST team
    resp = requests.post(
        f"{BASE_URL}/team",
        json={"name": "TESTE FC", "coach": "João Silva"},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} - {resp.text}"
    team = resp.json()
    assert team["name"] == "TESTE FC", f"Team name mismatch: {team['name']}"
    assert team["coach"] == "João Silva", f"Coach mismatch: {team['coach']}"
    log(f"✅ Team created (id: {team['id']})")
    
    # GET team (should return the team)
    resp = requests.get(
        f"{BASE_URL}/team",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data is not None, "Team should not be null"
    assert data["name"] == "TESTE FC", "Team name mismatch"
    log("✅ GET /team returned the created team")


def test_athletes_crud():
    """Test 12: Athletes CRUD (user-scoped)."""
    log("Testing athletes CRUD...")
    
    # POST athlete
    resp = requests.post(
        f"{BASE_URL}/athletes",
        json={"number": 7, "name": "Ala 7", "position": "ALA"},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} - {resp.text}"
    athlete = resp.json()
    assert athlete["number"] == 7, "Athlete number mismatch"
    assert athlete["name"] == "Ala 7", "Athlete name mismatch"
    log(f"✅ Athlete created (id: {athlete['id']})")
    
    # POST duplicate number (should fail)
    resp = requests.post(
        f"{BASE_URL}/athletes",
        json={"number": 7, "name": "Outro Jogador", "position": "ALA"},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 409, f"Expected 409 for duplicate number, got {resp.status_code}"
    assert "7" in resp.text and ("uso" in resp.text.lower() or "use" in resp.text.lower()), \
        "Error should mention number in use"
    log("✅ Duplicate athlete number correctly blocked with 409")
    
    # GET athletes
    resp = requests.get(
        f"{BASE_URL}/athletes",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    athletes = resp.json()
    assert len(athletes) == 1, f"Should have 1 athlete, got {len(athletes)}"
    assert athletes[0]["number"] == 7, "Athlete number mismatch"
    log("✅ GET /athletes returned 1 athlete")


def test_matches_crud():
    """Test 13: Matches CRUD (user-scoped)."""
    log("Testing matches CRUD...")
    
    # POST match
    match_data = {
        "opponent": "Rival FC",
        "competition": "Liga Local",
        "matchday": "Jornada 1",
        "venue": "Casa",
        "date": datetime.utcnow().isoformat(),
        "team_name": "TESTE FC",
        "home_score": 3,
        "away_score": 2,
        "fouls_committed": 5,
        "fouls_suffered": 4,
        "yellow_cards": 2,
        "red_cards": 0,
        "total_duration": 2400,
        "half_reached": 2,
        "players": [{"number": 7, "name": "Ala 7"}],
        "subs": [],
        "goals": [{"player": "Ala 7", "time": 120}],
        "fouls": [],
        "cards": []
    }
    resp = requests.post(
        f"{BASE_URL}/matches",
        json=match_data,
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} - {resp.text}"
    match = resp.json()
    assert match["opponent"] == "Rival FC", "Opponent mismatch"
    assert match["home_score"] == 3, "Home score mismatch"
    log(f"✅ Match created (id: {match['id']})")
    
    # GET matches
    resp = requests.get(
        f"{BASE_URL}/matches",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    matches = resp.json()
    assert len(matches) == 1, f"Should have 1 match, got {len(matches)}"
    assert matches[0]["opponent"] == "Rival FC", "Match opponent mismatch"
    log("✅ GET /matches returned 1 match")


def test_data_isolation():
    """Test 14: Admin cannot see test user's data."""
    log("Testing data isolation (admin should not see test user's data)...")
    
    # Admin GET team (should be null)
    resp = requests.get(
        f"{BASE_URL}/team",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    data = resp.json()
    assert data is None, f"Admin should not see test user's team, got {data}"
    log("✅ Admin GET /team returned null (data isolation working)")
    
    # Admin GET athletes (should be empty)
    resp = requests.get(
        f"{BASE_URL}/athletes",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    athletes = resp.json()
    assert len(athletes) == 0, f"Admin should not see test user's athletes, got {len(athletes)}"
    log("✅ Admin GET /athletes returned empty list (data isolation working)")
    
    # Admin GET matches (should be empty)
    resp = requests.get(
        f"{BASE_URL}/matches",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
    matches = resp.json()
    assert len(matches) == 0, f"Admin should not see test user's matches, got {len(matches)}"
    log("✅ Admin GET /matches returned empty list (data isolation working)")


def test_auth_security():
    """Test 15: Auth security (no token, invalid token)."""
    log("Testing auth security...")
    
    # No token
    resp = requests.get(f"{BASE_URL}/auth/me")
    assert resp.status_code == 401, f"Expected 401 for no token, got {resp.status_code}"
    log("✅ Request without token correctly blocked with 401")
    
    # Invalid token
    resp = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": "Bearer invalid-token-xyz"}
    )
    assert resp.status_code == 401, f"Expected 401 for invalid token, got {resp.status_code}"
    log("✅ Request with invalid token correctly blocked with 401")
    
    # Non-admin trying to access admin endpoint
    resp = requests.get(
        f"{BASE_URL}/admin/users",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp.status_code == 403, f"Expected 403 for non-admin, got {resp.status_code}"
    log("✅ Non-admin access to admin endpoint correctly blocked with 403")


def main():
    """Run all tests."""
    log("=" * 60)
    log("Starting Futsal Time Hub Backend API Tests")
    log("=" * 60)
    
    tests = [
        test_health,
        test_admin_login,
        test_register_new_user,
        test_pending_user_login_blocked,
        test_auth_me_admin,
        test_admin_list_users,
        test_admin_approve_user,
        test_admin_self_demote_blocked,
        test_admin_delete_admin_blocked,
        test_admin_reset_user_password,
        test_team_crud,
        test_athletes_crud,
        test_matches_crud,
        test_data_isolation,
        test_auth_security,
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
    
    log("=" * 60)
    if failed:
        log(f"FAILED: {len(failed)} test(s) failed", "ERROR")
        for name, error in failed:
            log(f"  - {name}: {error}", "ERROR")
        sys.exit(1)
    else:
        log("SUCCESS: All tests passed! ✅")
        log("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    main()
