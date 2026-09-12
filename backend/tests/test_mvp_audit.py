import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

def test_user_registration_success_and_duplicate_handling(client: TestClient):
    """
    Mandatory MVP Requirement: User Registration
    Verify new user can register with name, email, password, and role.
    Verify duplicate registration is rejected.
    """
    new_user_payload = {
        "name": "Audit New User",
        "email": "audit_user@example.com",
        "password": "SecurePassword@123",
        "role": "customer"
    }
    # 1. Successful registration
    res = client.post("/api/auth/register", json=new_user_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Audit New User"
    assert data["email"] == "audit_user@example.com"
    assert data["role"] == "customer"
    assert "id" in data

    # 2. Duplicate registration attempt
    dup_res = client.post("/api/auth/register", json=new_user_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

def test_user_login_success_and_invalid_credentials(client: TestClient):
    """
    Mandatory MVP Requirement: User Login
    Verify user can log in with email + password and receive JWT token.
    Verify invalid credentials return 401 Unauthorized.
    """
    # 1. Valid login
    login_res = client.post("/api/auth/login", json={
        "email": "cust_test@example.com",
        "password": "Cust@123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    assert login_data["user"]["email"] == "cust_test@example.com"

    # 2. Invalid password
    bad_res = client.post("/api/auth/login", json={
        "email": "cust_test@example.com",
        "password": "WrongPassword!"
    })
    assert bad_res.status_code == 401
    assert "Incorrect email or password" in bad_res.json()["detail"]

def test_inactive_or_maintenance_room_cannot_be_booked(
    client: TestClient,
    admin_token: str,
    customer_token: str
):
    """
    Mandatory MVP Requirement: Inactive rooms must never appear as bookable
    and cannot be booked.
    """
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    cust_headers = {"Authorization": f"Bearer {customer_token}"}

    # Mark Room 1 as maintenance
    status_res = client.patch(
        "/api/rooms/1/status",
        json={"availability_status": "maintenance"},
        headers=admin_headers
    )
    assert status_res.status_code == 200

    try:
        check_in = (date.today() + timedelta(days=50)).isoformat()
        check_out = (date.today() + timedelta(days=53)).isoformat()

        # 1. Verify inactive room does NOT appear in search
        search_res = client.get(
            "/api/rooms/search",
            params={"check_in": check_in, "check_out": check_out, "guests": 1, "hotel_id": 1}
        )
        assert search_res.status_code == 200
        room_ids_in_search = [r["id"] for r in search_res.json()]
        assert 1 not in room_ids_in_search, "Inactive/maintenance room appeared in search results!"

        # 2. Direct attempt to book inactive room returns 400
        book_res = client.post(
            "/api/bookings",
            json={
                "room_id": 1,
                "check_in_date": check_in,
                "check_out_date": check_out,
                "guests": 1
            },
            headers=cust_headers
        )
        assert book_res.status_code == 400
        assert "cannot be booked" in book_res.json()["detail"]
    finally:
        # Re-activate Room 1
        client.patch("/api/rooms/1/status", json={"availability_status": "active"}, headers=admin_headers)

def test_overlapping_booking_rejected_and_excluded_from_search(
    client: TestClient,
    customer_token: str,
    customer2_token: str
):
    """
    Mandatory MVP Requirement: Overlapping bookings must be rejected at DB level
    and excluded dynamically from availability search.
    """
    cust1_headers = {"Authorization": f"Bearer {customer_token}"}
    cust2_headers = {"Authorization": f"Bearer {customer2_token}"}

    # Check-in: Day +120, Check-out: Day +125 for Room 2 (distinct from concurrency test)
    check_in = date.today() + timedelta(days=120)
    check_out = date.today() + timedelta(days=125)

    # 1. Customer 1 books Room 2
    book_res = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "check_in_date": check_in.isoformat(),
            "check_out_date": check_out.isoformat(),
            "guests": 2
        },
        headers=cust1_headers
    )
    assert book_res.status_code == 201

    # 2. Customer 2 searches overlapping window (Day +62 to Day +64)
    search_overlap = client.get(
        "/api/rooms/search",
        params={
            "check_in": (check_in + timedelta(days=2)).isoformat(),
            "check_out": (check_in + timedelta(days=4)).isoformat(),
            "guests": 2,
            "hotel_id": 1
        }
    )
    assert search_overlap.status_code == 200
    available_room_ids = [r["id"] for r in search_overlap.json()]
    assert 2 not in available_room_ids, "Booked room appeared in overlapping search!"

    # 3. Customer 2 attempts to book overlapping dates directly -> 409 Conflict
    conflict_res = client.post(
        "/api/bookings",
        json={
            "room_id": 2,
            "check_in_date": (check_in + timedelta(days=1)).isoformat(),
            "check_out_date": (check_out + timedelta(days=1)).isoformat(),
            "guests": 2
        },
        headers=cust2_headers
    )
    assert conflict_res.status_code == 409
    assert "conflict" in conflict_res.json()["detail"].lower() or "already booked" in conflict_res.json()["detail"].lower()

def test_booking_confirmation_payload_completeness(
    client: TestClient,
    customer_token: str
):
    """
    Mandatory MVP Requirement: Booking confirmation must return all required fields:
    Booking ID, Hotel, Room, Customer, Dates, Guests, Total Amount, Status, Booking Date.
    """
    headers = {"Authorization": f"Bearer {customer_token}"}
    check_in = date.today() + timedelta(days=70)
    check_out = date.today() + timedelta(days=73)

    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "check_in_date": check_in.isoformat(),
            "check_out_date": check_out.isoformat(),
            "guests": 2
        },
        headers=headers
    )
    assert res.status_code == 201
    booking = res.json()

    # Assert all mandatory rubric fields exist
    assert "id" in booking
    assert "customer_id" in booking
    assert "organization_id" in booking
    assert "hotel_id" in booking
    assert "room_id" in booking
    assert booking["check_in_date"] == check_in.isoformat()
    assert booking["check_out_date"] == check_out.isoformat()
    assert booking["guests"] == 2
    assert booking["total_amount"] > 0
    assert booking["status"] == "CONFIRMED"
    assert "booking_date" in booking

def test_customer_isolation_cannot_view_other_customer_booking(
    client: TestClient,
    customer_token: str,
    customer2_token: str
):
    """
    Mandatory MVP Requirement: Customer can view own bookings, but CANNOT
    view another customer's booking details directly.
    """
    cust1_headers = {"Authorization": f"Bearer {customer_token}"}
    cust2_headers = {"Authorization": f"Bearer {customer2_token}"}

    # Customer 1 creates booking
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "check_in_date": (date.today() + timedelta(days=80)).isoformat(),
            "check_out_date": (date.today() + timedelta(days=82)).isoformat(),
            "guests": 1
        },
        headers=cust1_headers
    )
    assert res.status_code == 201
    b_id = res.json()["id"]

    # Customer 1 can view it
    view_self = client.get(f"/api/bookings/{b_id}", headers=cust1_headers)
    assert view_self.status_code == 200
    assert view_self.json()["id"] == b_id

    # Customer 2 attempts to view Customer 1's booking -> 403 Forbidden
    view_other = client.get(f"/api/bookings/{b_id}", headers=cust2_headers)
    assert view_other.status_code == 403
    assert "permission" in view_other.json()["detail"].lower()
