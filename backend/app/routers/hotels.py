from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.hotel import Hotel
from app.models.user import User
from app.schemas.hotel import HotelOut, HotelUpdate
from app.services.auth_service import require_role

router = APIRouter(prefix="/hotels", tags=["Hotels"])

@router.get("", response_model=List[HotelOut])
def list_hotels(db: Session = Depends(get_db)):
    """
    List all active hotels.
    """
    return db.query(Hotel).all()

@router.get("/{hotel_id}", response_model=HotelOut)
def get_hotel(hotel_id: int, db: Session = Depends(get_db)):
    """
    Retrieve specific hotel details.
    """
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hotel with id {hotel_id} not found."
        )
    return hotel

@router.put("/{hotel_id}", response_model=HotelOut)
def update_hotel(
    hotel_id: int,
    hotel_in: HotelUpdate,
    db: Session = Depends(get_db),
    # Strict RBAC: Only Admin can update hotel information
    current_admin: User = Depends(require_role(["admin"]))
):
    """
    Update hotel information. Restricted strictly to Admin.
    """
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hotel with id {hotel_id} not found."
        )

    # Multi-Org Tenant Isolation
    if current_admin.organization_id and hotel.organization_id != current_admin.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify a hotel belonging to another organization."
        )

    for field, value in hotel_in.model_dump(exclude_unset=True).items():
        setattr(hotel, field, value)

    db.commit()
    db.refresh(hotel)
    return hotel
