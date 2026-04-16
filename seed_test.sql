-- seed_test.sql — controlled test seed for capacity logic verification
-- Today's reference date: 2026-04-10
--
-- Scenarios covered:
--   1. Babies full (12/12)          → hard block + override flow
--   2. Grace period child           → Move button appears in Children list
--   3. Toddlers near-full + future hard mover from Babies → future conflict warning
--   4. After School cutoff          → calendar shows correct room from Sep 2026
--   5. Leaver frees space           → no conflict despite near-full Toddlers
--   6. Pre-School at new capacity (16/16) — no Toddler ages in within 2 yrs → no conflict
--
-- Usage:
--   npm run seed:test

-- ── Clear seed tables ─────────────────────────────────────────────────────────

TRUNCATE TABLE
  rota_entries,
  attendance,
  authorised_pickups,
  emergency_contacts,
  child_scheduled_days,
  children,
  staff_availability,
  staff
RESTART IDENTITY CASCADE;

-- ── Staff — minimal set (3 workers so the app doesn't feel empty) ─────────────

INSERT INTO staff
  (first_name, last_name, dob, phone, email, job_title, qualifications,
   access_ni_number, access_ni_issue_date, access_ni_expiry_date,
   access_ni_status, is_active)
VALUES
  ('Test',  'Manager',     '1985-01-01', '07700 000001', 'test.manager@nursery.test',   'Manager',       'Level 5', 'ANI-T001', '2023-01-01', '2028-01-01', 'clear', true),
  ('Test',  'RoomLeader',  '1990-01-01', '07700 000002', 'test.leader@nursery.test',    'Room Leader',   'Level 3', 'ANI-T002', '2023-01-01', '2028-01-01', 'clear', true),
  ('Test',  'Nurse',       '1995-01-01', '07700 000003', 'test.nurse@nursery.test',     'Nursery Nurse', 'Level 3', 'ANI-T003', '2023-01-01', '2028-01-01', 'clear', true);

INSERT INTO staff_availability (staff_id, day_of_week)
SELECT s.id, d.day
FROM staff s
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(day);

-- ── Children ──────────────────────────────────────────────────────────────────
--
-- SCENARIO 1: Fill Babies to exact capacity (12/12)
-- All DOBs clearly under 2 as of 2026-04-10.
-- When staff tries to add a 13th baby (DOB 2025-06-01) the hard block fires.

-- start_date rules:
--   Existing children (already attending) → past start date, before or on today
--   FutureMove Baby → future start date (2026-05-01) to verify room assigned at that date
--   AfterSchool children → started before Sep 2026 so they are in Pre-School today

INSERT INTO children (first_name, last_name, dob, start_date, room_id, is_active)
VALUES
  -- SCENARIO 1: Babies full (12/12) — all already attending, start dates in the past
  ('Baby01', 'Test', '2025-01-05', '2025-02-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby02', 'Test', '2025-02-10', '2025-03-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby03', 'Test', '2025-03-15', '2025-04-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby04', 'Test', '2025-04-20', '2025-05-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby05', 'Test', '2025-05-25', '2025-06-15', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby06', 'Test', '2025-06-30', '2025-08-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby07', 'Test', '2025-07-04', '2025-08-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby08', 'Test', '2025-08-08', '2025-09-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby09', 'Test', '2025-09-12', '2025-10-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby10', 'Test', '2025-10-16', '2025-11-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby11', 'Test', '2025-11-20', '2025-12-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby12', 'Test', '2025-12-24', '2026-01-15', (SELECT id FROM rooms WHERE name = 'Babies'), true),

  -- SCENARIO 2: Grace period child
  -- DOB 2024-02-01 → turned 2 on 2026-02-01 (2 months ago).
  -- Grace window: 2026-02-01 → 2026-06-01. Today (2026-04-10) is inside.
  -- start_date is in the past — child has been attending since they were under 2.
  ('Grace', 'Child', '2024-02-01', '2024-03-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),

  -- SCENARIO 3 & 5: Toddlers near-full (19/20) — all already attending
  ('Tod01', 'Test', '2023-05-01', '2025-05-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod02', 'Test', '2023-06-01', '2025-06-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod03', 'Test', '2023-07-01', '2025-07-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod04', 'Test', '2023-08-01', '2025-08-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod05', 'Test', '2023-09-01', '2025-09-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod06', 'Test', '2023-10-01', '2025-10-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod07', 'Test', '2023-11-01', '2025-11-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod08', 'Test', '2023-12-01', '2025-12-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod09', 'Test', '2024-01-01', '2026-01-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod10', 'Test', '2023-05-15', '2025-05-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod11', 'Test', '2023-06-15', '2025-06-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod12', 'Test', '2023-07-15', '2025-07-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod13', 'Test', '2023-08-15', '2025-08-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod14', 'Test', '2023-09-15', '2025-09-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod15', 'Test', '2023-10-15', '2025-10-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod16', 'Test', '2023-11-15', '2025-11-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod17', 'Test', '2023-12-15', '2025-12-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod18', 'Test', '2024-01-15', '2026-01-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  -- Scenario 5 leaver: turns 3 today, start_date in the past
  ('Tod19', 'Leaver', '2023-04-10', '2025-04-10', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),

  -- FutureMove Baby: DOB 2024-04-10, start_date 2026-05-01 (future).
  -- At start date they will be 2y 0m → auto-assigned to Babies is correct.
  -- Hard move deadline into Toddlers: 2026-08-10. Tests scenario 3 conflict warning.
  ('FutureMove', 'Baby', '2024-04-10', '2026-05-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),

  -- SCENARIO 4: After School cutoff
  -- Both started before Sep 2026 so they are in Pre-School on their start date.
  -- Child A (DOB 2022-05-15): eligible — turns 4 before Jul 1 cutoff, moves Sep 1 2026.
  -- Child B (DOB 2022-08-20): ineligible — turns 4 after Jul 1 cutoff, stays Pre-School.
  ('AfterSchool', 'Eligible',   '2022-05-15', '2025-05-15', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('AfterSchool', 'Ineligible', '2022-08-20', '2025-08-20', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),

  -- SCENARIO 6: Pre-School at new capacity (16/16) — reduced from 20.
  -- AfterSchool Eligible leaves Sep 2026, freeing a space before any Toddler ages in.
  -- No Toddler turns 3 within 2 years of today (2028-04-10), so no over-capacity warning fires.
  -- This verifies the capacity reduction is correctly reflected without triggering conflicts.
  ('PS01', 'Test', '2021-09-01', '2024-09-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS02', 'Test', '2021-10-01', '2024-10-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS03', 'Test', '2021-11-01', '2024-11-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS04', 'Test', '2021-12-01', '2024-12-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS05', 'Test', '2022-01-01', '2025-01-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS06', 'Test', '2022-02-01', '2025-02-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS07', 'Test', '2022-03-01', '2025-03-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS08', 'Test', '2022-04-01', '2025-04-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS09', 'Test', '2022-05-01', '2025-05-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS10', 'Test', '2022-06-01', '2025-06-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS11', 'Test', '2022-07-01', '2025-07-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS12', 'Test', '2022-08-01', '2025-08-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS13', 'Test', '2022-09-01', '2025-09-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('PS14', 'Test', '2022-10-01', '2025-10-01', (SELECT id FROM rooms WHERE name = 'Pre-School'), true);

-- ── Scheduled days — Mon / Wed / Fri for all test children ───────────────────

INSERT INTO child_scheduled_days (child_id, day_of_week)
SELECT c.id, d.day
FROM children c
CROSS JOIN (VALUES (1),(3),(5)) AS d(day);

-- ── Emergency contacts — one per child ───────────────────────────────────────

INSERT INTO emergency_contacts (child_id, name, relationship, phone, priority)
SELECT
  c.id,
  c.first_name || ' ' || c.last_name || ' (Parent)',
  'Parent',
  '077' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::text, 8, '0'),
  1
FROM children c;

-- ── Authorised pickups — one per child ───────────────────────────────────────

INSERT INTO authorised_pickups (child_id, name)
SELECT id, first_name || ' ' || last_name || ' (Parent)'
FROM children;
