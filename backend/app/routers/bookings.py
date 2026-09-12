from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Booking
from app.models.user import User
from app.models.room import Room
from app.schemas.booking import (
    BookingCreate,
    BookingOut,
    BookingCancelResponse,
    BookingReviewRequest
)
from app.services.auth_service import get_current_user, require_role
from app.services.booking_service import (
    create_booking_concurrency_safe,
    process_cancellation,
    review_cancellation
)

router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["customer", "admin"]))
):
    """
    Create a new booking using concurrency-safe transaction locking.
    Prevents race conditions / double bookings under simultaneous requests.
    """
    booking = create_booking_concurrency_safe(
        db=db,
        customer_id=current_user.id,
        booking_in=booking_in
    )
    return booking

@router.get("/my", response_model=List[BookingOut])
def get_my_bookings(
    category: Optional[str] = Query(None, description="Filter: 'upcoming', 'completed', 'cancelled'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve bookings belonging to the currently logged-in customer.
    Supports dashboard categorization: upcoming, completed, cancelled.
    """
    today = date.today()
    query = db.query(Booking).filter(Booking.customer_id == current_user.id)

    if category == "upcoming":
        query = query.filter(Booking.status == "CONFIRMED", Booking.check_in_date >= today)
    elif category == "completed":
        query = query.filter(
            (Booking.status == "COMPLETED") |
            ((Booking.status == "CONFIRMED") & (Booking.check_out_date < today))
        )
    elif category == "cancelled":
        query = query.filter(Booking.status.in_(["CANCELLED", "PENDING_CANCELLATION"]))

    return query.order_by(Booking.check_in_date.desc()).all()

@router.get("", response_model=List[BookingOut])
def list_all_bookings(
    status_filter: Optional[str] = Query(None),
    hotel_id: Optional[int] = Query(None),
    customer_query: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    # RBAC: Staff and Admin only.
    current_staff: User = Depends(require_role(["admin", "receptionist"]))
):
    """
    Retrieve all bookings across the staff's organization.
    Strict Tenant Isolation: Enforces query filter on current_staff.organization_id.
    """
    query = db.query(Booking).filter(Booking.organization_id == current_staff.organization_id)

    if status_filter and status_filter != "ALL":
        query = query.filter(Booking.status == status_filter)
    if hotel_id:
        query = query.filter(Booking.hotel_id == hotel_id)
    if start_date:
        query = query.filter(Booking.check_in_date >= start_date)
    if end_date:
        query = query.filter(Booking.check_out_date <= end_date)
    if customer_query:
        query = query.join(User, Booking.customer_id == User.id).filter(
            (User.name.ilike(f"%{customer_query}%")) | (User.email.ilike(f"%{customer_query}%"))
        )

    return query.order_by(Booking.check_in_date.desc()).all()

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking_details(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a single booking.
    Customer can only see their own; Staff can only see their organization's bookings.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found."
        )

    if current_user.role == "customer" and booking.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this booking."
        )

    if current_user.role in ["admin", "receptionist"] and booking.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view bookings from another organization."
        )

    return booking

@router.post("/{booking_id}/cancel", response_model=BookingCancelResponse)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a booking according to hotel cancellation policy:
    - If > 24 hours prior to check-in: directly CANCELLED.
    - If <= 24 hours prior to check-in: PENDING_CANCELLATION (awaits staff approval).
    - Already CANCELLED bookings cannot be cancelled again.
    """
    return process_cancellation(
        db=db,
        booking_id=booking_id,
        user_id=current_user.id,
        user_role=current_user.role
    )

@router.post("/{booking_id}/review-cancellation", response_model=BookingOut)
def staff_review_cancellation(
    booking_id: int,
    review_in: BookingReviewRequest,
    db: Session = Depends(get_db),
    # RBAC: Staff and Admin only.
    current_staff: User = Depends(require_role(["admin", "receptionist"]))
):
    """
    Approve or reject a booking in PENDING_CANCELLATION state.
    Strict Tenant Isolation: Verifies the booking belongs to current_staff.organization_id.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found."
        )

    if booking.organization_id != current_staff.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot manage cancellation requests for another organization."
        )

    return review_cancellation(
        db=db,
        booking_id=booking_id,
        action=review_in.action
    )

@router.post("/{booking_id}/complete", response_model=BookingOut)
def staff_mark_completed(
    booking_id: int,
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_role(["admin", "receptionist"]))
):
    """
    Mark a stay as COMPLETED.
    Strict Tenant Isolation: Scoped to staff's organization.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found."
        )

    if booking.organization_id != current_staff.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify bookings for another organization."
        )

    if booking.status != "CONFIRMED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete a booking with status '{booking.status}'."
        )

    booking.status = "COMPLETED"
    db.commit()
    db.refresh(booking)
    return booking
