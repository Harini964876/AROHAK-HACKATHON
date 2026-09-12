from app.routers.auth import router as auth_router
from app.routers.hotels import router as hotels_router
from app.routers.rooms import router as rooms_router
from app.routers.bookings import router as bookings_router
from app.routers.organizations import router as organizations_router
from app.routers.chatbot import router as chatbot_router

__all__ = ["auth_router", "hotels_router", "rooms_router", "bookings_router", "organizations_router", "chatbot_router"]

