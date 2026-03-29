# DEVSTRICKERS
# PROJECT NAME isuku_track
Waste Management inventory and reporting project
## TEAM MEMBERS
- Abigail Salem Tendo
- Maxime Lilian HIRWA
- Liliane Uwase
- Brian MAHUI
- Fabrice MBARUSHIMANA
- Bonane NIYIGENA


# 🌍 Isuku Track: Smart Waste Management Infrastructure

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.x-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Leaflet](https://img.shields.io/badge/Leaflet.js-Interactive_Maps-lightgreen.svg)
![Database](https://img.shields.io/badge/Database-SQLAlchemy-blue.svg)

**Isuku Track** is a comprehensive, full-stack digital infrastructure solution engineered to modernize and streamline urban waste collection in Kigali, Rwanda. By bridging the communication and operational gaps between residents, field operators, and city administrators, the system ensures higher collection reliability, transparent revenue tracking, and rapid response to sanitation claims.

---

## 📖 Table of Contents
1. [Project Journey](#-project-journey)
2. [System Architecture & Design](#-system-architecture--design)
3. [Key Features by Role](#-key-features-by-role)
4. [Results & Evaluation](#-results--evaluation)
5. [Technical Challenges & Solutions](#-technical-challenges--solutions)
6. [Testing & Validation](#-testing--validation)
7. [Future Work & Lessons Learned](#-future-work--lessons-learned)
8. [Project Structure](#-project-structure)
9. [Installation & Setup](#-installation--setup)

---

## 🚀 Project Journey

The conception of Isuku Track began by observing the logistical inefficiencies in Kigali's waste management sectors (specifically focusing on Kimironko and surrounding districts). 

* **Inception:** Identified critical bottlenecks: residents had no visibility into collection schedules, field operators lacked dynamic routing, and administrators relied on fragmented reporting.
* **Prototyping & Design:** The initial phase focused on designing a high-fidelity, static UI for three distinct user types (Admin, Resident, Zone Operator) using HTML/CSS and vanilla JavaScript. 
* **Backend Integration:** Transitioned the architecture to a Python/Flask ecosystem. We established a relational database schema using SQLAlchemy to manage complex interactions between Users, Operational Zones, Fleet Vehicles, Schedules, and Payments.
* **Final Solution:** Integrated dynamic server-side routing via Flask Blueprints, JWT-based Role-Based Access Control (RBAC), SMTP email integration for automated alerts, and interactive spatial mapping (Leaflet.js) to create a unified, real-time tracking platform.

---

## 🏗 System Architecture & Design

Isuku Track is built on a modular, decoupled architecture, drawing heavily from the MVC (Model-View-Controller) pattern to ensure scalability and maintainability.

### Technical Stack
* **Backend Framework:** Flask (Python) handles API routing, business logic, and authentication. Modules are strictly separated using Flask Blueprints.
* **Database Layer:** SQLAlchemy ORM manages relational data (Users, Claims, Payments, Schedules). Database migrations are tracked and applied using `Flask-Migrate`.
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, and CSS3. Data fetching is centralized through an asynchronous `api_helper.js` module to ensure DRY principles.
* **Spatial Engine:** Leaflet.js utilizing CartoDB Voyager tiles for interactive, tactical map visualizations.
* **Communications:** SMTP Email Integration (via Flask-Mail) for automated system notifications, password resets, and user onboarding.
* **Security & Auth:** JSON Web Tokens (JWT) for stateless authentication, Bcrypt for secure password hashing, and Cross-Origin Resource Sharing (CORS) policies.

---

## ✨ Key Features by Role

The system utilizes strict RBAC (Role-Based Access Control) to serve three distinct portals:

### 🛡️ 1. Admin Command Centre
* **Interactive Telemetry Map:** Real-time plotting of operational zones (800m radiuses) and operator assignments via Leaflet.js.
* **Automated Email Onboarding:** When an Admin registers a new Zone Operator, the system automatically emails a secure, tokenized setup link to the operator's inbox.
* **Global Oversight:** Full CRUD capabilities for fleet vehicles, schedules, and user management.

### 🏠 2. Resident Portal
* **Claim & Upload System:** Submit localized claims (e.g., missed pickups, illegal dumping) with integrated file-upload capabilities for photographic evidence.
* **Real-Time Email Alerts:** Residents receive automated email notifications when their submitted claims are updated (e.g., moved from "In Progress" to "Resolved").
* **Payment Tracking:** Dedicated interface to manage and track monthly waste collection fees.

### 👷 3. Zone Operator Portal
* **Targeted Dashboards:** Streamlined UI for field workers to view exclusively their assigned schedules and localized resident claims.
* **Status Management:** Quick-action toggles to update claim statuses dynamically, instantly updating both the Admin's view and triggering email updates to the affected residents.

---

## 📊 Results & Evaluation

Isuku Track successfully fulfills its primary project objectives by replacing fragmented, paper-based communication with a centralized digital hub. 
* **Operational Visibility:** The system successfully manages state for multiple concurrent zones without UI lag. Administrators now have a spatial overview of all active zones, instantly highlighting unassigned sectors or broken-down vehicles.
* **Accountability:** By digitizing the Claims workflow and wiring it to automated email dispatches, the system enforces a strict state-machine that prevents citizen reports from falling through the cracks.
* **Security Success:** The JWT-based RBAC perfectly isolates the 3 distinct user types, ensuring data privacy and preventing unauthorized privilege escalation.

---

## ⚠️ Technical Challenges & Solutions

| Challenge | Impact | Technical Solution |
| :--- | :--- | :--- |
| **Monolithic Code Sprawl** | API and routing logic becoming unmanageable in a single file. | Implemented **Flask Blueprints** to heavily modularize the application, splitting routes into dedicated files (`auth.py`, `claims.py`, `payment_routes.py`, etc.). |
| **Static to Dynamic Migration** | CORS errors and broken routing when moving from VS Code Live Server to Flask. | Refactored the frontend to utilize dynamic Flask `@app.route` endpoints and centralized all `fetch` requests through an authorization-aware `api_helper.js` wrapper. |
| **Spatial Data Accuracy** | Manually entering coordinates for new operational zones is error-prone. | Integrated Reverse Geocoding via the OpenStreetMap API to automatically resolve map clicks into precise Rwandan District and Sector text fields. |
| **Divergent Git Branches** | Collaborative blocks during rapid development iterations. | Utilized `git pull --rebase` to integrate remote changes while maintaining a clean, linear commit history. |

---

## 🧪 Testing & Validation

To ensure system reliability, a multi-tiered testing approach was implemented:

1. **API Endpoint Testing:** Validated all CRUD operations (POST, GET, PUT, DELETE) using API testing environments (Postman/Insomnia). Verified correct HTTP status codes (200 OK, 400 Bad Request, 401/403 Unauthorized).
2. **SMTP & Email Flow Validation:** Tested the user invitation and password reset flows to ensure emails correctly rendered HTML templates and delivered tokens without failing the server context.
3. **RBAC Validation:** Conducted rigorous manual security testing by attempting to access protected Admin or Operator routes while logged in as a Resident, successfully verifying automatic rejection and redirection to the `/login` portal.
4. **Database Integrity:** Utilized `seed_zones.py` to populate initial test data, ensuring SQLAlchemy models handled foreign key constraints correctly.

---

## 🔮 Future Work & Lessons Learned

### Lessons Learned
* **Decoupling is Crucial:** Separating the JavaScript logic from the HTML structures early in the prototyping phase saved countless hours during the Flask integration.
* **State Management:** Caching API responses in global variables significantly improved dashboard "snappiness" and reduced database load.

### Future Enhancements
* **Mobile Money (MoMo) Integration:** Connect the existing Payment models directly to the MTN MoMo API for automated, in-app transaction verification.
* **SMS Integration:** Build upon the existing Email infrastructure by adding the Twilio API to dispatch SMS alerts to residents when a collection vehicle enters their sector (for offline users).
* **Algorithmic Routing:** Implement a basic TSP (Traveling Salesperson Problem) algorithm to suggest the most fuel-efficient routes for drivers based on daily localized claims.

---

## 📂 Project Structure

```text
ISUKU_TRACK/
├── migrations/         # Database version control
├── models/             # SQLAlchemy DB Schemas (user, zone, vehicle, claims, payment)
├── routes/             # REST API Blueprints (auth, upload, notifications, etc.)
├── static/
│   ├── css/            # Unified System Styling
│   └── js/             # Modular Client-Side Logic separated by role
├── templates/
│   ├── admin/          # Server-Rendered Admin Views
│   ├── resident/       # Server-Rendered Resident Views
│   └── zone_operator/  # Server-Rendered Operator Views
├── app.py              # Application Factory & Route Registry
├── config.py           # Environment Variables & Security Config
├── extensions.py       # Flask Plugin Initializations (CORS, JWT, Mail, Bcrypt)
├── init_db.py          # Script to initialize database tables
└── requirements.txt    # Project dependencies