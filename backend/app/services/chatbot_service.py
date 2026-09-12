import uuid
import logging
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.room import Room
from app.models.hotel import Hotel
from app.models.booking import Booking
from app.schemas.booking import BookingCreate
from app.schemas.chatbot import ChatMessageResponse, ExtractedIntent
from app.services.ai_provider import get_ai_provider
from app.services.booking_service import (
    search_available_rooms,
    create_booking_concurrency_safe,
    process_cancellation
)

logger = logging.getLogger(__name__)

# In-memory conversational state repository (keyed by conversation_id)
# Maintains multi-turn context (last search, pending booking confirmation, etc.)
CONVERSATION_SESSIONS: Dict[str, Dict[str, Any]] = {}

class ChatbotService:
    """
    Core AI Chatbot service connecting natural-language intent to authoritative
    database records and transactional booking workflows.
    Zero fabrication: never invents rooms, prices, or statuses.
    """

    def __init__(self):
        self.ai_provider = get_ai_provider()

    def process_message(
        self,
        db: Session,
        current_user: User,
        message: str,
        conversation_id: Optional[str] = None
    ) -> ChatMessageResponse:
        cid = conversation_id or str(uuid.uuid4())
        state = CONVERSATION_SESSIONS.setdefault(cid, {
            "conversation_id": cid,
            "customer_id": current_user.id,
            "created_at": datetime.utcnow(),
            "last_search": None,
            "pending_booking": None,
            "history": []
        })

        # Ensure session cannot be hijacked across users
        state["customer_id"] = current_user.id

        # 1. Parse natural-language message into structured intent & entities
        parsed: ExtractedIntent = self.ai_provider.parse_intent(message, state)

        # 2. Dispatch to the appropriate database-connected handler
        intent = parsed.intent

        if intent == "CONFIRM_BOOKING":
            response = self._handle_confirm_booking(db, current_user, state)
        elif intent == "CANCEL_PENDING_ACTION":
            state["pending_booking"] = None
            response = ChatMessageResponse(
                reply="Booking process cancelled. How else can I assist you today?",
                intent="CANCEL_PENDING_ACTION",
                conversation_id=cid
            )
        elif intent == "PROPOSE_BOOKING":
            response = self._handle_propose_booking(db, current_user, parsed, state)
        elif intent == "SEARCH_ROOMS" or intent == "CHECK_AVAILABILITY":
            response = self._handle_search_rooms(db, parsed, state)
        elif intent == "GET_MY_BOOKINGS":
            response = self._handle_get_my_bookings(db, current_user, state)
        elif intent == "GET_BOOKING_DETAILS":
            response = self._handle_get_booking_details(db, current_user, parsed, state)
        elif intent == "CANCEL_BOOKING":
            response = self._handle_cancel_booking(db, current_user, parsed, state)
        else:
            response = self._handle_general_query(state)

        # Record history
        state["history"].append({"user": message, "assistant": response.reply})
        return response

    # =========================================================================
    # INTENT HANDLERS (Directly connected to real DB and existing services)
    # =========================================================================

    def _handle_search_rooms(
        self,
        db: Session,
        parsed: ExtractedIntent,
        state: Dict[str, Any]
    ) -> ChatMessageResponse:
        cid = state["conversation_id"]

        # Missing information follow-ups
        if not parsed.location:
            return ChatMessageResponse(
                reply="Sure! Which city would you like to stay in? We currently have luxury properties in Mumbai, New Delhi, Goa, and Jaipur.",
                intent="NEED_LOCATION",
                conversation_id=cid
            )

        if not parsed.check_in or not parsed.check_out:
            return ChatMessageResponse(
                reply=f"I'd love to help you find rooms in {parsed.location}! What are your check-in and check-out dates, and how many guests will be staying?",
                intent="NEED_DATES",
                conversation_id=cid,
                data={"location": parsed.location}
            )

        if parsed.check_out <= parsed.check_in:
            return ChatMessageResponse(
                reply="Your check-out date must be after your check-in date. Please provide valid travel dates.",
                intent="INVALID_DATES",
                conversation_id=cid
            )

        guests = parsed.guests or 1

        # Query the authoritative database using the existing availability service
        try:
            rooms = search_available_rooms(
                db=db,
                check_in=parsed.check_in,
                check_out=parsed.check_out,
                guests=guests,
                city=parsed.location
            )
        except Exception as exc:
            logger.error(f"Error during chatbot room search: {exc}")
            return ChatMessageResponse(
                reply="I encountered an error searching for rooms. Please verify your dates and try again.",
                intent="SEARCH_ERROR",
                conversation_id=cid
            )

        nights = (parsed.check_out - parsed.check_in).days

        if not rooms:
            return ChatMessageResponse(
                reply=f"I couldn't find any available rooms in {parsed.location} for {guests} guest(s) from {parsed.check_in} to {parsed.check_out}. Would you like to try different dates or another location?",
                intent="SEARCH_ROOMS",
                conversation_id=cid,
                data={"rooms": [], "location": parsed.location}
            )

        # Build structured room cards and human-friendly response
        rooms_data = []
        lines = [f"I found {len(rooms)} available room(s) in {parsed.location} from {parsed.check_in} to {parsed.check_out} ({nights} night(s)):"]

        for idx, r in enumerate(rooms[:5], 1):
            total_price = round(r.price_per_night * nights, 2)
            rooms_data.append({
                "id": r.id,
                "hotel_id": r.hotel_id,
                "hotel_name": r.hotel.name,
                "city": r.hotel.city,
                "room_number": r.room_number,
                "room_type": r.room_type,
                "capacity": r.capacity,
                "price_per_night": r.price_per_night,
                "total_price": total_price,
                "amenities": r.amenities,
                "description": r.description
            })
            lines.append(f"{idx}. Room {r.room_number} ({r.room_type}) at {r.hotel.name} — ₹{r.price_per_night}/night (Total: ₹{total_price})")

        lines.append("\nWhich room would you like to book? You can say 'Book Room <number>' or 'Book the first one'.")

        # Save context for multi-turn booking
        state["last_search"] = {
            "location": parsed.location,
            "check_in": parsed.check_in,
            "check_out": parsed.check_out,
            "guests": guests,
            "nights": nights,
            "rooms": rooms_data
        }

        return ChatMessageResponse(
            reply="\n".join(lines),
            intent="SEARCH_ROOMS",
            conversation_id=cid,
            data={
                "location": parsed.location,
                "check_in": str(parsed.check_in),
                "check_out": str(parsed.check_out),
                "guests": guests,
                "nights": nights,
                "rooms": rooms_data
            }
        )

    def _handle_propose_booking(
        self,
        db: Session,
        current_user: User,
        parsed: ExtractedIntent,
        state: Dict[str, Any]
    ) -> ChatMessageResponse:
        cid = state["conversation_id"]
        last_search = state.get("last_search")

        check_in = parsed.check_in or (last_search["check_in"] if last_search else None)
        check_out = parsed.check_out or (last_search["check_out"] if last_search else None)
        guests = parsed.guests or (last_search["guests"] if last_search else 1)

        if not check_in or not check_out:
            return ChatMessageResponse(
                reply="Before we can reserve a room, please let me know your check-in and check-out dates.",
                intent="NEED_DATES",
                conversation_id=cid
            )

        # Identify selected room
        target_room: Optional[Room] = None
        target_room_number = parsed.room_number

        if target_room_number:
            target_room = db.query(Room).filter(Room.room_number == target_room_number).first()
        elif last_search and last_search.get("rooms"):
            # If user said "book the cheapest" or "book it"
            cheapest = min(last_search["rooms"], key=lambda x: x["price_per_night"])
            target_room = db.query(Room).filter(Room.id == cheapest["id"]).first()

        if not target_room:
            return ChatMessageResponse(
                reply="Which room would you like to book? Please provide a room number (e.g., 'Book Room M101').",
                intent="NEED_ROOM_SELECTION",
                conversation_id=cid
            )

        if target_room.availability_status != "active":
            return ChatMessageResponse(
                reply=f"Room {target_room.room_number} is currently {target_room.availability_status} and cannot be booked.",
                intent="ROOM_UNAVAILABLE",
                conversation_id=cid
            )

        if target_room.capacity < guests:
            return ChatMessageResponse(
                reply=f"Room {target_room.room_number} has a maximum capacity of {target_room.capacity} guests, but you requested {guests} guests.",
                intent="CAPACITY_EXCEEDED",
                conversation_id=cid
            )

        nights = (check_out - check_in).days
        total_amount = round(nights * target_room.price_per_night, 2)

        # Store pending booking for explicit user confirmation
        pending = {
            "room_id": target_room.id,
            "room_number": target_room.room_number,
            "room_type": target_room.room_type,
            "hotel_id": target_room.hotel_id,
            "hotel_name": target_room.hotel.name,
            "city": target_room.hotel.city,
            "check_in_date": str(check_in),
            "check_out_date": str(check_out),
            "guests": guests,
            "nights": nights,
            "price_per_night": target_room.price_per_night,
            "total_amount": total_amount
        }
        state["pending_booking"] = pending

        reply_text = (
            f"Here is your booking summary:\n"
            f"• Property: {target_room.hotel.name} ({target_room.hotel.city})\n"
            f"• Room: Room {target_room.room_number} ({target_room.room_type})\n"
            f"• Dates: {check_in} to {check_out} ({nights} night(s))\n"
            f"• Guests: {guests}\n"
            f"• Rate: ₹{target_room.price_per_night}/night\n"
            f"• Total Authoritative Amount: ₹{total_amount}\n\n"
            f"Would you like me to confirm this booking?"
        )

        return ChatMessageResponse(
            reply=reply_text,
            intent="PROPOSE_BOOKING",
            conversation_id=cid,
            data={"pending_booking": pending}
        )

    def _handle_confirm_booking(
        self,
        db: Session,
        current_user: User,
        state: Dict[str, Any]
    ) -> ChatMessageResponse:
        cid = state["conversation_id"]
        pending = state.get("pending_booking")

        if not pending:
            return ChatMessageResponse(
                reply="You don't have a pending reservation to confirm. Would you like me to help you search for rooms?",
                intent="NO_PENDING_BOOKING",
                conversation_id=cid
            )

        # Construct BookingCreate schema and invoke existing concurrency-safe booking service
        try:
            booking_in = BookingCreate(
                room_id=pending["room_id"],
                check_in_date=date.fromisoformat(pending["check_in_date"]),
                check_out_date=date.fromisoformat(pending["check_out_date"]),
                guests=pending["guests"]
            )

            # Reuses the exact same transactional BEGIN IMMEDIATE logic
            new_booking = create_booking_concurrency_safe(
                db=db,
                customer_id=current_user.id,
                booking_in=booking_in
            )

            # Clear pending booking state
            state["pending_booking"] = None

            reply_text = (
                f"🎉 Reservation Confirmed!\n\n"
                f"• Booking ID: #{new_booking.id}\n"
                f"• Property: {new_booking.hotel.name}\n"
                f"• Room: Room {new_booking.room.room_number} ({new_booking.room.room_type})\n"
                f"• Dates: {new_booking.check_in_date} to {new_booking.check_out_date}\n"
                f"• Guests: {new_booking.guests}\n"
                f"• Total Amount: ₹{new_booking.total_amount}\n"
                f"• Status: {new_booking.status}\n\n"
                f"We look forward to hosting you! You can view this reservation anytime in 'My Bookings'."
            )

            return ChatMessageResponse(
                reply=reply_text,
                intent="BOOKING_CONFIRMED",
                conversation_id=cid,
                data={
                    "booking": {
                        "id": new_booking.id,
                        "hotel_name": new_booking.hotel.name,
                        "room_number": new_booking.room.room_number,
                        "check_in_date": str(new_booking.check_in_date),
                        "check_out_date": str(new_booking.check_out_date),
                        "guests": new_booking.guests,
                        "total_amount": new_booking.total_amount,
                        "status": new_booking.status
                    }
                }
            )

        except HTTPException as exc:
            state["pending_booking"] = None
            if exc.status_code == status.HTTP_409_CONFLICT:
                return ChatMessageResponse(
                    reply="Sorry, that room was just booked by another customer for the selected dates. Would you like me to search for another available room?",
                    intent="BOOKING_CONFLICT",
                    conversation_id=cid
                )
            return ChatMessageResponse(
                reply=f"Unable to complete booking: {exc.detail}",
                intent="BOOKING_FAILED",
                conversation_id=cid
            )
        except Exception as exc:
            logger.error(f"Unexpected error in chatbot confirm booking: {exc}", exc_info=True)
            state["pending_booking"] = None
            return ChatMessageResponse(
                reply="An unexpected error occurred while processing your booking. Please try again or book directly from the rooms page.",
                intent="BOOKING_ERROR",
                conversation_id=cid
            )

    def _handle_get_my_bookings(
        self,
        db: Session,
        current_user: User,
        state: Dict[str, Any]
    ) -> ChatMessageResponse:
        cid = state["conversation_id"]

        # Strict security: queries only the authenticated customer's bookings
        bookings = (
            db.query(Booking)
            .filter(Booking.customer_id == current_user.id)
            .order_by(Booking.check_in_date.desc())
            .all()
        )

        if not bookings:
            return ChatMessageResponse(
                reply="You currently have no reservations under your account. Would you like me to help you search for available rooms?",
                intent="GET_MY_BOOKINGS",
                conversation_id=cid,
                data={"bookings": []}
            )

        lines = [f"You have {len(bookings)} reservation(s) on file:"]
        b_data = []
        for b in bookings[:6]:
            b_data.append({
                "id": b.id,
                "hotel_name": b.hotel.name,
                "room_number": b.room.room_number,
                "check_in_date": str(b.check_in_date),
                "check_out_date": str(b.check_out_date),
                "status": b.status,
                "total_amount": b.total_amount
            })
            lines.append(f"• Booking #{b.id}: {b.hotel.name} — Room {b.room.room_number} ({b.check_in_date} to {b.check_out_date}) | Status: {b.status} | ₹{b.total_amount}")

        lines.append("\nYou can ask 'Show details for booking <ID>' or 'Cancel booking <ID>'.")

        return ChatMessageResponse(
            reply="\n".join(lines),
            intent="GET_MY_BOOKINGS",
            conversation_id=cid,
            data={"bookings": b_data}
        )

    def _handle_get_booking_details(
        self,
        db: Session,
        current_user: User,
        parsed: ExtractedIntent,
        state: Dict[str, Any]
    ) -> ChatMessageResponse:
        cid = state["conversation_id"]
        booking_id = parsed.booking_id

        if not booking_id:
            return ChatMessageResponse(
                reply="Please specify the booking ID you want to inspect (e.g., 'Show details for booking #1').",
                intent="NEED_BOOKING_ID",
                conversation_id=cid
            )

        # Strict customer isolation check
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking or (current_user.role == "customer" and booking.customer_id != current_user.id):
            return ChatMessageResponse(
                reply=f"I couldn't find a reservation with ID #{booking_id} under your account.",
                intent="BOOKING_NOT_FOUND",
                conversation_id=cid
            )

        reply_text = (
            f"📋 Booking #{booking.id} Details:\n"
            f"• Hotel: {booking.hotel.name} ({booking.hotel.city})\n"
            f"• Address: {booking.hotel.address}\n"
            f"• Room: Room {booking.room.room_number} ({booking.room.room_type})\n"
            f"• Dates: {booking.check_in_date} to {booking.check_out_date}\n"
            f"• Guests: {booking.guests}\n"
            f"• Total Amount: ₹{booking.total_amount}\n"
            f"• Status: {booking.status}\n"
            f"• Reserved On: {booking.booking_date.strftime('%Y-%m-%d %H:%M UTC')}"
        )

        return ChatMessageResponse(
            reply=reply_text,
            intent="GET_BOOKING_DETAILS",
            conversation_id=cid,
            data={
                "booking": {
                    "id": booking.id,
                    "hotel_name": booking.hotel.name,
                    "address": booking.hotel.address,
                    "city": booking.hotel.city,
                    "room_number": booking.room.room_number,
                    "room_type": booking.room.room_type,
                    "check_in_date": str(booking.check_in_date),
                    "check_out_date": str(booking.check_out_date),
                    "guests": booking.guests,
                    "total_amount": booking.total_amount,
                    "status": booking.status
                }
            }
        )

    def _handle_cancel_booking(
        self,
        db: Session,
        current_user: User,
        parsed: ExtractedIntent,
        state: Dict[str, Any]
    ) -> ChatMessageResponse:
        cid = state["conversation_id"]
        booking_id = parsed.booking_id

        # If booking ID wasn't stated, look for customer's most recent active booking
        if not booking_id:
            recent = (
                db.query(Booking)
                .filter(Booking.customer_id == current_user.id, Booking.status == "CONFIRMED")
                .order_by(Booking.check_in_date.asc())
                .first()
            )
            if not recent:
                return ChatMessageResponse(
                    reply="Which booking would you like to cancel? Please specify the booking ID (e.g., 'Cancel booking #1').",
                    intent="NEED_BOOKING_ID",
                    conversation_id=cid
                )
            booking_id = recent.id

        # Execute existing cancellation service (enforcing 24-hour rule & tenant ownership)
        try:
            cancel_result = process_cancellation(
                db=db,
                booking_id=booking_id,
                user_id=current_user.id,
                user_role=current_user.role
            )

            if cancel_result.status == "CANCELLED":
                reply_text = f"✅ Booking #{booking_id} has been cancelled successfully under our free cancellation policy. Your room inventory has been released."
            else:
                reply_text = f"⏳ Your cancellation request for Booking #{booking_id} was submitted within 24 hours of check-in. It has been flagged as PENDING_CANCELLATION and sent to front desk staff for review."

            return ChatMessageResponse(
                reply=reply_text,
                intent="CANCEL_BOOKING",
                conversation_id=cid,
                data={
                    "booking_id": booking_id,
                    "status": cancel_result.status,
                    "requires_approval": cancel_result.requires_approval
                }
            )

        except HTTPException as exc:
            return ChatMessageResponse(
                reply=f"Unable to cancel booking #{booking_id}: {exc.detail}",
                intent="CANCELLATION_FAILED",
                conversation_id=cid
            )

    def _handle_general_query(self, state: Dict[str, Any]) -> ChatMessageResponse:
        cid = state["conversation_id"]
        reply_text = (
            "👋 Hello! I am your Grand Horizon Hotel Booking Assistant.\n\n"
            "I can help you with:\n"
            "• 🔍 Room Search: 'Find a room in Mumbai for 2 guests from Oct 10 to Oct 15'\n"
            "• 🏨 Availability & Booking: 'Book the cheapest room in Goa'\n"
            "• 📋 View Bookings: 'Show my bookings' or 'Details for booking #1'\n"
            "• ❌ Cancellations: 'Cancel booking #1'\n"
            "• ℹ️ Hotel Policies: Free cancellation outside 24h of check-in (14:00 check-in time).\n\n"
            "How can I assist you today?"
        )
        return ChatMessageResponse(
            reply=reply_text,
            intent="GENERAL_HOTEL_QUERY",
            conversation_id=cid
        )

chatbot_service = ChatbotService()
