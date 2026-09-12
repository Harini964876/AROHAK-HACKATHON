from datetime import date
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="The user natural-language chat message")
    conversation_id: Optional[str] = Field(None, description="Optional conversation session ID for multi-turn flow")

class ChatMessageResponse(BaseModel):
    reply: str
    intent: str
    conversation_id: str
    data: Optional[Dict[str, Any]] = None

class ExtractedIntent(BaseModel):
    intent: str  # SEARCH_ROOMS, CHECK_AVAILABILITY, PROPOSE_BOOKING, CONFIRM_BOOKING, GET_MY_BOOKINGS, GET_BOOKING_DETAILS, CANCEL_BOOKING, GENERAL_HOTEL_QUERY, UNKNOWN
    location: Optional[str] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests: Optional[int] = None
    room_number: Optional[str] = None
    room_id: Optional[int] = None
    booking_id: Optional[int] = None
    confirmed: Optional[bool] = None
    raw_query: Optional[str] = None
