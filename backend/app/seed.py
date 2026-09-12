import logging
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models.organization import Organization
from app.models.user import User
from app.models.hotel import Hotel
from app.models.room import Room
from app.services.auth_service import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

def init_db(db: Session):
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # =========================================================================
    # 1. Seed Organizations
    # =========================================================================
    org1 = db.query(Organization).filter(Organization.name == "Grand Horizon Hospitality Group").first()
    if not org1:
        logger.info("Seeding Organization 1: Grand Horizon Hospitality Group...")
        org1 = Organization(name="Grand Horizon Hospitality Group")
        db.add(org1)
        db.commit()
        db.refresh(org1)

    org2 = db.query(Organization).filter(Organization.name == "Aura Boutique Collection").first()
    if not org2:
        logger.info("Seeding Organization 2: Aura Boutique Collection...")
        org2 = Organization(name="Aura Boutique Collection")
        db.add(org2)
        db.commit()
        db.refresh(org2)

    # =========================================================================
    # 2. Seed Hotels
    # =========================================================================
    # Hotel 1: Grand Horizon Mumbai (Org 1)
    hotel1 = db.query(Hotel).filter(Hotel.name == "Grand Horizon Mumbai").first()
    if not hotel1:
        logger.info("Seeding Hotel: Grand Horizon Mumbai (Org 1)...")
        hotel1 = Hotel(
            organization_id=org1.id,
            name="Grand Horizon Mumbai",
            address="Plot 14, Marine Drive, Nariman Point",
            city="Mumbai",
            description="Premier luxury seafront hotel offering breathtaking Arabian Sea views, bespoke hospitality, and world-class fine dining.",
            contact_number="+91 22 6600 5500",
            email="mumbai@grandhorizon.com",
            status="active"
        )
        db.add(hotel1)
        db.commit()
        db.refresh(hotel1)

    # Hotel 2: Grand Horizon New Delhi (Org 1)
    hotel2 = db.query(Hotel).filter(Hotel.name == "Grand Horizon New Delhi").first()
    if not hotel2:
        logger.info("Seeding Hotel: Grand Horizon New Delhi (Org 1)...")
        hotel2 = Hotel(
            organization_id=org1.id,
            name="Grand Horizon New Delhi",
            address="15 Barakhamba Road, Connaught Place",
            city="New Delhi",
            description="Prestigious heritage business hotel in the heart of Delhi with imperial suites and executive lounges.",
            contact_number="+91 11 4400 3300",
            email="delhi@grandhorizon.com",
            status="active"
        )
        db.add(hotel2)
        db.commit()
        db.refresh(hotel2)

    # Hotel 3: Aura Beachfront Resort (Org 2)
    hotel3 = db.query(Hotel).filter(Hotel.name == "Aura Beachfront Resort").first()
    if not hotel3:
        logger.info("Seeding Hotel: Aura Beachfront Resort (Org 2)...")
        hotel3 = Hotel(
            organization_id=org2.id,
            name="Aura Beachfront Resort",
            address="Calangute-Candolim Main Road",
            city="Goa",
            description="Boutique beachside sanctuary featuring private cabanas, sunset cocktail lounges, and holistic spa treatments.",
            contact_number="+91 832 245 8899",
            email="goa@auracollection.com",
            status="active"
        )
        db.add(hotel3)
        db.commit()
        db.refresh(hotel3)

    # Hotel 4: Aura Royal Heritage Palace (Org 2)
    hotel4 = db.query(Hotel).filter(Hotel.name == "Aura Royal Heritage Palace").first()
    if not hotel4:
        logger.info("Seeding Hotel: Aura Royal Heritage Palace (Org 2)...")
        hotel4 = Hotel(
            organization_id=org2.id,
            name="Aura Royal Heritage Palace",
            address="Civil Lines Road, Near Raj Bhavan",
            city="Jaipur",
            description="Restored 19th-century Rajasthani palace showcasing hand-painted fresco courtyards and royal maharaja suites.",
            contact_number="+91 141 223 7711",
            email="jaipur@auracollection.com",
            status="active"
        )
        db.add(hotel4)
        db.commit()
        db.refresh(hotel4)

    # =========================================================================
    # 3. Seed Rooms
    # =========================================================================
    # Grand Horizon Mumbai Rooms
    if db.query(Room).filter(Room.hotel_id == hotel1.id).count() == 0:
        logger.info("Seeding rooms for Grand Horizon Mumbai...")
        rooms_h1 = [
            {
                "room_number": "101",
                "room_type": "Deluxe Sea View Suite",
                "capacity": 2,
                "price_per_night": 180.0,
                "availability_status": "active",
                "description": "Luxurious suite facing the Arabian Sea with floor-to-ceiling glass windows and private seating.",
                "amenities": "High-speed WiFi, Ocean View, King Bed, Rain Shower, Smart TV, Mini Bar"
            },
            {
                "room_number": "102",
                "room_type": "Executive King Room",
                "capacity": 2,
                "price_per_night": 140.0,
                "availability_status": "active",
                "description": "Sophisticated corporate traveler haven equipped with an ergonomic workstation and city skyline views.",
                "amenities": "High-speed WiFi, City View, King Bed, Ergonomic Desk, Espresso Machine"
            },
            {
                "room_number": "103",
                "room_type": "Standard Queen Room",
                "capacity": 2,
                "price_per_night": 95.0,
                "availability_status": "active",
                "description": "Cozy, tastefully furnished room ideal for solo travelers or couples seeking comfort and convenience.",
                "amenities": "Free WiFi, Queen Bed, AC, LED TV, Daily Housekeeping"
            },
            {
                "room_number": "201",
                "room_type": "Grand Family Presidential Suite",
                "capacity": 4,
                "price_per_night": 320.0,
                "availability_status": "active",
                "description": "Sprawling two-bedroom residence with separate living and dining quarters, jacuzzi, and dedicated butler.",
                "amenities": "Ocean View, 2 King Beds, Living Room, Jacuzzi, Butler Service, Kitchenette"
            },
            {
                "room_number": "202",
                "room_type": "Superior Twin Room",
                "capacity": 2,
                "price_per_night": 110.0,
                "availability_status": "active",
                "description": "Contemporary twin-bedded room designed for friends or colleagues with modern ensuite amenities.",
                "amenities": "Free WiFi, 2 Single Beds, AC, Workspace, Complimentary Breakfast"
            },
            {
                "room_number": "301",
                "room_type": "Heritage Penthouse Suite",
                "capacity": 3,
                "price_per_night": 260.0,
                "availability_status": "active",
                "description": "Top-floor penthouse with private terrace, panoramic sunset vistas, and bespoke artisanal decor.",
                "amenities": "Private Balcony, Panoramic Sea View, King + Daybed, Marble Bath, Espresso Machine"
            }
        ]
        for r_data in rooms_h1:
            db.add(Room(hotel_id=hotel1.id, **r_data))
        db.commit()

    # Grand Horizon New Delhi Rooms
    if db.query(Room).filter(Room.hotel_id == hotel2.id).count() == 0:
        logger.info("Seeding rooms for Grand Horizon New Delhi...")
        rooms_h2 = [
            {
                "room_number": "D101",
                "room_type": "Capital Executive Suite",
                "capacity": 2,
                "price_per_night": 165.0,
                "availability_status": "active",
                "description": "Elegant executive suite located adjacent to diplomatic quarter with private meeting parlor.",
                "amenities": "High-speed WiFi, City View, King Bed, Executive Lounge Access, Breakfast"
            },
            {
                "room_number": "D102",
                "room_type": "Heritage Deluxe Room",
                "capacity": 2,
                "price_per_night": 130.0,
                "availability_status": "active",
                "description": "Richly decorated room with Mughal-inspired arches and contemporary luxury amenities.",
                "amenities": "Free WiFi, Queen Bed, AC, Mini Bar, Bathtub"
            },
            {
                "room_number": "D201",
                "room_type": "Ambassador Family Suite",
                "capacity": 4,
                "price_per_night": 290.0,
                "availability_status": "active",
                "description": "Expansive multi-room family suite with dining area and panoramic view of central Delhi.",
                "amenities": "2 King Beds, Balcony, WiFi, Living Room, Espresso Machine"
            }
        ]
        for r_data in rooms_h2:
            db.add(Room(hotel_id=hotel2.id, **r_data))
        db.commit()

    # Aura Beachfront Resort Goa Rooms
    if db.query(Room).filter(Room.hotel_id == hotel3.id).count() == 0:
        logger.info("Seeding rooms for Aura Beachfront Resort Goa...")
        rooms_h3 = [
            {
                "room_number": "G101",
                "room_type": "Ocean Breeze Beach Villa",
                "capacity": 2,
                "price_per_night": 220.0,
                "availability_status": "active",
                "description": "Steps away from Candolim sand, offering outdoor rain showers and private plunge pool.",
                "amenities": "Plunge Pool, Oceanfront Patio, King Bed, Free High-speed WiFi, Breakfast"
            },
            {
                "room_number": "G102",
                "room_type": "Sunset Garden Cottage",
                "capacity": 2,
                "price_per_night": 150.0,
                "availability_status": "active",
                "description": "Secluded tropical cottage surrounded by lush palm gardens.",
                "amenities": "Garden View, King Bed, AC, Hammock, Daily Cocktail Voucher"
            },
            {
                "room_number": "G201",
                "room_type": "Royal Palm Family Villa",
                "capacity": 5,
                "price_per_night": 380.0,
                "availability_status": "active",
                "description": "Multi-tier private villa with private deck, infinity dip, and personal chef services.",
                "amenities": "Private Pool, 2 King Beds + 1 Single, Beach Access, Butler Service"
            }
        ]
        for r_data in rooms_h3:
            db.add(Room(hotel_id=hotel3.id, **r_data))
        db.commit()

    # Aura Royal Heritage Palace Jaipur Rooms
    if db.query(Room).filter(Room.hotel_id == hotel4.id).count() == 0:
        logger.info("Seeding rooms for Aura Royal Heritage Palace Jaipur...")
        rooms_h4 = [
            {
                "room_number": "J101",
                "room_type": "Maharaja Grand Suite",
                "capacity": 2,
                "price_per_night": 240.0,
                "availability_status": "active",
                "description": "Opulent suite adorned with pure gold-leaf frescoes, antique furniture, and marble jharokha.",
                "amenities": "Palace Courtyard View, Four-poster King Bed, Clawfoot Tub, Royal High Tea"
            },
            {
                "room_number": "J102",
                "room_type": "Courtyard Heritage Chamber",
                "capacity": 2,
                "price_per_night": 160.0,
                "availability_status": "active",
                "description": "Historic room overlooking peacock courtyards and water fountains.",
                "amenities": "Courtyard View, Queen Bed, AC, Free WiFi, Traditional Scented Bath"
            },
            {
                "room_number": "J201",
                "room_type": "Haveli Family Residence",
                "capacity": 4,
                "price_per_night": 340.0,
                "availability_status": "active",
                "description": "Two connected imperial bedrooms with private veranda overlooking the Aravalli hills.",
                "amenities": "2 King Beds, Hill View, Private Veranda, Jacuzzi, Chauffeur Service"
            }
        ]
        for r_data in rooms_h4:
            db.add(Room(hotel_id=hotel4.id, **r_data))
        db.commit()

    # =========================================================================
    # 4. Seed Multi-Org Role Users
    # =========================================================================
    users_data = [
        # Org 1 Users
        {
            "name": "Grand Horizon Admin",
            "email": "admin@grandhorizon.com",
            "password": "Admin@123",
            "role": "admin",
            "organization_id": org1.id
        },
        {
            "name": "Grand Horizon Receptionist",
            "email": "reception@grandhorizon.com",
            "password": "Recept@123",
            "role": "receptionist",
            "organization_id": org1.id
        },
        # Org 2 Users
        {
            "name": "Aura Collection Admin",
            "email": "admin@auracollection.com",
            "password": "Admin@123",
            "role": "admin",
            "organization_id": org2.id
        },
        {
            "name": "Aura Collection Receptionist",
            "email": "reception@auracollection.com",
            "password": "Recept@123",
            "role": "receptionist",
            "organization_id": org2.id
        },
        # Standalone Customers
        {
            "name": "Alice Customer",
            "email": "customer@example.com",
            "password": "Cust@123",
            "role": "customer",
            "organization_id": None
        },
        {
            "name": "Bob Traveler",
            "email": "bob@example.com",
            "password": "Cust@123",
            "role": "customer",
            "organization_id": None
        }
    ]

    for u_data in users_data:
        existing = db.query(User).filter(User.email == u_data["email"]).first()
        if not existing:
            logger.info(f"Seeding user: {u_data['email']} ({u_data['role']}, org: {u_data['organization_id']})...")
            user = User(
                name=u_data["name"],
                email=u_data["email"],
                password_hash=get_password_hash(u_data["password"]),
                role=u_data["role"],
                organization_id=u_data["organization_id"]
            )
            db.add(user)
    db.commit()
    logger.info("Multi-organization database seeding successfully completed.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
