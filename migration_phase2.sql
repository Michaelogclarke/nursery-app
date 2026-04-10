-- Nursery Management System — Phase 2 schema
-- Run once against your PostgreSQL server:
--   psql -h <host> -U <user> -d nursery -f migration_phase2.sql

-- ── Rooms: add age_group ──────────────────────────────────────────────────────
-- Nullable initially so existing rows are not broken.
-- Update each room's age_group via the database directly after running this.

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS age_group TEXT
  CHECK (age_group IN ('under_2s', 'two_to_three', 'three_plus'));

-- Update your seeded rooms to the correct age group, e.g.:
--   UPDATE rooms SET age_group = 'under_2s'    WHERE name = 'Babies';
--   UPDATE rooms SET age_group = 'two_to_three' WHERE name = 'Toddlers';
--   UPDATE rooms SET age_group = 'three_plus'   WHERE name = 'Pre-School';

-- ── Staff ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
  id                     SERIAL PRIMARY KEY,
  first_name             TEXT NOT NULL,
  last_name              TEXT NOT NULL,
  dob                    DATE,
  phone                  TEXT,
  email                  TEXT,
  job_title              TEXT,
  qualifications         TEXT,
  access_ni_number       TEXT,
  access_ni_issue_date   DATE,
  access_ni_expiry_date  DATE,
  access_ni_status       TEXT NOT NULL DEFAULT 'pending'
                         CHECK (access_ni_status IN ('pending', 'clear', 'expired')),
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Staff availability ────────────────────────────────────────────────────────
-- day_of_week: 0 = Sunday, 1 = Monday … 6 = Saturday

CREATE TABLE IF NOT EXISTS staff_availability (
  id           SERIAL PRIMARY KEY,
  staff_id     INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  UNIQUE (staff_id, day_of_week)
);

-- ── Rota entries ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rota_entries (
  id        SERIAL PRIMARY KEY,
  staff_id  INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  room_id   INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  shift     TEXT NOT NULL CHECK (shift IN ('morning', 'afternoon', 'fullday')),
  UNIQUE (staff_id, date, shift)  -- a staff member can only work one room per shift per day
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_staff_active          ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_availability    ON staff_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_rota_date             ON rota_entries(date);
CREATE INDEX IF NOT EXISTS idx_rota_room_date        ON rota_entries(room_id, date);
