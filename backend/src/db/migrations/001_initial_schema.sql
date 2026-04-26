-- ============================================================
-- CampusPulse — PostgreSQL Full Schema
-- Target: AWS RDS PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM TYPES ────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student', 'guard');
CREATE TYPE entry_source AS ENUM ('RFID', 'QR', 'MANUAL');
CREATE TYPE attendance_status AS ENUM ('PRESENT_CONFIRMED', 'ABSENT_CONFIRMED', 'NEEDS_REVIEW');
CREATE TYPE alert_type AS ENUM (
  'ENTERED_BUT_ABSENT',
  'PRESENT_NO_GATE_LOG',
  'REPEATED_LATE',
  'BELOW_75_ATTENDANCE'
);

-- ─── DEPARTMENTS ───────────────────────────────────────────
CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL UNIQUE,
  code          VARCHAR(20)  NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_code ON departments(code);

-- ─── USERS (unified login) ─────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL,
  full_name     VARCHAR(200) NOT NULL,
  phone         VARCHAR(20),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ─── STUDENTS ──────────────────────────────────────────────
-- GR number is permanent identity. Roll/division change per semester.
CREATE TABLE students (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gr_number     VARCHAR(30)  NOT NULL UNIQUE,           -- permanent
  roll_number   VARCHAR(20),                            -- changes per semester
  division      VARCHAR(10),                            -- changes per semester
  semester      SMALLINT     NOT NULL DEFAULT 1,
  department_id UUID         NOT NULL REFERENCES departments(id),
  admission_year SMALLINT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_gr        ON students(gr_number);
CREATE INDEX idx_students_user      ON students(user_id);
CREATE INDEX idx_students_dept      ON students(department_id);
CREATE INDEX idx_students_division  ON students(division, semester);

-- ─── FACULTY ───────────────────────────────────────────────
CREATE TABLE faculty (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id   VARCHAR(30)  NOT NULL UNIQUE,
  department_id UUID         NOT NULL REFERENCES departments(id),
  designation   VARCHAR(100),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_faculty_user ON faculty(user_id);
CREATE INDEX idx_faculty_dept ON faculty(department_id);

-- ─── COURSES ───────────────────────────────────────────────
CREATE TABLE courses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  code          VARCHAR(30)  NOT NULL UNIQUE,
  department_id UUID         NOT NULL REFERENCES departments(id),
  semester      SMALLINT     NOT NULL,
  credits       SMALLINT     DEFAULT 3,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_dept ON courses(department_id);
CREATE INDEX idx_courses_sem  ON courses(semester);

-- ─── ENROLLMENTS ───────────────────────────────────────────
CREATE TABLE enrollments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year VARCHAR(10) NOT NULL,  -- e.g. '2025-26'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id, academic_year)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course  ON enrollments(course_id);

-- ─── RFID CARDS ────────────────────────────────────────────
CREATE TABLE rfid_cards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfid_uid      VARCHAR(50) NOT NULL UNIQUE,
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rfid_uid     ON rfid_cards(rfid_uid);
CREATE INDEX idx_rfid_student ON rfid_cards(student_id);

-- ─── GATE LOGS ─────────────────────────────────────────────
CREATE TABLE gate_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID         NOT NULL REFERENCES students(id),
  source        entry_source NOT NULL,
  scanned_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  gate_name     VARCHAR(50)  DEFAULT 'MAIN',
  raw_payload   JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gate_logs_student   ON gate_logs(student_id);
CREATE INDEX idx_gate_logs_scanned   ON gate_logs(scanned_at);
CREATE INDEX idx_gate_logs_date      ON gate_logs((scanned_at::DATE));

-- ─── LECTURE SESSIONS ──────────────────────────────────────
CREATE TABLE lecture_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID        NOT NULL REFERENCES courses(id),
  faculty_id    UUID        NOT NULL REFERENCES faculty(id),
  division      VARCHAR(10),
  session_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  start_time    TIME        NOT NULL,
  end_time      TIME        NOT NULL,
  is_completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_faculty ON lecture_sessions(faculty_id);
CREATE INDEX idx_sessions_course  ON lecture_sessions(course_id);
CREATE INDEX idx_sessions_date    ON lecture_sessions(session_date);

-- ─── ATTENDANCE RECORDS ────────────────────────────────────
CREATE TABLE attendance_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID              NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  student_id      UUID              NOT NULL REFERENCES students(id),
  status          attendance_status NOT NULL DEFAULT 'NEEDS_REVIEW',
  marked_by_faculty BOOLEAN         NOT NULL DEFAULT FALSE,
  gate_entry_id   UUID              REFERENCES gate_logs(id),
  late_flag       BOOLEAN           NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX idx_attendance_session  ON attendance_records(session_id);
CREATE INDEX idx_attendance_student  ON attendance_records(student_id);
CREATE INDEX idx_attendance_status   ON attendance_records(status);

-- ─── QR TOKENS ─────────────────────────────────────────────
CREATE TABLE qr_tokens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID         NOT NULL REFERENCES students(id),
  token         VARCHAR(128) NOT NULL UNIQUE,
  is_used       BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ  NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qr_token    ON qr_tokens(token);
CREATE INDEX idx_qr_student  ON qr_tokens(student_id);
CREATE INDEX idx_qr_expires  ON qr_tokens(expires_at);

-- ─── AUDIT LOGS ────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50),
  entity_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_action   ON audit_logs(action);
CREATE INDEX idx_audit_created  ON audit_logs(created_at);

-- ─── ALERTS ────────────────────────────────────────────────
CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID       NOT NULL REFERENCES students(id),
  alert_type    alert_type NOT NULL,
  session_id    UUID       REFERENCES lecture_sessions(id),
  message       TEXT,
  is_resolved   BOOLEAN    NOT NULL DEFAULT FALSE,
  resolved_by   UUID       REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_alerts_student  ON alerts(student_id);
CREATE INDEX idx_alerts_type     ON alerts(alert_type);
CREATE INDEX idx_alerts_resolved ON alerts(is_resolved);

-- ─── TRIGGER: auto-update updated_at ───────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'departments','users','students','faculty','courses',
      'rfid_cards','lecture_sessions','attendance_records'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;
