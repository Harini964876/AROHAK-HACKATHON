import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

def test_customer_dashboard_categorization(client: TestClient, customer_token: str):
    """
    Test customer dashboard category filtering:
    - Upcoming (check_in >= today and status == CONFIRMED)
    - Completed (check_out < today or status == COMPLETED)
    - Cancelled (status in CANCELLED, PENDING_CANCELLATION)
    """
    headers = {"Authorization": f"Bearer {customer_token}"}

    # 1. Create upcoming booking (15 days in future)
    res_up = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "check_in_date": (date.today() + timedelta(days=15)).isoformat(),
            "check_out_date": (date.today() + timedelta(days=18)).isoformat(),
            "guests": 2
        },
        headers=headers
    )
    assert res_up.status_code == 201
    up_id = res_up.json()["id"]

    # 2. Query upcoming
    up_bookings = client.get("/api/bookings/my?category=upcoming", headers=headers).json()
    up_ids = [b["id"] for b in up_bookings]
    assert up_id in up_ids

    # 3. Cancel the booking
    client.post(f"/api/bookings/{up_id}/cancel", headers=headers)

    # 4. Query cancelled
    cancelled_bookings = client.get("/api/bookings/my?category=cancelled", headers=headers).json()
    can_ids = [b["id"] for b in cancelled_bookings]
    assert up_id in can_ids

    # 5. Assert it's no longer in upcoming
    up_bookings_after = client.get("/api/bookings/my?category=upcoming", headers=headers).json()
    up_ids_after = [b["id"] for b in up_bookings_after]
    assert up_id not in up_ids_after

def test_staff_dashboard_search_and_filters(
    client: TestClient,
    customer_token: str,
    admin_token: str
):
    """
    Test Staff dashboard advanced filters:
    - Search by customer name/email
    - Filter by hotel_id
    - Filter by status
    - Mark as COMPLETED
    """
    cust_headers = {"Authorization": f"Bearer {customer_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create a booking in Hotel 1
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "check_in_date": (date.today() + timedelta(days=35)).isoformat(),
            "check_out_date": (date.today() + timedelta(days=38)).isoformat(),
            "guests": 2
        },
        headers=cust_headers
    )
    assert res.status_code == 201
    b_id = res.json()["id"]

    # 1. Filter by status=CONFIRMED
    confirmed = client.get("/api/bookings?status_filter=CONFIRMED", headers=admin_headers).json()
    assert b_id in [b["id"] for b in confirmed]

    # 2. Filter by hotel_id=1
    h1_bookings = client.get("/api/bookings?hotel_id=1", headers=admin_headers).json()
    assert b_id in [b["id"] for b in h1_bookings]

    # 3. Search by customer email
    searched = client.get("/api/bookings?customer_query=cust_test", headers=admin_headers).json()
    assert b_id in [b["id"] for b in searched]

    # 4. Mark as completed
    comp_res = client.post(f"/api/bookings/{b_id}/complete", headers=admin_headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"

    # 5. Verify it now appears under status_filter=COMPLETED
    completed_list = client.get("/api/bookings?status_filter=COMPLETED", headers=admin_headers).json()
    assert b_id in [b["id"] for b in completed_list]
