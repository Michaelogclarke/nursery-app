-- Nursery Management System — initial schema
-- Run once against your PostgreSQL server:
--   psql -h <host> -U <user> -d nursery -f migration.sql

-- Rooms must exist before children reference them
CREATE TABLE IF NOT EXISTS rooms (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  max_capacity INTEGER NOT NULL
);

-- Seed rooms — edit names/capacities to match your nursery
INSERT INTO rooms (name, max_capacity) VALUES
  ('Babies',       12),
  ('Toddlers',     20),
  ('Pre-School',   16),
  ('After School', 20)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS children (
  id             SERIAL PRIMARY KEY,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  dob            DATE NOT NULL,
  start_date     DATE,
  room_id        INTEGER REFERENCES rooms(id),
  allergies      TEXT,
  medical_notes  TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id           SERIAL PRIMARY KEY,
  child_id     INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone        TEXT NOT NULL,
  priority     INTEGER NOT NULL  -- 1 = primary, 2 = secondary
);

CREATE TABLE IF NOT EXISTS authorised_pickups (
  id       SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS child_scheduled_days (
  id          SERIAL PRIMARY KEY,
  child_id    INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Mon … 5=Fri
  UNIQUE (child_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS attendance (
  id             SERIAL PRIMARY KEY,
  child_id       INTEGER NOT NULL REFERENCES children(id),
  date           DATE NOT NULL,
  checked_in_at  TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  UNIQUE (child_id, date)
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_children_active       ON children(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_date       ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_child      ON attendance(child_id);
CREATE INDEX IF NOT EXISTS idx_emergency_child       ON emergency_contacts(child_id);
CREATE INDEX IF NOT EXISTS idx_pickups_child         ON authorised_pickups(child_id);
CREATE INDEX IF NOT EXISTS idx_child_scheduled_days  ON child_scheduled_days(child_id);
