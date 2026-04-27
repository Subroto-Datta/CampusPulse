# CampusPulse

Smart hybrid attendance and campus entry management for colleges.

CampusPulse combines RFID gate entry, QR fallback entry, faculty attendance workflows, and reporting into one role-based web platform.

## Core Features

- Role-based dashboards for admin, faculty, student, and guard users
- RFID gate entry logging with duplicate-scan protection
- Time-limited QR entry flow for fallback access
- Faculty session and attendance marking workflow
- Attendance resolution and alerting logic
- CSV exports and analytics-focused reports

## Tech Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Frontend | React 18, Vite 5, Tailwind CSS 3 | Single-page app with protected routes |
| Backend | Node.js, Express 4 | Modular REST API |
| Database | DynamoDB or Supabase PostgreSQL | Switchable via environment variables |
| Auth | JWT | Token-based API auth |
| Deployment | AWS (Amplify/Lambda/API GW) or Vercel | Dual deployment paths supported |

## Repository Structure

```text
CampusPulse/
  frontend/            # React app
  backend/             # Express API + Lambda entry
  database/            # SQL schema and seed reference
  docs/                # API and deployment docs
  DEPLOYMENT_GUIDE_VERCEL.md
  vercel.json
  amplify.yml
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- npm

### 1. Install Dependencies

```bash
cd frontend
npm install

cd ../backend
npm install
```

### 2. Configure Environment

Create backend env file from template:

```bash
cp backend/.env.example backend/.env
```

Recommended local mode:

- Set `DB_MOCK=true` in `backend/.env` for in-memory local data (no AWS required)
- Keep frontend `VITE_API_URL=/api` (default) for local proxy-based API access

Frontend env template:

```bash
cp frontend/.env.example frontend/.env
```

### 3. Run the App

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Local URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

## Optional Data Setup

Run these when using real DynamoDB tables:

```bash
cd backend
npm run migrate
npm run seed
```

Demo credentials (after seed):

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@campuspulse.edu | Password123! |
| Faculty | faculty1@campuspulse.edu | Password123! |
| Student | student1@campuspulse.edu | Password123! |
| Guard | guard@campuspulse.edu | Password123! |

## Backend Scripts

From `backend/`:

- `npm run dev` - Run API in watch mode
- `npm start` - Run API in production mode
- `npm run migrate` - Create/update DynamoDB tables
- `npm run seed` - Seed demo data
- `npm run package` - Create Lambda zip package
- `npm run build` - Install production deps and package for Lambda

## Frontend Scripts

From `frontend/`:

- `npm run dev` - Start Vite dev server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint checks

## API Overview

Key endpoints:

- `GET /api/health` - Health check
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user profile
- `POST /api/entry/rfid` - RFID gate scan
- `GET /api/qr/generate` - Generate student QR token
- `POST /api/qr/validate` - Validate scanned QR token
- `GET /api/faculty/today-sessions` - Faculty lecture list
- `POST /api/faculty/attendance/submit` - Submit attendance
- `GET /api/admin/dashboard` - Admin summary
- `GET /api/reports/*` - Reporting endpoints

Full API reference: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

## Deployment Paths

### AWS Deployment

Use this when running DynamoDB + Lambda/API Gateway:

- Guide: [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md)

### Vercel + Supabase Deployment

Use this when running serverless API and frontend on Vercel with Supabase:

- Guide: [DEPLOYMENT_GUIDE_VERCEL.md](DEPLOYMENT_GUIDE_VERCEL.md)
- Ensure `DB_TYPE=supabase` and Supabase keys are configured in Vercel environment variables

## Database Notes

- DynamoDB schema and table/index definitions are implemented in `backend/src/db/migrate.js`
- SQL schema reference is available in `database/schema.sql`
- Supabase migration/seed helpers are available under `backend/` SQL files

## License

MIT
