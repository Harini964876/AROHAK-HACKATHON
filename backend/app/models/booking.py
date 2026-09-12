from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    check_in_date = Column(Date, nullable=False, index=True)
    check_out_date = Column(Date, nullable=False, index=True)
    guests = Column(Integer, nullable=False, default=1)
    booking_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="CONFIRMED", nullable=False)  # CONFIRMED, CANCELLED, COMPLETED, PENDING_CANCELLATION

    # Relationships
    customer = relationship("User", back_populates="bookings")
    organization = relationship("Organization", back_populates="bookings")
    hotel = relationship("Hotel", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
