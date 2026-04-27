# 🎓 CampusPulse: Smart Academic Management & IoT Attendance System

CampusPulse is a premium, full-stack academic management platform designed to streamline campus operations, course management, and student attendance through a modern web interface and IoT integration.

---

## 🚀 Key Features

### 🏢 Academic Administration
- **Course Management (CRUD)**: Manage academic courses, codes, semesters, and departments.
- **Faculty Management**: Oversee faculty assignments and permissions.
- **Admin Master View**: Centralized dashboard for admins to monitor all ongoing campus sessions.

### 📝 Advanced Attendance System
- **Multi-Format Uploads**: Support for **Excel (.xlsx, .xls)**, **CSV**, and **OCR (Image/PDF)** attendance processing.
- **Preview & Review Workflow**: Intuitive grid preview to audit parsed data before final database submission.
- **Triple-Lock Verification**: Attendance is strictly cross-checked against **Division, Academic Year, and Roll Number** to ensure zero data corruption.

### 🔌 IoT RFID Integration
- **Direct Supabase Logging**: ESP32-based RFID nodes communicate directly with Supabase via custom PL/pgSQL functions.
- **Real-Time Feed**: Live "Gate Logs" track student movement across campus entrances in real-time.
- **Offline Reliability**: Integrated RTC (Real-Time Clock) and NTP synchronization for accurate timestamping.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, Vite, TailwindCSS (for custom UI components) |
| **Backend** | Node.js, Express, Supabase (PostgreSQL) |
| **IoT** | ESP32, RFID RC522, Arduino/C++ |
| **Deployment** | Vercel (Monorepo Infrastructure) |
| **Database** | Supabase (Row Level Security & Database Functions) |

---

## 📦 Project Structure

```bash
CampusPulse/
├── frontend/          # React + Vite application
├── backend/           # Express API + Database Services
├── iot/               # ESP32 Arduino sketches (RFID Node)
├── vercel.json        # Deployment configuration
└── Attendance_Templates/ # Sample CSV/Excel formats
```

---

## 🏗️ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Supabase Project & URL
- Vercel CLI (for deployment)

### 2. Environment Setup
Create a `.env` file in the `backend/` directory:
```env
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Functions
For IoT support, run the `log_rfid_entry` SQL function provided in the `backend/supabase_schema.sql` within your Supabase SQL Editor.

---

## ☁️ Deployment
This project is configured for **Vercel Monorepo** deployment. Simply push your changes to GitHub and Vercel will handle the rest:
- **API**: Served via `/api/*`
- **Static Assets**: Served via root `/`

---

## 📄 License
This project is licensed under the MIT License.

---
*Developed with ❤️ as an advanced IoT-integrated Campus solution.*
