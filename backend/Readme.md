# IsukuTrack Backend API

A Flask-based REST API for managing waste collection in Kigali. The system tracks zones, vehicles, collection schedules, and user accounts.

---

## Project Structure

```
backend/
  app.py              # Flask application factory
  config.py           # Configuration (reads from .env)
  extensions.py       # Flask extensions (SQLAlchemy, Bcrypt, JWT, Migrate)
  requirements.txt    # Python dependencies
  seed_zones.py       # Seed script to populate zones
  init_db.py          # Script to create database tables
  models/
    user.py           # User model
    zone.py           # Zone model
    vehicle.py        # Vehicle model
    schedule.py       # Schedule model
  routes/
    auth.py           # Authentication endpoints (register, login, refresh, profile)
    vehicle_routes.py # Vehicle CRUD endpoints
    zone_routes.py    # Zone CRUD endpoints
    schedules.py      # Schedule CRUD endpoints
  utils/
    auth_helpers.py   # Authentication utility functions
```

---

## Prerequisites

- Python 3.10+
- pip (Python package manager)
- Access to a MySQL database (Aiven Cloud or local)

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd isuku_track/backend
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
```

Activate it:

- Windows:
  ```bash
  venv\Scripts\activate
  ```
- macOS/Linux:
  ```bash
  source venv/bin/activate
  ```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

This installs:
- flask -- Web framework
- flask-sqlalchemy -- ORM for database operations
- flask-migrate -- Database migration management
- flask-bcrypt -- Password hashing
- flask-jwt-extended -- JWT authentication
- pymysql -- MySQL database driver
- cryptography -- Required for SSL database connections
- python-dotenv -- Loads environment variables from .env file

### 4. Create the `.env` file

Create a file named `.env` in the `backend/` directory with the following variables:

```env
SECRET_KEY=a0aa16b1d32c2ba53c9ec870f9fa0c39b02dce410b0390d6e58546af74bb92c3
JWT_SECRET_KEY=a875dc07811867b3f77b628399853478878ae2544eb1b1bc7d694220eb490bbc
DATABASE_URL=
```

Example with Aiven MySQL:

```env
SECRET_KEY=a0aa16b1d32c2ba53c9ec870f9fa0c39b02dce410b0390d6e58546af74bb92c3
JWT_SECRET_KEY=a875dc07811867b3f77b628399853478878ae2544eb1b1bc7d694220eb490bbc
DATABASE_URL=mysql+pymysql://avnadmin:your_password@mysql-xxxx.aivencloud.com:25379/isukuTrack_db?charset=utf8mb4
```

You can generate random secret keys with Python:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 5. Initialize the database

```bash
python init_db.py
```

This creates all tables (`users`, `zones`, `vehicles`, `schedules`) in the database.

### 6. (Optional) Seed zones data

```bash
python seed_zones.py
```

### 7. Run the application

```bash
python app.py
```

The server starts at **http://127.0.0.1:5000** in debug mode.

---

## API Endpoints

Base URL: `http://127.0.0.1:5000`

---

### Authentication

#### POST `/api/auth/register`

Register a new user.

**Request body:**

```json
{
  "username": "Jean Baptiste Mugabo",
  "email": "jbmugabo@gmail.com",
  "password": "Kigali2026!",
  "phone_number": "+250788100200",
  "role": "resident"
}
```

- `role` accepts: `"resident"`, `"zone_operator"`, `"admin"` (defaults to `"resident"`)
- Password must be at least 8 characters, include uppercase, lowercase, and a number

**Response (201):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "Jean Baptiste Mugabo",
    "email": "jbmugabo@gmail.com",
    "role": "resident",
    "phone_number": "+250788100200",
    "loyalty_points": 0,
    "created_at": "2026-03-07T15:30:00"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### POST `/api/auth/login`

Log in with email and password.

**Request body:**

```json
{
  "email": "jbmugabo@gmail.com",
  "password": "Kigali2026!"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "Jean Baptiste Mugabo",
    "email": "jbmugabo@gmail.com",
    "role": "resident",
    "phone_number": "+250788100200",
    "loyalty_points": 0,
    "created_at": "2026-03-07T15:30:00"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### POST `/api/auth/refresh`

Refresh an expired access token. Requires the refresh token in the `Authorization` header.

**Headers:**

```
Authorization: Bearer <refresh_token>
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### GET `/api/auth/me`

Get the current authenticated user profile. Requires access token.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "user": {
    "id": 1,
    "username": "Jean Baptiste Mugabo",
    "email": "jbmugabo@gmail.com",
    "role": "resident",
    "phone_number": "+250788100200",
    "loyalty_points": 0,
    "created_at": "2026-03-07T15:30:00"
  }
}
```

---

### Vehicles

#### GET `/api/vehicles/`

Get all vehicles. Supports optional filtering by status.

**Query parameters (optional):**

- `status` -- Filter by vehicle status (`available`, `in_use`, `maintenance`)

Example: `GET /api/vehicles/?status=available`

**Response (200):**

```json
[
  {
    "id": 1,
    "plate_number": "RAA 123 A",
    "driver_name": "Bosco Nshimiyimana",
    "driver_phone": "+250780000111",
    "status": "available"
  },
  {
    "id": 2,
    "plate_number": "RAB 456 B",
    "driver_name": "Patrick Uwimana",
    "driver_phone": "+250780000222",
    "status": "in_use"
  },
  {
    "id": 3,
    "plate_number": "RAC 789 C",
    "driver_name": "Emmanuel Kagabo",
    "driver_phone": "+250780000333",
    "status": "maintenance"
  },
  {
    "id": 4,
    "plate_number": "RAD 012 D",
    "driver_name": "Thierry Mutabazi",
    "driver_phone": "+250780000444",
    "status": "available"
  },
  {
    "id": 5,
    "plate_number": "RAE 345 E",
    "driver_name": "Innocent Habimana",
    "driver_phone": "+250780000555",
    "status": "available"
  }
]
```

---

#### GET `/api/vehicles/<id>`

Get a single vehicle by ID.

**Response (200):**

```json
{
  "id": 1,
  "plate_number": "RAA 123 A",
  "driver_name": "Bosco Nshimiyimana",
  "driver_phone": "+250780000111",
  "status": "available"
}
```

---

#### POST `/api/vehicles/`

Create a new vehicle.

**Request body:**

```json
{
  "plate_number": "RAF 999 Z",
  "driver_name": "Claude Niyonzima",
  "driver_phone": "+250788123456",
  "status": "available"
}
```

- `status` is optional, defaults to `"available"`
- Valid statuses: `"available"`, `"in_use"`, `"maintenance"`

**Response (201):**

```json
{
  "message": "Vehicle created successfully",
  "id": 6
}
```

---

#### PUT `/api/vehicles/<id>`

Update a vehicle. Only include fields you want to change.

**Request body:**

```json
{
  "driver_name": "Claude Niyonzima (updated)",
  "status": "maintenance"
}
```

**Response (200):**

```json
{
  "message": "Vehicle updated successfully"
}
```

---

#### DELETE `/api/vehicles/<id>`

Delete a vehicle.

**Response (200):**

```json
{
  "message": "Vehicle deleted successfully"
}
```

---

### Zones

#### GET `/api/zones/`

Get all zones. Supports optional filtering.

**Query parameters (optional):**

- `district` -- Filter by district name
- `sector` -- Filter by sector name

Example: `GET /api/zones/?district=Gasabo`

**Response (200):**

```json
[
  {
    "id": 9,
    "name": "Kimironko Zone A",
    "latitude": -1.9378,
    "longitude": 30.0925,
    "district": "Gasabo",
    "sector": "Kimironko",
    "cell": "Nyagatovu",
    "village": "Ubumwe",
    "zone_operator_id": null,
    "zo_registered_name": "Musa Habimana",
    "zo_registered_phone": "+250780000001"
  },
  {
    "id": 10,
    "name": "Kimironko Zone B",
    "latitude": -1.9385,
    "longitude": 30.095,
    "district": "Gasabo",
    "sector": "Kimironko",
    "cell": "Kibagabaga",
    "village": "Karuruma",
    "zone_operator_id": null,
    "zo_registered_name": "Alice Umutoni",
    "zo_registered_phone": "+250780000002"
  },
  {
    "id": 11,
    "name": "Gikondo Zone A",
    "latitude": -1.9501,
    "longitude": 30.0552,
    "district": "Kicukiro",
    "sector": "Gikondo",
    "cell": "Kanserege",
    "village": "Marembo",
    "zone_operator_id": null,
    "zo_registered_name": "Eric Mugisha",
    "zo_registered_phone": "+250780000003"
  }
]
```

---

#### GET `/api/zones/<id>`

Get a single zone by ID.

**Response (200):**

```json
{
  "id": 9,
  "name": "Kimironko Zone A",
  "latitude": -1.9378,
  "longitude": 30.0925,
  "district": "Gasabo",
  "sector": "Kimironko",
  "cell": "Nyagatovu",
  "village": "Ubumwe",
  "zone_operator_id": null,
  "zo_registered_name": "Musa Habimana",
  "zo_registered_phone": "+250780000001"
}
```

---

#### POST `/api/zones/`

Create a new zone.

**Request body:**

```json
{
  "name": "Nyamirambo Zone A",
  "district": "Nyarugenge",
  "sector": "Nyamirambo",
  "cell": "Cyivugizo",
  "village": "Amahoro",
  "latitude": -1.975,
  "longitude": 30.045,
  "zo_registered_name": "Fabrice Niyomugabo",
  "zo_registered_phone": "+250788999888"
}
```

- `zo_registered_name` and `zo_registered_phone` are optional

**Response (201):**

```json
{
  "message": "Zone created successfully",
  "id": 12
}
```

---

#### PUT `/api/zones/<id>`

Update a zone. Only include fields you want to change.

**Request body:**

```json
{
  "zo_registered_name": "Updated Name",
  "zo_registered_phone": "+250788111222"
}
```

Updatable fields: `name`, `district`, `sector`, `cell`, `village`, `latitude`, `longitude`, `zo_registered_name`, `zo_registered_phone`, `zone_operator_id`

**Response (200):**

```json
{
  "message": "Zone updated successfully"
}
```

---

#### DELETE `/api/zones/<id>`

Delete a zone.

**Response (200):**

```json
{
  "message": "Zone deleted successfully"
}
```

---

### Schedules

#### GET `/api/schedules/`

Get all schedules. Supports optional filtering.

**Query parameters (optional):**

- `status` -- Filter by status (`not_started`, `ongoing`, `completed`)
- `zone_id` -- Filter by zone ID

Example: `GET /api/schedules/?status=not_started&zone_id=9`

**Response (200):**

```json
[
  {
    "id": 1,
    "date_time_start": "2026-03-08T07:00:00",
    "date_time_end": "2026-03-08T12:00:00",
    "status": "not_started",
    "zone_operator_id": 1,
    "zone_id": 9,
    "vehicle_id": 1,
    "priority_score": 3.5,
    "created_at": "2026-03-07T16:00:00"
  },
  {
    "id": 2,
    "date_time_start": "2026-03-08T13:00:00",
    "date_time_end": "2026-03-08T17:00:00",
    "status": "ongoing",
    "zone_operator_id": 2,
    "zone_id": 10,
    "vehicle_id": 2,
    "priority_score": 5.0,
    "created_at": "2026-03-07T16:05:00"
  }
]
```

---

#### GET `/api/schedules/<id>`

Get a single schedule by ID.

**Response (200):**

```json
{
  "id": 1,
  "date_time_start": "2026-03-08T07:00:00",
  "date_time_end": "2026-03-08T12:00:00",
  "status": "not_started",
  "zone_operator_id": 1,
  "zone_id": 9,
  "vehicle_id": 1,
  "priority_score": 3.5,
  "created_at": "2026-03-07T16:00:00"
}
```

---

#### POST `/api/schedules/`

Create a new schedule.

**Request body:**

```json
{
  "date_time_start": "2026-03-09T08:00:00",
  "date_time_end": "2026-03-09T12:00:00",
  "zone_operator_id": 1,
  "zone_id": 9,
  "vehicle_id": 3,
  "priority_score": 2.0,
  "status": "not_started"
}
```

- `vehicle_id`, `priority_score`, and `status` are optional
- `status` defaults to `"not_started"`
- `priority_score` defaults to `0.0`
- Datetime format: ISO 8601 (e.g. `2026-03-09T08:00:00`)
- `date_time_end` must be after `date_time_start`

**Response (201):**

```json
{
  "message": "Schedule created successfully",
  "id": 3
}
```

---

#### PUT `/api/schedules/<id>`

Update a schedule. Only include fields you want to change.

**Request body:**

```json
{
  "status": "ongoing",
  "vehicle_id": 4
}
```

**Response (200):**

```json
{
  "message": "Schedule updated successfully"
}
```

---

#### DELETE `/api/schedules/<id>`

Delete a schedule.

**Response (200):**

```json
{
  "message": "Schedule deleted successfully"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Description of what went wrong"
}
```

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad request (missing or invalid fields) |
| 401  | Unauthorized (invalid credentials or expired token) |
| 404  | Resource not found |
| 409  | Conflict (duplicate entry) |
| 500  | Internal server error |

---

## User Roles

| Role | Description |
|------|-------------|
| resident | Regular user who can report waste issues |
| zone_operator | Manages waste collection in assigned zones |
| admin | Full system access, manages vehicles, zones, and users |
