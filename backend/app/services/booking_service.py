from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy import text, and_, or_, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.booking import Booking
from app.models.room import Room
from app.models.hotel import Hotel
from app.schemas.booking import BookingCreate, BookingCancelResponse

def check_room_availability(
    db: Session,
    room_id: int,
    check_in: date,
    check_out: date
) -> bool:
    """
    Check if a room is available for the given date range.
    Returns True if no overlapping CONFIRMED or PENDING_CANCELLATION bookings exist.
    """
    if check_out <= check_in:
        return False

    overlapping_booking = (
        db.query(Booking)
        .filter(
            Booking.room_id == room_id,
            Booking.status.in_(["CONFIRMED", "PENDING_CANCELLATION"]),
            Booking.check_in_date < check_out,
            Booking.check_out_date > check_in,
        )
        .first()
    )
    return overlapping_booking is None

def search_available_rooms(
    db: Session,
    check_in: date,
    check_out: date,
    guests: int,
    hotel_id: Optional[int] = None,
    city: Optional[str] = None
) -> List[Room]:
    """
    Search available rooms matching dates, capacity, and active status.
    """
    if check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be after check-in date."
        )

    # Subquery for booked room IDs during this window
    booked_room_ids = (
        select(Booking.room_id)
        .filter(
            Booking.status.in_(["CONFIRMED", "PENDING_CANCELLATION"]),
            Booking.check_in_date < check_out,
            Booking.check_out_date > check_in,
        )
    )

    query = (
        db.query(Room)
        .join(Hotel, Room.hotel_id == Hotel.id)
        .filter(
            Room.availability_status == "active",
            Hotel.status == "active",
            Room.capacity >= guests,
            Room.id.notin_(booked_room_ids)
        )
    )

    if hotel_id:
        query = query.filter(Room.hotel_id == hotel_id)
    if city:
        query = query.filter(Hotel.city.ilike(f"%{city}%"))

    return query.all()

def create_booking_concurrency_safe(
    db: Session,
    customer_id: int,
    booking_in: BookingCreate
) -> Booking:
    """
    Creates a booking inside a locked transaction.
    Guarantees that simultaneous requests for the exact same room and dates
    are serialized so that only one can succeed and the other receives a 409 Conflict.
    """
    if booking_in.check_out_date <= booking_in.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be after check-in date."
        )

    # Ensure transaction has a write lock. In SQLite, BEGIN IMMEDIATE reserves the write lock upfront.
    connection = db.connection()
    try:
        connection.execute(text("BEGIN IMMEDIATE"))
    except Exception:
        # Already inside a transaction or dialect differences
        pass

    try:
        # 1. Fetch room details
        room = db.query(Room).filter(Room.id == booking_in.room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {booking_in.room_id} does not exist."
            )

        if room.availability_status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room {room.room_number} is currently {room.availability_status} and cannot be booked."
            )

        if room.capacity < booking_in.guests:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room capacity ({room.capacity}) is less than requested guests ({booking_in.guests})."
            )

        # 2. Strict overlap check inside the locked transaction
        overlap = (
            db.query(Booking)
            .filter(
                Booking.room_id == booking_in.room_id,
                Booking.status.in_(["CONFIRMED", "PENDING_CANCELLATION"]),
                Booking.check_in_date < booking_in.check_out_date,
                Booking.check_out_date > booking_in.check_in_date,
            )
            .first()
        )

        if overlap is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Booking conflict: Room is already booked for the selected dates."
            )

        # 3. Calculate nights and total amount
        nights = (booking_in.check_out_date - booking_in.check_in_date).days
        total_amount = round(nights * room.price_per_night, 2)

        # 4. Insert booking
        booking = Booking(
            customer_id=customer_id,
            organization_id=room.hotel.organization_id,
            hotel_id=room.hotel_id,
            room_id=room.id,
            check_in_date=booking_in.check_in_date,
            check_out_date=booking_in.check_out_date,
            guests=booking_in.guests,
            booking_date=datetime.utcnow(),
            total_amount=total_amount,
            status="CONFIRMED"
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return booking

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        # Handle SQLite locked/busy error as conflict under heavy concurrency
        if "locked" in str(exc).lower() or "busy" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Booking conflict: Resource busy due to concurrent booking attempt. Please retry."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process booking: {str(exc)}"
        )

def process_cancellation(
    db: Session,
    booking_id: int,
    user_id: int,
    user_role: str
) -> BookingCancelResponse:
    """
    Handles booking cancellation according to the 24-hour policy:
    - Customer can cancel directly if > 24 hours before check-in.
    - If <= 24 hours, creates a PENDING_CANCELLATION state requiring staff approval.
    - An already CANCELLED booking cannot be cancelled again.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found."
        )

    # Authorization check: customers can only cancel their own bookings
    if user_role == "customer" and booking.customer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to cancel this booking."
        )

    if booking.status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already CANCELLED and cannot be cancelled again."
        )

    if booking.status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed bookings cannot be cancelled."
        )

    if booking.status == "PENDING_CANCELLATION":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A cancellation request for this booking is already pending staff approval."
        )

    # Check-in datetime calculation (assuming standard check-in at 14:00 on check-in day)
    check_in_dt = datetime.combine(booking.check_in_date, datetime.min.time()) + timedelta(hours=14)
    now = datetime.utcnow()
    hours_until_checkin = (check_in_dt - now).total_seconds() / 3600.0

    # Staff/Admin cancelling directly always succeeds
    if user_role in ["admin", "receptionist"]:
        booking.status = "CANCELLED"
        db.commit()
        return BookingCancelResponse(
            booking_id=booking.id,
            status="CANCELLED",
            message="Booking cancelled by staff.",
            requires_approval=False
        )

    # Customer 24-hour boundary rule
    if hours_until_checkin > 24.0:
        booking.status = "CANCELLED"
        db.commit()
        return BookingCancelResponse(
            booking_id=booking.id,
            status="CANCELLED",
            message="Booking cancelled successfully under the free cancellation policy.",
            requires_approval=False
        )
    else:
        booking.status = "PENDING_CANCELLATION"
        db.commit()
        return BookingCancelResponse(
            booking_id=booking.id,
            status="PENDING_CANCELLATION",
            message="Cancellation requested within 24 hours of check-in. It is pending staff approval.",
            requires_approval=True
        )

def review_cancellation(
    db: Session,
    booking_id: int,
    action: str
) -> Booking:
    """
    Staff review for PENDING_CANCELLATION bookings.
    action: 'approve' -> CANCELLED, 'reject' -> reverts to CONFIRMED.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found."
        )

    if booking.status != "PENDING_CANCELLATION":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking is not pending cancellation (current status: {booking.status})."
        )

    if action == "approve":
        booking.status = "CANCELLED"
    elif action == "reject":
        booking.status = "CONFIRMED"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'approve' or 'reject'."
        )

    db.commit()
    db.refresh(booking)
    return booking
