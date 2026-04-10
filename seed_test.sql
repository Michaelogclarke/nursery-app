-- seed_test.sql — controlled test seed for capacity logic verification
-- Today's reference date: 2026-04-10
--
-- Scenarios covered:
--   1. Babies full (12/12)          → hard block + override flow
--   2. Grace period child           → Move button appears in Children list
--   3. Toddlers near-full + future hard mover from Babies → future conflict warning
--   4. After School cutoff          → calendar shows correct room from Sep 2026
--   5. Leaver frees space           → no conflict despite near-full Toddlers
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

INSERT INTO children (first_name, last_name, dob, room_id, is_active)
VALUES
  ('Baby01', 'Test', '2025-01-05', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby02', 'Test', '2025-02-10', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby03', 'Test', '2025-03-15', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby04', 'Test', '2025-04-20', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby05', 'Test', '2025-05-25', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby06', 'Test', '2025-06-30', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby07', 'Test', '2025-07-04', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby08', 'Test', '2025-08-08', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby09', 'Test', '2025-09-12', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby10', 'Test', '2025-10-16', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby11', 'Test', '2025-11-20', (SELECT id FROM rooms WHERE name = 'Babies'), true),
  ('Baby12', 'Test', '2025-12-24', (SELECT id FROM rooms WHERE name = 'Babies'), true),

-- SCENARIO 2: Grace period child
-- DOB 2024-02-01 → turned 2 on 2026-02-01 (2 months ago).
-- Grace window: 2026-02-01 → 2026-06-01 (4 months).
-- Today (2026-04-10) is inside the window → Move to Toddlers button should appear.

  ('Grace', 'Child', '2024-02-01', (SELECT id FROM rooms WHERE name = 'Babies'), true),

-- SCENARIO 3: Toddlers near-full (19/20) + a Babies child whose hard move is within 2 years
-- 19 Toddler-age children (born 2023-05-01 to 2024-01-01, all aged 2–3 today).
-- Adding a 20th Toddler-age child should trigger the future conflict warning because
-- the Babies child below (DOB 2024-04-10) has a hard move deadline of 2026-08-10,
-- within the 2-year horizon, and the room would be full at that point.

  ('Tod01', 'Test', '2023-05-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod02', 'Test', '2023-06-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod03', 'Test', '2023-07-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod04', 'Test', '2023-08-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod05', 'Test', '2023-09-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod06', 'Test', '2023-10-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod07', 'Test', '2023-11-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod08', 'Test', '2023-12-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod09', 'Test', '2024-01-01', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod10', 'Test', '2023-05-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod11', 'Test', '2023-06-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod12', 'Test', '2023-07-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod13', 'Test', '2023-08-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod14', 'Test', '2023-09-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod15', 'Test', '2023-10-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod16', 'Test', '2023-11-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod17', 'Test', '2023-12-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  ('Tod18', 'Test', '2024-01-15', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),
  -- Scenario 5 leaver: born 2023-04-10, turns 3 today (2026-04-10).
  -- Grace window: 2026-04-10 → 2026-08-10. Will leave Toddlers before Sep.
  ('Tod19', 'Leaver', '2023-04-10', (SELECT id FROM rooms WHERE name = 'Toddlers'), true),

  -- The Babies child whose hard move into Toddlers is 2026-08-10 (scenario 3 trigger).
  -- Also the child whose arrival is AFTER Tod19 leaves, so scenario 5 shows no conflict.
  ('FutureMove', 'Baby', '2024-04-10', (SELECT id FROM rooms WHERE name = 'Babies'), true),

-- SCENARIO 4: After School cutoff
-- Child A (DOB 2022-05-15): turns 4 on 2026-05-15, before Jul 1 cutoff → eligible.
--   From Sep 1 2026 they should appear in After School on the calendar.
-- Child B (DOB 2022-08-20): turns 4 on 2026-08-20, after Jul 1 cutoff → stays Pre-School.
--   Sep 1 2026 calendar should still show them in Pre-School.
-- Both are currently 3y+ so they sit in Pre-School today.

  ('AfterSchool', 'Eligible',    '2022-05-15', (SELECT id FROM rooms WHERE name = 'Pre-School'), true),
  ('AfterSchool', 'Ineligible',  '2022-08-20', (SELECT id FROM rooms WHERE name = 'Pre-School'), true);

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
