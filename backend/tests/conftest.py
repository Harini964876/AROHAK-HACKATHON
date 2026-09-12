import pytest
import os
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.organization import Organization
from app.models.hotel import Hotel
from app.models.room import Room
from app.models.user import User
from app.services.auth_service import get_password_hash, create_access_token

TEST_DB_FILE = "./test_booking.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30.0}
)

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA busy_timeout=30000;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # 1. Seed Org 1
    org1 = Organization(name="Test Org 1")
    db.add(org1)
    db.commit()
    db.refresh(org1)

    hotel1 = Hotel(
        organization_id=org1.id,
        name="Test Grand Hotel",
        address="123 Marine Drive",
        city="Mumbai",
        description="Luxury test hotel 1",
        contact_number="1234567890",
        email="test1@hotel.com",
        status="active"
    )
    db.add(hotel1)
    db.commit()
    db.refresh(hotel1)

    room1 = Room(
        hotel_id=hotel1.id,
        room_number="T101",
        room_type="Deluxe Suite",
        capacity=2,
        price_per_night=150.0,
        availability_status="active",
        description="Test deluxe room",
        amenities="WiFi, AC, TV"
    )
    room2 = Room(
        hotel_id=hotel1.id,
        room_number="T102",
        room_type="Standard Room",
        capacity=2,
        price_per_night=100.0,
        availability_status="active",
        description="Test standard room",
        amenities="WiFi"
    )
    db.add_all([room1, room2])

    admin1 = User(
        name="Test Admin 1",
        email="admin_test@example.com",
        password_hash=get_password_hash("Admin@123"),
        role="admin",
        organization_id=org1.id
    )
    receptionist1 = User(
        name="Test Receptionist 1",
        email="recept_test@example.com",
        password_hash=get_password_hash("Recept@123"),
        role="receptionist",
        organization_id=org1.id
    )

    # 2. Seed Org 2
    org2 = Organization(name="Test Org 2")
    db.add(org2)
    db.commit()
    db.refresh(org2)

    hotel2 = Hotel(
        organization_id=org2.id,
        name="Test Boutique Goa",
        address="456 Beach Rd",
        city="Goa",
        description="Boutique beach resort 2",
        contact_number="9876543210",
        email="test2@hotel.com",
        status="active"
    )
    db.add(hotel2)
    db.commit()
    db.refresh(hotel2)

    room3 = Room(
        hotel_id=hotel2.id,
        room_number="G101",
        room_type="Beachfront Villa",
        capacity=2,
        price_per_night=250.0,
        availability_status="active",
        description="Beach villa room",
        amenities="WiFi, Pool, Beach Access"
    )
    db.add(room3)

    admin2 = User(
        name="Test Admin 2",
        email="admin2_test@example.com",
        password_hash=get_password_hash("Admin@123"),
        role="admin",
        organization_id=org2.id
    )
    receptionist2 = User(
        name="Test Receptionist 2",
        email="recept2_test@example.com",
        password_hash=get_password_hash("Recept@123"),
        role="receptionist",
        organization_id=org2.id
    )

    # 3. Seed Customers
    customer = User(
        name="Test Customer",
        email="cust_test@example.com",
        password_hash=get_password_hash("Cust@123"),
        role="customer",
        organization_id=None
    )
    customer2 = User(
        name="Second Customer",
        email="cust2_test@example.com",
        password_hash=get_password_hash("Cust@123"),
        role="customer",
        organization_id=None
    )

    db.add_all([admin1, receptionist1, admin2, receptionist2, customer, customer2])
    db.commit()
    db.close()
    yield

    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def admin_token():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "admin_test@example.com").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    db.close()
    return token

@pytest.fixture
def receptionist_token():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "recept_test@example.com").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    db.close()
    return token

@pytest.fixture
def admin2_token():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "admin2_test@example.com").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    db.close()
    return token

@pytest.fixture
def receptionist2_token():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "recept2_test@example.com").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    db.close()
    return token

@pytest.fixture
def customer_token():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "cust_test@example.com").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    db.close()
    return token

@pytest.fixture
def customer2_token():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "cust2_test@example.com").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    db.close()
    return token
