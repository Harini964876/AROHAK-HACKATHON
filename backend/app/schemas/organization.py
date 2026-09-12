from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from app.schemas.hotel import HotelOut

class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationOut(OrganizationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    hotels: Optional[List[HotelOut]] = None

class StaffCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters with letters and numbers/symbols")
    role: str = Field(default="receptionist", pattern="^(admin|receptionist)$")

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        has_letter = any(c.isalpha() for c in v)
        has_digit_or_symbol = any(c.isdigit() or not c.isalnum() for c in v)
        if not (has_letter and has_digit_or_symbol):
            raise ValueError("Password must contain at least one letter and at least one digit or special character.")
        return v

class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    organization_id: Optional[int] = None
