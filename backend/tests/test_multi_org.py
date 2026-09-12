import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

def test_list_organizations_public(client: TestClient):
    """Confirm anyone can list organizations and see their hotels."""
    res = client.get("/api/organizations")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    org_names = [o["name"] for o in data]
    assert "Test Org 1" in org_names
    assert "Test Org 2" in org_names

def test_org_admin_cannot_add_hotel_to_another_org(client: TestClient, admin_token: str):
    """
    Org 1 Admin attempts to add a hotel to Org 2.
    Must receive 403 Forbidden.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "organization_id": 2,
        "name": "Intruder Hotel",
        "address": "999 Hackers Ln",
        "city": "Goa",
        "description": "Cross-tenant intrusion attempt"
    }
    res = client.post("/api/organizations/2/hotels", json=payload, headers=headers)
    assert res.status_code == 403
    assert "authority over this organization" in res.json()["detail"]

def test_org_admin_can_add_hotel_to_own_org(client: TestClient, admin_token: str):
    """
    Org 1 Admin adds a new hotel to Org 1.
    Must succeed (201 Created).
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "organization_id": 1,
        "name": "Grand Horizon Pune",
        "address": "101 Koregaon Park",
        "city": "Pune",
        "description": "Serene business boutique hotel in Pune"
    }
    res = client.post("/api/organizations/1/hotels", json=payload, headers=headers)
    assert res.status_code == 201
    assert res.json()["name"] == "Grand Horizon Pune"
    assert res.json()["organization_id"] == 1

def test_org_admin_cannot_add_room_to_another_org_hotel(client: TestClient, admin_token: str):
    """
    Org 1 Admin attempts to add a room to Org 2's Hotel (hotel_id: 2).
    Must receive 403 Forbidden.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "hotel_id": 2,  # Hotel 2 belongs to Org 2!
        "room_number": "INTRUDER-1",
        "room_type": "Illegal Room",
        "capacity": 2,
        "price_per_night": 100.0,
        "availability_status": "active"
    }
    res = client.post("/api/rooms", json=payload, headers=headers)
    assert res.status_code == 403
    assert "another organization" in res.json()["detail"]

def test_org_admin_can_assign_receptionist_to_own_org(client: TestClient, admin_token: str):
    """
    Org 1 Admin assigns a new receptionist to Org 1.
    Must succeed (201 Created).
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": "New Org1 Receptionist",
        "email": "new_recept1@example.com",
        "password": "Password@123",
        "role": "receptionist"
    }
    res = client.post("/api/organizations/1/staff", json=payload, headers=headers)
    assert res.status_code == 201
    assert res.json()["organization_id"] == 1

def test_org_admin_cannot_assign_receptionist_to_another_org(client: TestClient, admin_token: str):
    """
    Org 1 Admin attempts to assign a staff member to Org 2.
    Must receive 403 Forbidden.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": "Intruder Staff",
        "email": "intruder_staff@example.com",
        "password": "Password@123",
        "role": "receptionist"
    }
    res = client.post("/api/organizations/2/staff", json=payload, headers=headers)
    assert res.status_code == 403
    assert "another organization" in res.json()["detail"]

def test_staff_bookings_strict_data_isolation(
    client: TestClient,
    customer_token: str,
    admin_token: str,
    admin2_token: str
):
    """
    Customer books a room in Org 1 and a room in Org 2.
    Org 1 Admin must ONLY see Org 1 bookings (zero leakage of Org 2).
    Org 2 Admin must ONLY see Org 2 bookings (zero leakage of Org 1).
    """
    cust_headers = {"Authorization": f"Bearer {customer_token}"}
    admin1_headers = {"Authorization": f"Bearer {admin_token}"}
    admin2_headers = {"Authorization": f"Bearer {admin2_token}"}

    # 1. Book room in Org 1 (room_id: 1)
    res1 = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "check_in_date": (date.today() + timedelta(days=20)).isoformat(),
            "check_out_date": (date.today() + timedelta(days=23)).isoformat(),
            "guests": 2
        },
        headers=cust_headers
    )
    assert res1.status_code == 201
    booking1_id = res1.json()["id"]

    # 2. Book room in Org 2 (room_id: 3 in Hotel 2)
    res2 = client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "check_in_date": (date.today() + timedelta(days=25)).isoformat(),
            "check_out_date": (date.today() + timedelta(days=28)).isoformat(),
            "guests": 2
        },
        headers=cust_headers
    )
    assert res2.status_code == 201
    booking2_id = res2.json()["id"]

    # 3. Org 1 Admin fetches bookings
    org1_bookings = client.get("/api/bookings", headers=admin1_headers).json()
    org1_ids = [b["id"] for b in org1_bookings]
    assert booking1_id in org1_ids
    assert booking2_id not in org1_ids, "DATA LEAK: Org 1 Admin saw Org 2 booking!"

    # 4. Org 2 Admin fetches bookings
    org2_bookings = client.get("/api/bookings", headers=admin2_headers).json()
    org2_ids = [b["id"] for b in org2_bookings]
    assert booking2_id in org2_ids
    assert booking1_id not in org2_ids, "DATA LEAK: Org 2 Admin saw Org 1 booking!"

def test_org_admin_cannot_review_cancellation_of_another_org(
    client: TestClient,
    customer_token: str,
    admin_token: str
):
    """
    Customer books room in Org 2 (room_id: 3) for today and requests cancellation (PENDING_CANCELLATION).
    Org 1 Admin attempts to approve Org 2's cancellation.
    Must receive 403 Forbidden.
    """
    cust_headers = {"Authorization": f"Bearer {customer_token}"}
    admin1_headers = {"Authorization": f"Bearer {admin_token}"}

    # Book room in Org 2 for today (so cancellation within 24h creates PENDING_CANCELLATION)
    check_in = date.today()
    check_out = date.today() + timedelta(days=2)
    book_res = client.post(
        "/api/bookings",
        json={
            "room_id": 3,
            "check_in_date": check_in.isoformat(),
            "check_out_date": check_out.isoformat(),
            "guests": 2
        },
        headers=cust_headers
    )
    assert book_res.status_code == 201
    booking_id = book_res.json()["id"]

    # Customer cancels
    cancel_res = client.post(f"/api/bookings/{booking_id}/cancel", headers=cust_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "PENDING_CANCELLATION"

    # Org 1 Admin tries to approve Org 2's cancellation
    review_res = client.post(
        f"/api/bookings/{booking_id}/review-cancellation",
        json={"action": "approve"},
        headers=admin1_headers
    )
    assert review_res.status_code == 403
    assert "another organization" in review_res.json()["detail"]
