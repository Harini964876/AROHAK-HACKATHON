from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

class HotelBase(BaseModel):
    name: str
    address: str
    city: str
    description: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    status: str = "active"

class HotelCreate(HotelBase):
    organization_id: int

class HotelUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[str] = None

class HotelOut(HotelBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int

