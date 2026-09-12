# Grand Horizon & Aura Collection - Hotel Booking Management System

A full-featured, production-grade Hotel Booking Management System built with **FastAPI**, **SQLAlchemy**, **SQLite (WAL + Immediate Locking)**, and **React + Tailwind CSS**.

This system implements:
- **Phase 1 (Mandatory MVP - 50 marks)**: Authentication & RBAC, Room Management & Search, Booking Engine with Concurrency Safety, 24h Cancellation Policy.
- **Phase 2 (Core Extensions - 13 marks)**: Multi-Organization Tenant Isolation (`Platform -> Organization -> Hotel -> Room -> Booking`), Advanced Categorized Customer & Staff Dashboards.
- **High-Value AI Extension 6 (AI Chatbot - 20 marks)**: AI-Powered Booking Concierge connected directly to live SQLite database with Zero Hallucination guarantee, multi-turn booking confirmation, and 24h cancellation workflows.

---

## 🤖 High-Value AI Extension : AI Chatbot – Booking Management 

An intelligent, multi-turn AI Booking Concierge available directly in the web app and accessible via `POST /api/chatbot/message`.

### Core Capabilities:
1. **Natural Language Understanding & Entity Extraction**:
   - Location (e.g., "Mumbai", "Goa", "Delhi")
   - Date extraction supporting both ISO (`2026-10-15`) and natural language months (`October 15 to 18`, `Sept 20 to 23`)
   - Guest count extraction (`2 guests`, `for 3 people`, `solo traveler`)
   - Room number extraction (`Room 101`, `T102`) and Booking ID extraction (`#1`, `booking 42`)
2. **Zero-Hallucination Live Database Integration**:
   - The chatbot never fabricates room availability, prices, or booking IDs.
   - All room searches execute the production `search_available_rooms` function with date overlap exclusion.
   - All bookings execute `create_booking_concurrency_safe` with `BEGIN IMMEDIATE` transaction locking.
3. **Multi-Turn Conversational Booking with Explicit Confirmation**:
   - Ambiguous queries prompt friendly clarification.
   - Initial booking requests present a **Pending Proposal** with exact room, dates, nights, and total cost.
   - The database is **never** touched until the customer explicitly replies with confirmation ("Yes, confirm", "Proceed", "Confirm booking").
4. **Policy Enforcement & Customer Isolation**:
   - Chatbot requests require a valid JWT bearer token.
   - Customer identity is extracted directly from the session; arbitrary `customer_id` injection is rejected.
   - Customers can only query, view, or cancel their own bookings.
   - Cancellations made $>24$ hours prior to check-in are directly cancelled; cancellations within $\le24$ hours trigger the `PENDING_CANCELLATION` staff-review workflow.
5. **Pluggable AI Provider Architecture**:
   - Abstract provider interface supporting Gemini, OpenAI, Ollama, and an offline **Deterministic Rule Provider** that runs with 0 external API dependencies and passes all unit tests offline.
   - Configurable via `.env`: `AI_PROVIDER=deterministic` (default), `gemini`, `openai`, or `ollama`.

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

**Test Coverage Summary (49/49 Passing):**
- `test_chatbot.py` (16 tests): Tests natural language intent extraction, room search with real DB records, zero hallucination checks, explicit confirmation requirement, concurrency-safe booking, 24h cancellation enforcement, parameter extraction, and security/sanitization.
- `test_auth_roles.py` (8 tests): Verifies role boundary enforcement and 403 Forbidden checks.
- `test_multi_org.py` (8 tests): Verifies strict tenant data isolation, cross-org 403 prevention, hotel addition, and receptionist assignment.
- `test_mvp_audit.py` (6 tests): Tests customer registration, login, inactive room booking prevention, date overlap rejection, and customer isolation.
- `test_security_hardening.py` (5 tests): Tests privilege escalation prevention on register, password complexity, OWASP security headers, token revocation on logout, and auth rate limiting.
- `test_cancellations.py` (3 tests): Tests direct cancellation (>24h), pending approval ($\le$24h), staff approval/rejection, and double cancellation prevention.
- `test_dashboards.py` (2 tests): Tests categorized customer dashboard filtering (Upcoming, Completed, Cancelled) and staff multi-criteria search.
- `test_concurrency.py` (1 test): Verifies concurrent booking requests for the exact same room and dates, asserting exactly one 201 Created and one 409 Conflict.

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
