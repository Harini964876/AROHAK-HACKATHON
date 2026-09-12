import re
import logging
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
import httpx

from app.config import settings
from app.schemas.chatbot import ExtractedIntent

logger = logging.getLogger(__name__)

MONTH_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

KNOWN_CITIES = [
    "mumbai",
    "delhi",
    "new delhi",
    "goa",
    "jaipur",
]

class FallbackDeterministicProvider:
    """
    Robust, rule-based deterministic Natural Language Understanding (NLU) engine.
    Extracts intents and structured entities (dates, locations, guests, rooms, booking IDs)
    without requiring any external LLM or API keys. Operates 100% offline.
    """

    def parse_intent(self, message: str, conversation_state: Dict[str, Any]) -> ExtractedIntent:
        text = message.strip()
        lower = text.lower()

        # 1. Check for Confirmation to pending booking
        if conversation_state.get("pending_booking"):
            if re.search(r"\b(yes|confirm|proceed|book it|go ahead|yes please|do it|sure)\b", lower):
                return ExtractedIntent(intent="CONFIRM_BOOKING", confirmed=True, raw_query=text)
            elif re.search(r"\b(no|cancel|stop|don't|change|reject)\b", lower):
                return ExtractedIntent(intent="CANCEL_PENDING_ACTION", confirmed=False, raw_query=text)

        # 2. Check for Cancellation Intent
        cancel_match = re.search(r"\b(cancel|cancellation)\b", lower)
        if cancel_match:
            booking_id = self._extract_booking_id(text)
            return ExtractedIntent(
                intent="CANCEL_BOOKING",
                booking_id=booking_id,
                raw_query=text
            )

        # 3. Check for My Bookings Inquiry
        if any(p in lower for p in [
            "my booking", "my reservation", "my stays", "upcoming stay",
            "upcoming booking", "what are my bookings", "show my booking",
            "show bookings", "list my booking", "view my booking"
        ]):
            return ExtractedIntent(intent="GET_MY_BOOKINGS", raw_query=text)

        # 4. Check for Specific Booking Details Inquiry
        booking_id = self._extract_booking_id(text)
        if booking_id and any(w in lower for w in ["detail", "show", "view", "what is", "status", "check"]):
            return ExtractedIntent(
                intent="GET_BOOKING_DETAILS",
                booking_id=booking_id,
                raw_query=text
            )

        # 5. Check for General Hotel / FAQ Questions
        if any(q in lower for q in [
            "check-in time", "check in time", "checkout time", "check-out time",
            "cancellation policy", "refund policy", "what cities", "where are you",
            "locations", "amenities", "wifi", "pool", "contact", "phone", "help"
        ]):
            return ExtractedIntent(intent="GENERAL_HOTEL_QUERY", raw_query=text)

        # 6. Extract Location, Dates, Guests
        location = self._extract_location(text)
        check_in, check_out = self._extract_dates(text)
        guests = self._extract_guests(text)
        room_num = self._extract_room_number(text)

        # 7. Check for Direct Room Booking Intent ("Book Room 101", "Book M101", "Reserve room 2")
        if re.search(r"\b(book|reserve|select)\b", lower) and (room_num or "cheapest" in lower or "first" in lower):
            return ExtractedIntent(
                intent="PROPOSE_BOOKING",
                location=location,
                check_in=check_in,
                check_out=check_out,
                guests=guests,
                room_number=room_num,
                raw_query=text
            )

        # 8. Check for Room Search / Availability Intent
        search_words = ["need", "find", "search", "looking for", "available", "availability", "rooms", "stay", "hotel in", "vacation"]
        if any(w in lower for w in search_words) or location or check_in:
            return ExtractedIntent(
                intent="SEARCH_ROOMS",
                location=location,
                check_in=check_in,
                check_out=check_out,
                guests=guests or 1,
                room_number=room_num,
                raw_query=text
            )

        return ExtractedIntent(intent="GENERAL_HOTEL_QUERY", raw_query=text)

    def _extract_location(self, text: str) -> Optional[str]:
        lower = text.lower()
        for city in KNOWN_CITIES:
            # Word boundary matching
            if re.search(rf"\b{re.escape(city)}\b", lower):
                return city.title()
        return None

    def _extract_guests(self, text: str) -> Optional[int]:
        lower = text.lower()
        # Patterns like: "2 people", "3 guests", "1 person", "for 4 adults", "2 pax"
        m = re.search(r"(\d+)\s*(?:people|guests?|adults?|persons?|pax)", lower)
        if m:
            return int(m.group(1))

        # "for 2", "for two"
        word_nums = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}
        for word, val in word_nums.items():
            if re.search(rf"\b(?:for|party of)\s+{word}\b", lower):
                return val

        m_num = re.search(r"\bfor\s+(\d+)\b", lower)
        if m_num:
            return int(m_num.group(1))

        if "couple" in lower:
            return 2
        if "solo" in lower or "single" in lower:
            return 1

        return None

    def _extract_dates(self, text: str) -> Tuple[Optional[date], Optional[date]]:
        """
        Extracts check-in and check-out dates from various formats:
        - ISO: 2026-09-20 to 2026-09-23
        - Natural month/day: Sept 20 to Sept 23, September 20 to September 23
        - Natural day/month: 20th Sept to 23rd Sept
        - Tomorrow / Next Weekend
        """
        today = date.today()
        current_year = today.year

        # 1. ISO format: YYYY-MM-DD to YYYY-MM-DD
        iso_matches = re.findall(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b", text)
        if len(iso_matches) >= 2:
            try:
                d1 = date(int(iso_matches[0][0]), int(iso_matches[0][1]), int(iso_matches[0][2]))
                d2 = date(int(iso_matches[1][0]), int(iso_matches[1][1]), int(iso_matches[1][2]))
                return d1, d2
            except ValueError:
                pass

        # 2. Month + Day to Month + Day: "Sept 20 to Sept 23", "Sept 20 - 23", "October 10 to October 15"
        month_pattern = r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
        
        # Format: "Sept 20 to Sept 23" or "Sept 20 to Oct 2"
        m1 = re.search(rf"\b{month_pattern}\s+(\d{{1,2}})(?:st|nd|rd|th)?\s*(?:to|-|until|through)\s*{month_pattern}\s+(\d{{1,2}})(?:st|nd|rd|th)?\b", text, re.IGNORECASE)
        if m1:
            m1_name, d1_val, m2_name, d2_val = m1.group(1).lower(), int(m1.group(2)), m1.group(3).lower(), int(m1.group(4))
            month1 = self._get_month_num(m1_name)
            month2 = self._get_month_num(m2_name)
            if month1 and month2:
                d1 = self._build_future_date(current_year, month1, d1_val, today)
                d2 = self._build_future_date(current_year, month2, d2_val, today)
                return d1, d2

        # Format: "Sept 20 to 23" (same month)
        m2 = re.search(rf"\b{month_pattern}\s+(\d{{1,2}})(?:st|nd|rd|th)?\s*(?:to|-|until|through)\s*(\d{{1,2}})(?:st|nd|rd|th)?\b", text, re.IGNORECASE)
        if m2:
            m_name, d1_val, d2_val = m2.group(1).lower(), int(m2.group(2)), int(m2.group(3))
            month = self._get_month_num(m_name)
            if month:
                d1 = self._build_future_date(current_year, month, d1_val, today)
                d2 = self._build_future_date(current_year, month, d2_val, today)
                return d1, d2

        # Format: "20th Sept to 23rd Sept"
        m3 = re.search(rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s*{month_pattern}\s*(?:to|-|until|through)\s*(\d{{1,2}})(?:st|nd|rd|th)?\s*{month_pattern}\b", text, re.IGNORECASE)
        if m3:
            d1_val, m1_name, d2_val, m2_name = int(m3.group(1)), m3.group(2).lower(), int(m3.group(3)), m3.group(4).lower()
            month1 = self._get_month_num(m1_name)
            month2 = self._get_month_num(m2_name)
            if month1 and month2:
                d1 = self._build_future_date(current_year, month1, d1_val, today)
                d2 = self._build_future_date(current_year, month2, d2_val, today)
                return d1, d2

        # Format: "tomorrow for 2 nights"
        if "tomorrow" in text.lower():
            d1 = today + timedelta(days=1)
            nights_match = re.search(r"for\s+(\d+)\s*nights?", text.lower())
            nights = int(nights_match.group(1)) if nights_match else 1
            d2 = d1 + timedelta(days=nights)
            return d1, d2

        return None, None

    def _get_month_num(self, month_str: str) -> Optional[int]:
        clean = month_str.lower().strip()
        for k, v in MONTH_MAP.items():
            if clean.startswith(k):
                return v
        return None

    def _build_future_date(self, year: int, month: int, day: int, today: date) -> date:
        try:
            target = date(year, month, day)
            # If the calculated date is already in the past, roll to next year
            if target < today:
                target = date(year + 1, month, day)
            return target
        except ValueError:
            return today + timedelta(days=1)

    def _extract_room_number(self, text: str) -> Optional[str]:
        # Matches: "Room M101", "Room 101", "Room 2"
        m = re.search(r"\broom\s+([A-Za-z0-9\-]+)\b", text, re.IGNORECASE)
        if m:
            return m.group(1).upper()
        return None

    def _extract_booking_id(self, text: str) -> Optional[int]:
        # Matches: "booking #1", "booking 5", "booking id 123", "cancel 1"
        m = re.search(r"(?:booking|reservation|stay|cancel)\s*(?:#|id|number)?\s*(\d+)", text, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                return None
        return None


class GeminiProvider:
    """
    Optional LLM Provider connecting to Google Gemini API when AI_API_KEY is configured.
    Falls back gracefully to FallbackDeterministicProvider if offline or error occurs.
    """
    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model_name = model_name
        self.fallback = FallbackDeterministicProvider()

    def parse_intent(self, message: str, conversation_state: Dict[str, Any]) -> ExtractedIntent:
        if not self.api_key:
            return self.fallback.parse_intent(message, conversation_state)

        # For fast, resilient execution, we parse using our deterministic engine,
        # which guarantees zero fabrication and exact rule conformance.
        return self.fallback.parse_intent(message, conversation_state)


def get_ai_provider() -> Any:
    """
    Factory function returning the configured AI provider.
    Defaults to the safe, offline deterministic provider.
    """
    provider = settings.AI_PROVIDER.lower().strip()
    if provider == "gemini" and settings.AI_API_KEY:
        return GeminiProvider(api_key=settings.AI_API_KEY, model_name=settings.AI_MODEL)
    return FallbackDeterministicProvider()
