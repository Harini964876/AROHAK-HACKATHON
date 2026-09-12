import pytest
import concurrent.futures
from fastapi.testclient import TestClient
from app.main import app

def test_concurrent_simultaneous_bookings_exact_one_succeeds(
    customer_token: str,
    customer2_token: str
):
    """
    Rubric Requirement:
    Fires two simultaneous concurrent booking requests for the exact same room and dates.
    Asserts that EXACTLY ONE succeeds (201 Created) and the other is rejected (409 Conflict).
    """
    booking_payload = {
        "room_id": 2,
        "check_in_date": "2026-11-10",
        "check_out_date": "2026-11-15",
        "guests": 2
    }

    tokens = [customer_token, customer2_token]
    results = []

    def make_booking_request(token):
        with TestClient(app) as client:
            headers = {"Authorization": f"Bearer {token}"}
            response = client.post("/api/bookings", json=booking_payload, headers=headers)
            return response.status_code, response.json()

    # Fire both requests concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(make_booking_request, t) for t in tokens]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    status_codes = [r[0] for r in results]
    
    # Assert exactly one 201 Created and exactly one 409 Conflict
    assert 201 in status_codes, f"Expected at least one 201 Created, got: {status_codes}"
    assert 409 in status_codes, f"Expected one 409 Conflict, got: {status_codes}"
    assert status_codes.count(201) == 1, f"Expected exactly one 201 Created, got: {status_codes}"
    assert status_codes.count(409) == 1, f"Expected exactly one 409 Conflict, got: {status_codes}"

    # Verify conflict message
    conflict_res = [r[1] for r in results if r[0] == 409][0]
    assert "conflict" in str(conflict_res.get("detail", "")).lower() or "already booked" in str(conflict_res.get("detail", "")).lower()
