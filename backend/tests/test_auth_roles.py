import pytest
from fastapi.testclient import TestClient

def test_unauthenticated_access_denied(client: TestClient):
    """Confirm 401 Unauthorized when hitting protected endpoints without token."""
    res = client.get("/api/bookings")
    assert res.status_code == 401

    res = client.post("/api/rooms", json={})
    assert res.status_code == 401

def test_customer_cannot_create_room(client: TestClient, customer_token: str):
    """Confirm Customer receives 403 when trying to add a room."""
    headers = {"Authorization": f"Bearer {customer_token}"}
    room_payload = {
        "hotel_id": 1,
        "room_number": "999",
        "room_type": "Hacker Suite",
        "capacity": 2,
        "price_per_night": 200.0,
        "availability_status": "active"
    }
    res = client.post("/api/rooms", json=room_payload, headers=headers)
    assert res.status_code == 403
    assert "lacks permission" in res.json()["detail"]

def test_receptionist_cannot_create_room(client: TestClient, receptionist_token: str):
    """
    Confirm Receptionist receives 403 when trying to add a room.
    Rubric Boundary: Receptionists manage rooms & bookings, but cannot modify room/hotel info like Admin.
    """
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    room_payload = {
        "hotel_id": 1,
        "room_number": "998",
        "room_type": "Staff Suite",
        "capacity": 2,
        "price_per_night": 150.0,
        "availability_status": "active"
    }
    res = client.post("/api/rooms", json=room_payload, headers=headers)
    assert res.status_code == 403
    assert "lacks permission" in res.json()["detail"]

def test_receptionist_cannot_update_room_info(client: TestClient, receptionist_token: str):
    """
    Confirm Receptionist receives 403 when trying to update room core information (PUT /rooms/{id}).
    """
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    res = client.put("/api/rooms/1", json={"price_per_night": 999.0}, headers=headers)
    assert res.status_code == 403

def test_customer_cannot_view_all_hotel_bookings(client: TestClient, customer_token: str):
    """Confirm Customer receives 403 when trying to view global hotel bookings."""
    headers = {"Authorization": f"Bearer {customer_token}"}
    res = client.get("/api/bookings", headers=headers)
    assert res.status_code == 403

def test_customer_cannot_update_room_status(client: TestClient, customer_token: str):
    """Confirm Customer receives 403 when trying to change room status."""
    headers = {"Authorization": f"Bearer {customer_token}"}
    res = client.patch("/api/rooms/1/status", json={"availability_status": "maintenance"}, headers=headers)
    assert res.status_code == 403

def test_admin_can_create_room(client: TestClient, admin_token: str):
    """Confirm Admin can successfully create a new room (201 Created)."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    room_payload = {
        "hotel_id": 1,
        "room_number": "A501",
        "room_type": "Presidential Penthouse",
        "capacity": 4,
        "price_per_night": 450.0,
        "availability_status": "active",
        "description": "Exclusive penthouse suite",
        "amenities": "Jacuzzi, Ocean View, Private Chef"
    }
    res = client.post("/api/rooms", json=room_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["room_number"] == "A501"
    assert data["price_per_night"] == 450.0

def test_receptionist_can_update_room_operational_status(client: TestClient, receptionist_token: str):
    """Confirm Receptionist can toggle room operational status (maintenance/active)."""
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    res = client.patch("/api/rooms/1/status", json={"availability_status": "maintenance"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["availability_status"] == "maintenance"

    # Revert back to active
    res = client.patch("/api/rooms/1/status", json={"availability_status": "active"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["availability_status"] == "active"
