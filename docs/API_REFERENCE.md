# CampusPulse API Reference

Base URL: `http://localhost:4000/api` (dev) or `https://your-api-gateway/api` (prod)

## Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Health Check

### `GET /api/health`
**Auth:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 123.45,
    "database": "connected",
    "timestamp": "2025-04-25T10:00:00Z",
    "version": "1.0.0"
  }
}
```

---

## Auth

### `POST /api/auth/register`
**Auth:** None

| Field | Type | Required |
|-------|------|----------|
| email | string | ✅ |
| password | string | ✅ |
| role | string | ✅ (admin/faculty/student/guard) |
| full_name | string | ✅ |
| phone | string | ❌ |

### `POST /api/auth/login`
**Auth:** None

| Field | Type | Required |
|-------|------|----------|
| email | string | ✅ |
| password | string | ✅ |

### `GET /api/auth/me`
**Auth:** Bearer token

---

## RFID Gate Entry

### `POST /api/entry/rfid`
**Auth:** None (IoT device endpoint)

| Field | Type | Required |
|-------|------|----------|
| rfid_uid | string | ✅ |
| timestamp | ISO string | ❌ (defaults to now) |

**Logic:**
- Maps RFID → student
- Rejects duplicates within 5 minutes
- Logs gate entry (source=RFID)

---

## QR Entry System

### `GET /api/qr/generate`
**Auth:** Student role

Generates a single-use QR token (45s expiry).

### `POST /api/qr/validate`
**Auth:** Guard/Admin role

| Field | Type | Required |
|-------|------|----------|
| token | string | ✅ |

---

## Faculty Attendance

### `GET /api/faculty/today-sessions`
**Auth:** Faculty role

### `GET /api/faculty/session/:id/students`
**Auth:** Faculty/Admin role

### `POST /api/faculty/attendance/submit`
**Auth:** Faculty role

| Field | Type | Required |
|-------|------|----------|
| session_id | UUID | ✅ |
| absent_student_ids | UUID[] | ❌ (empty = all present) |

---

## Attendance Resolution

### `POST /api/attendance/resolve/:sessionId`
**Auth:** Admin/Faculty role

### `GET /api/attendance/alerts`
**Auth:** Admin/Faculty role

| Param | Type | Description |
|-------|------|-------------|
| resolved | boolean | Filter by resolution status |

---

## Admin

### `GET /api/admin/dashboard`
**Auth:** Admin role

### `GET /api/admin/gate-logs`
**Auth:** Admin/Guard role

| Param | Type | Description |
|-------|------|-------------|
| date | YYYY-MM-DD | Filter by date |
| source | RFID/QR/MANUAL | Filter by source |
| page | number | Page (default: 1) |
| limit | number | Items per page (default: 50) |

### `POST /api/admin/rfid/map`
**Auth:** Admin role

| Field | Type | Required |
|-------|------|----------|
| rfid_uid | string | ✅ |
| student_id | UUID | ✅ |

### `GET /api/admin/rfid/mappings`
**Auth:** Admin role

### `PATCH /api/admin/rfid/:id/revoke`
**Auth:** Admin role

---

## Students

### `GET /api/students`
**Auth:** Admin/Faculty role

| Param | Type | Description |
|-------|------|-------------|
| search | string | Name/GR/Roll search |
| department | UUID | Department filter |
| page | number | Page (default: 1) |

### `GET /api/students/:id`
**Auth:** Admin/Faculty role

---

## Reports

### `GET /api/reports/daily-trend`
**Auth:** Admin/Faculty role — `?days=30`

### `GET /api/reports/subject-wise`
**Auth:** Admin/Faculty role

### `GET /api/reports/low-attendance`
**Auth:** Admin/Faculty role

### `GET /api/reports/bunk-suspects`
**Auth:** Admin role — `?days=7`

### `GET /api/reports/late-arrivals`
**Auth:** Admin/Faculty role — `?days=7`
