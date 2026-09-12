from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    room_number = Column(String(50), nullable=False)
    room_type = Column(String(100), nullable=False)  # "Standard Queen", "Deluxe Suite", etc.
    capacity = Column(Integer, nullable=False, default=2)
    price_per_night = Column(Float, nullable=False)
    availability_status = Column(String(50), default="active", nullable=False)  # "active", "inactive", "maintenance"
    description = Column(Text, nullable=True)
    amenities = Column(Text, nullable=True)  # Comma-separated or JSON string, e.g. "WiFi, AC, TV, Mini Bar, Ocean View"

    # Relationships
    hotel = relationship("Hotel", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")
