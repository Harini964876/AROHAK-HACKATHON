import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.rate_limiter import limiter
from app.config import settings

def test_privilege_escalation_prevented_on_register(client: TestClient):
    """
    CRITICAL SECURITY TEST:
    Verify that an untrusted client attempting to self-register as an 'admin'
    with an 'organization_id' is strictly forced to role='customer' and organization_id=None.
    """
    malicious_payload = {
        "name": "Attacker Trying Admin",
        "email": "attacker_admin@example.com",
        "password": "HackerPassword@123",
        "role": "admin",
        "organization_id": 1
    }

    res = client.post("/api/auth/register", json=malicious_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "customer", "CRITICAL FLAW: User was granted admin role via public registration!"
    assert data["organization_id"] is None, "CRITICAL FLAW: User was assigned an organization_id via public registration!"

def test_password_length_and_complexity_enforcement(client: TestClient):
    """
    Verify that passwords shorter than 8 characters or lacking complexity
    (letters + digits/symbols) are rejected with 422 Unprocessable Entity.
    """
    # 1. Too short (< 8 chars)
    short_res = client.post("/api/auth/register", json={
        "name": "Weak Pass User",
        "email": "weak1@example.com",
        "password": "Pass1"
    })
    assert short_res.status_code == 422

    # 2. Only letters (no digits or symbols)
    letters_only_res = client.post("/api/auth/register", json={
        "name": "Weak Pass User",
        "email": "weak2@example.com",
        "password": "JustLettersPassword"
    })
    assert letters_only_res.status_code == 422

    # 3. Only digits (no letters)
    digits_only_res = client.post("/api/auth/register", json={
        "name": "Weak Pass User",
        "email": "weak3@example.com",
        "password": "123456789012"
    })
    assert digits_only_res.status_code == 422

    # 4. Valid complex password (>= 8 chars, letters + digits)
    valid_res = client.post("/api/auth/register", json={
        "name": "Valid Pass User",
        "email": "valid_pass@example.com",
        "password": "ValidPassword123"
    })
    assert valid_res.status_code == 201

def test_security_headers_present(client: TestClient):
    """
    Verify that security headers (CSP, X-Content-Type-Options, X-Frame-Options)
    are present on all HTTP responses.
    """
    res = client.get("/")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "default-src 'self'" in res.headers.get("Content-Security-Policy", "")

def test_token_revocation_on_logout(client: TestClient):
    """
    Verify that logging out revokes the JWT session token, causing subsequent
    authenticated requests using that token to be rejected with 401 Unauthorized.
    """
    # 1. Login to obtain access token
    login_res = client.post("/api/auth/login", json={
        "email": "cust_test@example.com",
        "password": "Cust@123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify token is active and valid
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "cust_test@example.com"

    # 3. Logout to revoke token
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert "revoked" in logout_res.json()["message"].lower()

    # 4. Verify the revoked token is immediately rejected
    me_after_logout = client.get("/api/auth/me", headers=headers)
    assert me_after_logout.status_code == 401
    assert "revoked" in me_after_logout.json()["detail"].lower()

def test_auth_rate_limiting(client: TestClient):
    """
    Verify that rapid repeated login attempts trigger rate limiting (429 Too Many Requests).
    """
    limiter.reset()
    original_rate_limit = settings.RATE_LIMIT_ENABLED
    settings.RATE_LIMIT_ENABLED = True

    try:
        # Send 6 consecutive attempts for the same email (threshold is 5/min)
        status_codes = []
        for i in range(7):
            res = client.post("/api/auth/login", json={
                "email": "brute_force_target@example.com",
                "password": f"WrongPassword_{i}"
            })
            status_codes.append(res.status_code)

        # The first few should be 401 (invalid credentials), followed by 429 (rate limited)
        assert 429 in status_codes, f"Expected 429 Too Many Requests, got: {status_codes}"
        assert status_codes[-1] == 429
    finally:
        limiter.reset()
        settings.RATE_LIMIT_ENABLED = original_rate_limit
