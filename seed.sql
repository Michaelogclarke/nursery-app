-- seed.sql — development seed data
-- Safe to re-run on any device: clears and re-seeds staff and children.
--
-- Usage:
--   psql "<connection_string>" -f seed.sql
--
-- Rooms are left untouched (they are config, not seed data).
-- Run migration.sql first if this is a fresh database.

-- ── Clear seed tables (order respects FK constraints) ────────────────────────

TRUNCATE TABLE
  rota_entries,
  attendance,
  authorised_pickups,
  emergency_contacts,
  children,
  staff_availability,
  staff
RESTART IDENTITY CASCADE;

-- ── Staff — 13 workers ───────────────────────────────────────────────────────

INSERT INTO staff
  (first_name, last_name, dob, phone, email, job_title, qualifications,
   access_ni_number, access_ni_issue_date, access_ni_expiry_date,
   access_ni_status, is_active)
VALUES
  ('Sarah',   'Mitchell',   '1985-03-12', '07700 900001', 'sarah.mitchell@nursery.test',   'Manager',              'BA Early Childhood Studies, Level 5 Leadership',   'ANI-100001', '2022-01-10', '2027-01-09', 'clear',   true),
  ('Claire',  'O''Neill',   '1988-07-24', '07700 900002', 'claire.oneill@nursery.test',    'Deputy Manager',       'NNEB, Level 4 Early Years',                        'ANI-100002', '2022-03-15', '2027-03-14', 'clear',   true),
  ('Emma',    'Thompson',   '1991-11-03', '07700 900003', 'emma.thompson@nursery.test',    'Room Leader',          'Level 3 Early Years Educator',                     'ANI-100003', '2023-06-01', '2026-05-31', 'clear',   true),
  ('James',   'Wilson',     '1990-05-18', '07700 900004', 'james.wilson@nursery.test',     'Room Leader',          'Level 3 Early Years Educator',                     'ANI-100004', '2021-09-20', '2026-09-19', 'clear',   true),
  ('Rachel',  'Adams',      '1993-08-30', '07700 900005', 'rachel.adams@nursery.test',     'Nursery Nurse',        'Level 3 Childcare and Education',                  'ANI-100005', '2023-02-14', '2026-02-13', 'expiring','true'),
  ('Daniel',  'Hughes',     '1995-01-22', '07700 900006', 'daniel.hughes@nursery.test',    'Nursery Nurse',        'Level 3 Early Years Educator',                     'ANI-100006', '2024-04-01', '2027-03-31', 'clear',   true),
  ('Amy',     'Chambers',   '1992-06-09', '07700 900007', 'amy.chambers@nursery.test',     'Nursery Nurse',        'NVQ Level 3 Children''s Care',                     'ANI-100007', '2022-11-05', '2027-11-04', 'clear',   true),
  ('Mark',    'Patterson',  '1987-09-14', '07700 900008', 'mark.patterson@nursery.test',   'Nursery Nurse',        'Level 3 Childcare',                                'ANI-100008', '2020-07-01', '2025-06-30', 'expired', true),
  ('Laura',   'Doherty',    '1994-04-27', '07700 900009', 'laura.doherty@nursery.test',    'Nursery Nurse',        'Level 3 Early Years Educator',                     'ANI-100009', '2024-01-15', '2027-01-14', 'clear',   true),
  ('Fiona',   'Stewart',    '1996-12-01', '07700 900010', 'fiona.stewart@nursery.test',    'Nursery Practitioner', 'Level 2 Early Years Practitioner',                 'ANI-100010', '2023-08-20', '2026-08-19', 'clear',   true),
  ('David',   'McAllister', '1989-02-16', '07700 900011', 'david.mcallister@nursery.test', 'Nursery Practitioner', 'Level 3 Early Years Educator',                     'ANI-100011', '2022-05-10', '2027-05-09', 'clear',   true),
  ('Siobhan', 'Murphy',     '1997-10-08', '07700 900012', 'siobhan.murphy@nursery.test',   'Nursery Practitioner', 'Level 2 Early Years Practitioner',                 'ANI-100012', '2024-02-28', '2027-02-27', 'clear',   true),
  ('Thomas',  'Bradley',    '1986-06-30', '07700 900013', 'thomas.bradley@nursery.test',   'Nursery Practitioner', 'Level 3 Childcare and Education',                  'ANI-100013', '2023-10-01', '2026-09-30', 'clear',   true);

-- ── Staff availability (Mon–Fri for all, weekends for some) ──────────────────

-- Helper: insert Mon–Fri (days 1–5) for every staff member
INSERT INTO staff_availability (staff_id, day_of_week)
SELECT s.id, d.day
FROM staff s
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(day);

-- A few staff also work Saturdays
INSERT INTO staff_availability (staff_id, day_of_week)
SELECT s.id, 6
FROM staff s
WHERE s.last_name IN ('Adams','Hughes','Stewart');

-- ── Children — 45 children across three rooms ────────────────────────────────

INSERT INTO children (first_name, last_name, dob, room_id, allergies, medical_notes, is_active)
VALUES
  -- Babies room (15 children, born 2024–2025)
  ('Isla',     'Brown',     '2024-02-10', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),
  ('Noah',     'Taylor',    '2024-05-03', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),
  ('Evie',     'Martin',    '2024-08-21', (SELECT id FROM rooms WHERE name = 'Babies'), 'Dairy',         'Epipen prescribed',         true),
  ('Oliver',   'Clarke',    '2024-11-15', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),
  ('Ava',      'Robinson',  '2025-01-07', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),
  ('Ethan',    'White',     '2024-03-28', (SELECT id FROM rooms WHERE name = 'Babies'), 'Nuts',          NULL,                        true),
  ('Freya',    'Harris',    '2024-07-19', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            'Mild eczema',               true),
  ('Liam',     'Jackson',   '2025-02-14', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),
  ('Sophia',   'Lewis',     '2024-04-02', (SELECT id FROM rooms WHERE name = 'Babies'), 'Eggs',          'Allergy card on file',      true),
  ('Harry',    'Walker',    '2024-09-09', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),
  ('Amelia',   'Hall',      '2025-03-01', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),
  ('George',   'Allen',     '2024-06-17', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            'Reflux — upright after feed',true),
  ('Millie',   'Young',     '2024-12-22', (SELECT id FROM rooms WHERE name = 'Babies'), 'Soya',          NULL,                        true),
  ('Jack',     'King',      '2024-01-30', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),
  ('Rosie',    'Wright',    '2025-01-25', (SELECT id FROM rooms WHERE name = 'Babies'), NULL,            NULL,                        true),

  -- Toddlers room (15 children, born 2022–2023)
  ('Charlie',  'Scott',     '2023-04-11', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('Grace',    'Green',     '2023-01-08', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('Archie',   'Baker',     '2022-11-30', (SELECT id FROM rooms WHERE name = 'Toddlers'), 'Gluten',       'Coeliac — strict diet',     true),
  ('Poppy',    'Adams',     '2023-06-25', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('Henry',    'Nelson',    '2022-09-14', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('Lily',     'Carter',    '2023-03-19', (SELECT id FROM rooms WHERE name = 'Toddlers'), 'Nuts',         NULL,                        true),
  ('Leo',      'Mitchell',  '2022-12-05', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           'Asthma inhaler in bag',     true),
  ('Daisy',    'Perez',     '2023-07-31', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('Freddie',  'Roberts',   '2022-10-20', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('Ellie',    'Turner',    '2023-02-14', (SELECT id FROM rooms WHERE name = 'Toddlers'), 'Strawberries', NULL,                        true),
  ('Max',      'Phillips',  '2022-08-08', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('Phoebe',   'Campbell',  '2023-05-10', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('William',  'Parker',    '2022-07-27', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),
  ('Zoe',      'Evans',     '2023-08-16', (SELECT id FROM rooms WHERE name = 'Toddlers'), 'Dairy',        'Lactose intolerant',        true),
  ('Samuel',   'Edwards',   '2022-06-03', (SELECT id FROM rooms WHERE name = 'Toddlers'), NULL,           NULL,                        true),

  -- Pre-School room (15 children, born 2020–2021)
  ('Alfie',    'Collins',   '2021-03-07', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true),
  ('Imogen',   'Stewart',   '2020-11-19', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true),
  ('Toby',     'Morris',    '2021-07-23', (SELECT id FROM rooms WHERE name = 'Pre-School'), 'Tree nuts',   NULL,                        true),
  ('Ella',     'Rogers',    '2020-09-04', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true),
  ('Oscar',    'Reed',      '2021-01-14', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          'EHCP on file',              true),
  ('Molly',    'Cook',      '2021-05-29', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true),
  ('Joshua',   'Morgan',    '2020-10-10', (SELECT id FROM rooms WHERE name = 'Pre-School'), 'Sesame',      NULL,                        true),
  ('Hannah',   'Bell',      '2021-08-06', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true),
  ('Benjamin', 'Murphy',    '2020-12-31', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true),
  ('Chloe',    'Bailey',    '2021-04-17', (SELECT id FROM rooms WHERE name = 'Pre-School'), 'Eggs',        NULL,                        true),
  ('Daniel',   'Rivera',    '2020-08-22', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true),
  ('Sophie',   'Cooper',    '2021-02-11', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          'Speech therapy on Thursdays',true),
  ('Lucas',    'Richardson','2020-07-15', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true),
  ('Ruby',     'Cox',       '2021-06-04', (SELECT id FROM rooms WHERE name = 'Pre-School'), 'Dairy',       NULL,                        true),
  ('Jacob',    'Howard',    '2020-05-28', (SELECT id FROM rooms WHERE name = 'Pre-School'), NULL,          NULL,                        true);

-- ── Emergency contacts (primary for every child) ─────────────────────────────

INSERT INTO emergency_contacts (child_id, name, relationship, phone, priority)
SELECT
  c.id,
  c.first_name || ' ' || split_part(c.last_name, ' ', 1) || ' (Parent)' AS name,
  'Parent',
  '077' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::text, 8, '0') AS phone,
  1
FROM children c;

-- Secondary contact for half the children
INSERT INTO emergency_contacts (child_id, name, relationship, phone, priority)
SELECT
  c.id,
  'Grandparent ' || c.last_name AS name,
  'Grandparent',
  '028 9' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::text, 7, '0') AS phone,
  2
FROM children c
WHERE c.id % 2 = 0;

-- ── Authorised pickups (one per child) ───────────────────────────────────────

INSERT INTO authorised_pickups (child_id, name)
SELECT id, first_name || ' ' || last_name || ' (Parent)'
FROM children;
