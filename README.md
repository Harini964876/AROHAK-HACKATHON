# Grand Horizon & Aura Collection - Hotel Booking Management System

A full-featured, production-grade Hotel Booking Management System built with **FastAPI**, **SQLAlchemy**, **SQLite (WAL + Immediate Locking)**, and **React + Tailwind CSS**.

This system implements **Phase 1 (Mandatory MVP - 50 marks)** and **Phase 2 (Core Extensions - 13 marks)**:
- Full Multi-Organization Tenant Isolation (`Platform -> Organization -> Hotel -> Room -> Booking`).
- Advanced Booking Dashboards for Customer (Categorized Upcoming / Completed / Cancelled with details modal) and Staff (Multi-hotel selector, search by customer, date ranges, and completion actions).
- Concurrency-safe atomic booking engine.
- 24-Hour cancellation policy workflow.

---

## 🔑 Multi-Tenant Demo Test Credentials

The database is pre-seeded with two distinct organizations, four hotels across four cities, and dedicated credentials. Instant 1-click login buttons for all roles are available directly on the login screen:

### Tenant 1: Grand Horizon Hospitality Group (Org ID: 1)
- **Hotels**: Grand Horizon Mumbai (`Mumbai`), Grand Horizon New Delhi (`New Delhi`)
- **Admin**: `admin@grandhorizon.com` / `Admin@123`
- **Receptionist**: `reception@grandhorizon.com` / `Recept@123`

### Tenant 2: Aura Boutique Collection (Org ID: 2)
- **Hotels**: Aura Beachfront Resort (`Goa`), Aura Royal Heritage Palace (`Jaipur`)
- **Admin**: `admin@auracollection.com` / `Admin@123`
- **Receptionist**: `reception@auracollection.com` / `Recept@123`

### Standalone Cross-Org Guests (Customers)
- **Customer 1**: `customer@example.com` / `Cust@123`
- **Customer 2**: `bob@example.com` / `Cust@123`

---

## 🚀 Quick Setup & Run Instructions

### 1. Backend Setup (FastAPI)

```bash
# Navigate to backend folder
cd booking-system/backend

# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database seeder (initializes 2 Organizations, 4 Hotels, 15 Rooms, 7 Users)
python -m app.seed

# Start backend server (runs on http://127.0.0.1:8000)
uvicorn app.main:app --reload --port 8000
```

- **Interactive API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative Docs (ReDoc)**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### 2. Frontend Setup (React + Vite + Tailwind CSS)

```bash
# Navigate to frontend folder
cd booking-system/frontend

# Install dependencies
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 3. Running Automated Tests

Run the full pytest suite from `booking-system/backend`:

```bash
cd booking-system/backend
.\venv\Scripts\pytest.exe -v
```

**Test Coverage Summary (22/22 Passing):**
- `test_auth_roles.py`: 8 tests verifying role boundary enforcement and 403 Forbidden checks.
- `test_concurrency.py`: Verifies concurrent booking requests for the exact same room and dates, asserting exactly one 201 Created and one 409 Conflict.
- `test_cancellations.py`: Tests direct cancellation (>24h), pending approval ($\le$24h), staff approval/rejection, and double cancellation prevention.
- `test_multi_org.py`: 8 tests verifying strict tenant data isolation, cross-org 403 prevention, hotel addition, and receptionist assignment.
- `test_dashboards.py`: Tests categorized customer dashboard filtering (Upcoming, Completed, Cancelled) and staff multi-criteria search.

---

## 🛡️ Key Architectural Explanations

### 1. Multi-Organization Data Isolation Implementation
- **Data Hierarchy**: `Platform -> Organization -> Hotel -> Room -> Booking`.
- **Database Schema**: All entities (`users`, `hotels`, `bookings`) carry `organization_id` foreign keys from day one.
- **Server-Side Enforcement**:
  - When Staff (Admin / Receptionist) access `/api/bookings`, the query strictly filters:
    `Booking.organization_id == current_staff.organization_id`.
  - When Staff review or cancel a booking, the system verifies `booking.organization_id == current_staff.organization_id`. Any cross-tenant access immediately raises **HTTP 403 Forbidden**.
  - Organization Admins can only add hotels or assign receptionists to their own organization (`current_admin.organization_id == org_id`). Attempting to modify another organization's properties returns **HTTP 403 Forbidden**.
  - Customers are platform-wide users (`organization_id = None`) who can seamlessly browse across organizations, compare hotels, and book stays.

### 2. Concurrency-Safe Booking Implementation
- **Problem**: In concurrent environments, two simultaneous requests for the same room and dates can bypass application-level `if` checks, causing double bookings.
- **Solution**:
  1. SQLite is configured with **Write-Ahead Logging (WAL)**: `PRAGMA journal_mode=WAL;` and `PRAGMA busy_timeout=30000;`.
  2. The booking transaction executes with **`BEGIN IMMEDIATE`**, acquiring an exclusive write lock immediately before querying.
  3. Inside the locked transaction, date overlap is evaluated against `CONFIRMED` and `PENDING_CANCELLATION` bookings.
  4. If an overlap is found, the transaction rolls back and returns **HTTP 409 Conflict**.
  5. If clear, the booking is inserted and committed.
  6. Verified by automated test `test_concurrency.py` firing concurrent threads.

### 3. Customer & Staff Dashboards
- **Customer Dashboard**: Categorized into Upcoming, Completed/Past, and Cancelled/Pending stays, with an inspection modal providing complete booking details and cancellation options.
- **Staff Dashboard**: Equipped with multi-hotel filtering, date-range filters, live customer search, and actions to approve/reject cancellations or mark completed stays.
