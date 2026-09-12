from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.room import RoomOut
from app.schemas.hotel import HotelOut

class BookingCreate(BaseModel):
    room_id: int
    check_in_date: date
    check_out_date: date
    guests: int = Field(..., ge=1)

class CustomerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str

class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    organization_id: int
    hotel_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    guests: int
    booking_date: datetime
    total_amount: float
    status: str
    customer: Optional[CustomerSummary] = None
    hotel: Optional[HotelOut] = None
    room: Optional[RoomOut] = None

class BookingCancelResponse(BaseModel):
    booking_id: int
    status: str
    message: str
    requires_approval: bool

class BookingReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")

