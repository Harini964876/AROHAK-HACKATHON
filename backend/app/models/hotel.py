from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Hotel(Base):
    __tablename__ = "hotels"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), index=True, nullable=False)
    description = Column(Text, nullable=True)
    contact_number = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    status = Column(String(50), default="active", nullable=False)  # "active", "inactive"

    # Relationships
    organization = relationship("Organization", back_populates="hotels")
    rooms = relationship("Room", back_populates="hotel", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="hotel")
