from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.chatbot import ChatMessageRequest, ChatMessageResponse
from app.services.auth_service import get_current_user
from app.services.chatbot_service import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])

@router.post("/message", response_model=ChatMessageResponse)
def handle_chat_message(
    chat_in: ChatMessageRequest,
    db: Session = Depends(get_db),
    # Strict Authentication: Customer identity is derived exclusively from JWT
    current_user: User = Depends(get_current_user)
):
    """
    Process natural-language booking inquiries, room availability queries,
    multi-turn reservations, booking lookups, and cancellations.
    Connected directly to authoritative database records with zero hallucination.
    """
    response = chatbot_service.process_message(
        db=db,
        current_user=current_user,
        message=chat_in.message,
        conversation_id=chat_in.conversation_id
    )
    return response
