# CampusPulse 🏫

> Smart Hybrid Attendance and Entry Management System for colleges.

RFID gate entry • QR guardrail • Faculty attendance marking • Automated resolution engine • Analytics & reports

## Tech Stack

| Layer      | Technology                          | Deploy Target          |
|------------|-------------------------------------|------------------------|
| Frontend   | React 18 + Vite 5 + Tailwind CSS 3 | AWS Amplify            |
| Backend    | Node.js + Express 4                | AWS Lambda + API GW    |
| Database   | DynamoDB (NoSQL, on-demand)        | AWS DynamoDB           |
| Storage    | File uploads                        | AWS S3                 |
| Auth       | JWT (Cognito-ready structure)       | —                      |

## Features

### 🔐 Role-Based Access
- **Admin** — Full dashboard, student management, RFID mapping, reports, alerts
- **Faculty** — Session management, attendance marking, attendance analytics
- **Student** — QR entry generation, attendance history
- **Guard** — QR scanner, gate log viewer

### 📡 RFID Gate Entry
- Hardware RFID scanner → `POST /api/entry/rfid`
- Auto-maps RFID UID to student
- Rejects duplicate scans within 5 minutes
- Logs all gate entries

### 📱 QR Guardrail Entry
- Student generates single-use QR (45s expiry)
- Guard scans with camera → validates → logs entry
- Fallback when ID card forgotten

### 📋 Faculty Attendance
- View today's lectures
- Default: all present — click to mark absent
- Search by name/roll
- Mobile-responsive grid UI

### 🧠 Attendance Resolution Engine
- Cross-references gate logs with attendance marks
- Auto-flags: entered-but-absent, present-without-gate-log
- Detects repeated late arrivals, below 75% attendance
- Generates actionable alerts

### 📊 Reports & Analytics
- Daily attendance trends (line chart)
- Subject-wise attendance (bar chart)
- Low attendance students list
- Bunk suspects report
- Late arrivals tracker
- CSV export on all reports

## Project Structure

```
CampusPulse/
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # Layout (Sidebar, DashboardLayout), Common (ProtectedRoute)
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # All page components
│   │   └── services/         # Axios API client
│   └── ...config files
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── config/           # env.js, db.js
│   │   ├── middleware/       # auth, errorHandler, validate
│   │   ├── modules/          # auth, entry, qr, faculty, attendance, admin, students, reports, health
│   │   ├── utils/            # ApiResponse, AppError
│   │   └── db/               # migrate.js, seed.js, migrations/
│   └── lambda.js             # AWS Lambda entry point
├── database/                 # SQL schema + seed data
├── docs/                     # Deployment guide, API reference
└── .gitignore
```

## Quick Start

### Prerequisites
- Node.js 20+
- npm

### 1. Clone & Install

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Database Setup

```bash
# Configure environment
cp backend/.env.example backend/.env
# Edit .env — set DB_MOCK=true for local dev (no AWS needed)

# Run migrations (only when targeting real DynamoDB)
cd backend
npm run migrate

# Seed demo data (only when targeting real DynamoDB)
npm run seed
```

> **Tip**: Set `DB_MOCK=true` in `.env` to run locally with an in-memory mock database — no AWS account required.

### 3. Run Locally

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → http://localhost:4000

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

### 4. Login

Demo credentials (after seeding):
| Role    | Email                       | Password      |
|---------|-----------------------------|---------------|
| Admin   | admin@campuspulse.edu       | Password123!  |
| Faculty | faculty1@campuspulse.edu    | Password123!  |
| Student | student1@campuspulse.edu    | Password123!  |
| Guard   | guard@campuspulse.edu       | Password123!  |

## API Endpoints

See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for complete API documentation.

### Key endpoints:
- `GET  /api/health` — Health check
- `POST /api/auth/login` — Login
- `POST /api/entry/rfid` — RFID gate scan
- `GET  /api/qr/generate` — Generate QR token (student)
- `POST /api/qr/validate` — Validate QR (guard)
- `GET  /api/faculty/today-sessions` — Faculty lectures
- `POST /api/faculty/attendance/submit` — Submit attendance
- `GET  /api/admin/dashboard` — Admin stats
- `GET  /api/reports/*` — Analytics endpoints

## AWS Deployment

See [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md) for complete deployment instructions.

## Database Schema

13 DynamoDB tables with Global Secondary Indexes (GSIs):
`Users`, `Students`, `Faculty`, `Departments`, `Courses`, `Enrollments`, `RfidCards`, `GateLogs`, `LectureSessions`, `AttendanceRecords`, `QrTokens`, `Alerts`, `AuditLogs`

See [backend/src/db/migrate.js](backend/src/db/migrate.js) for the complete table definitions and GSI configuration.
The legacy SQL schema is preserved at [database/schema.sql](database/schema.sql) for reference.

## License

MIT
