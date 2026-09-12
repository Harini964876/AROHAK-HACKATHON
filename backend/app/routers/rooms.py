from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.room import Room
from app.models.hotel import Hotel
from app.models.user import User
from app.schemas.room import (
    RoomOut,
    RoomCreate,
    RoomUpdate,
    RoomStatusUpdate,
    RoomSearchResult
)
from app.services.auth_service import require_role
from app.services.booking_service import search_available_rooms, check_room_availability

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("/search", response_model=List[RoomSearchResult])
def search_rooms(
    check_in: date = Query(..., description="Check-in date (YYYY-MM-DD)"),
    check_out: date = Query(..., description="Check-out date (YYYY-MM-DD)"),
    guests: int = Query(1, ge=1, description="Number of guests"),
    hotel_id: Optional[int] = Query(None, description="Optional hotel ID filter"),
    city: Optional[str] = Query(None, description="Optional city filter"),
    db: Session = Depends(get_db)
):
    """
    Search rooms dynamically computed against existing CONFIRMED and PENDING_CANCELLATION bookings.
    Only returns rooms that are:
    1. active (inactive/maintenance rooms are strictly excluded)
    2. belonging to active hotels
    3. have capacity >= guests
    4. have NO overlapping bookings during [check_in, check_out]
    """
    rooms = search_available_rooms(
        db=db,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        hotel_id=hotel_id,
        city=city
    )
    return [RoomSearchResult.model_validate(r) for r in rooms]

@router.get("", response_model=List[RoomOut])
def list_rooms(
    hotel_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List all rooms, optionally filtered by hotel_id or status.
    """
    query = db.query(Room)
    if hotel_id:
        query = query.filter(Room.hotel_id == hotel_id)
    if status_filter:
        query = query.filter(Room.availability_status == status_filter)
    return query.all()

@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: int, db: Session = Depends(get_db)):
    """
    Retrieve single room details.
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found."
        )
    return room

@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    room_in: RoomCreate,
    db: Session = Depends(get_db),
    # =========================================================================
    # ROLE BOUNDARY: Only ADMIN can add new rooms to the system.
    # Receptionists and Customers are forbidden (403).
    # =========================================================================
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Add a new room to a hotel.
    RBAC: ADMIN ONLY.
    """
    hotel = db.query(Hotel).filter(Hotel.id == room_in.hotel_id).first()
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hotel with id {room_in.hotel_id} does not exist."
        )

    # Multi-Org Tenant Isolation: Admin can only manage rooms in their own organization
    if current_user.organization_id and hotel.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot add rooms to a hotel in another organization."
        )

    # Check for duplicate room number in the same hotel
    existing = db.query(Room).filter(
        Room.hotel_id == room_in.hotel_id,
        Room.room_number == room_in.room_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room number {room_in.room_number} already exists in this hotel."
        )

    room = Room(**room_in.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    room_in: RoomUpdate,
    db: Session = Depends(get_db),
    # =========================================================================
    # ROLE BOUNDARY: Only ADMIN can modify room specifications
    # (pricing, capacity, type, amenities, room number).
    # Receptionists CANNOT modify room definitions.
    # =========================================================================
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Modify room specifications (capacity, price, room number, type, etc.).
    RBAC: ADMIN ONLY.
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found."
        )

    # Multi-Org Tenant Isolation
    if current_user.organization_id and room.hotel.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify rooms belonging to another organization."
        )

    for field, value in room_in.model_dump(exclude_unset=True).items():
        setattr(room, field, value)

    db.commit()
    db.refresh(room)
    return room

@router.patch("/{room_id}/status", response_model=RoomOut)
def update_room_status(
    room_id: int,
    status_in: RoomStatusUpdate,
    db: Session = Depends(get_db),
    # =========================================================================
    # ROLE BOUNDARY: Both ADMIN and RECEPTIONIST can manage room operational
    # availability status (active, inactive, maintenance).
    # Customers are strictly forbidden.
    # =========================================================================
    current_user: User = Depends(require_role(["admin", "receptionist"]))
):
    """
    Toggle or update room operational status (active, inactive, maintenance).
    RBAC: ADMIN and RECEPTIONIST.
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found."
        )

    # Multi-Org Tenant Isolation
    if current_user.organization_id and room.hotel.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify room status for another organization."
        )

    room.availability_status = status_in.availability_status
    db.commit()
    db.refresh(room)
    return room

