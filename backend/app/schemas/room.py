from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class RoomBase(BaseModel):
    room_number: str
    room_type: str
    capacity: int = Field(..., ge=1)
    price_per_night: float = Field(..., gt=0)
    availability_status: str = Field(default="active", pattern="^(active|inactive|maintenance)$")
    description: Optional[str] = None
    amenities: Optional[str] = None

class RoomCreate(RoomBase):
    hotel_id: int

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    capacity: Optional[int] = Field(None, ge=1)
    price_per_night: Optional[float] = Field(None, gt=0)
    availability_status: Optional[str] = Field(None, pattern="^(active|inactive|maintenance)$")
    description: Optional[str] = None
    amenities: Optional[str] = None

class RoomStatusUpdate(BaseModel):
    availability_status: str = Field(..., pattern="^(active|inactive|maintenance)$")

class RoomOut(RoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hotel_id: int

class RoomSearchResult(RoomOut):
    is_available: bool = True

