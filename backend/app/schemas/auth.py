from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters with letters and numbers/symbols")
    # Allowed in schema to preserve backwards-compatibility with test payloads,
    # but strictly ignored and forced to role='customer' and organization_id=None server-side.
    role: Optional[str] = "customer"
    organization_id: Optional[int] = None

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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    organization_id: Optional[int] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None
