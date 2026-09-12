import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

def test_direct_cancellation_outside_24_hours(client: TestClient, customer_token: str):
    """
    Booking check-in is > 24 hours away.
    Customer can cancel directly -> status becomes CANCELLED.
    """
    headers = {"Authorization": f"Bearer {customer_token}"}
    check_in = date.today() + timedelta(days=10)
    check_out = date.today() + timedelta(days=13)

    # 1. Create booking
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
    booking_id = res.json()["id"]

    # 2. Cancel booking
    cancel_res = client.post(f"/api/bookings/{booking_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    data = cancel_res.json()
    assert data["status"] == "CANCELLED"
    assert data["requires_approval"] is False

    # 3. Double cancellation attempt should fail with 400
    re_cancel = client.post(f"/api/bookings/{booking_id}/cancel", headers=headers)
    assert re_cancel.status_code == 400
    assert "already CANCELLED" in re_cancel.json()["detail"]

def test_pending_cancellation_within_24_hours(
    client: TestClient,
    customer_token: str,
    receptionist_token: str
):
    """
    Booking check-in is within 24 hours (e.g. today).
    Cancellation sets status to PENDING_CANCELLATION, requiring staff approval.
    """
    headers_cust = {"Authorization": f"Bearer {customer_token}"}
    headers_staff = {"Authorization": f"Bearer {receptionist_token}"}
    
    check_in = date.today()
    check_out = date.today() + timedelta(days=2)

    # 1. Create booking
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "check_in_date": check_in.isoformat(),
            "check_out_date": check_out.isoformat(),
            "guests": 2
        },
        headers=headers_cust
    )
    assert res.status_code == 201
    booking_id = res.json()["id"]

    # 2. Customer cancels within 24h
    cancel_res = client.post(f"/api/bookings/{booking_id}/cancel", headers=headers_cust)
    assert cancel_res.status_code == 200
    data = cancel_res.json()
    assert data["status"] == "PENDING_CANCELLATION"
    assert data["requires_approval"] is True

    # 3. Staff approves cancellation
    review_res = client.post(
        f"/api/bookings/{booking_id}/review-cancellation",
        json={"action": "approve"},
        headers=headers_staff
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "CANCELLED"

def test_staff_rejection_reverts_cancellation(
    client: TestClient,
    customer_token: str,
    admin_token: str
):
    """
    Staff rejects cancellation -> status reverts back to CONFIRMED.
    """
    headers_cust = {"Authorization": f"Bearer {customer_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    check_in = date.today()
    check_out = date.today() + timedelta(days=1)

    # 1. Create booking on room 1 (after previous was cancelled)
    res = client.post(
        "/api/bookings",
        json={
            "room_id": 1,
            "check_in_date": check_in.isoformat(),
            "check_out_date": check_out.isoformat(),
            "guests": 1
        },
        headers=headers_cust
    )
    assert res.status_code == 201
    booking_id = res.json()["id"]

    # 2. Customer cancels within 24h
    cancel_res = client.post(f"/api/bookings/{booking_id}/cancel", headers=headers_cust)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "PENDING_CANCELLATION"

    # 3. Admin rejects cancellation
    reject_res = client.post(
        f"/api/bookings/{booking_id}/review-cancellation",
        json={"action": "reject"},
        headers=headers_admin
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "CONFIRMED"
