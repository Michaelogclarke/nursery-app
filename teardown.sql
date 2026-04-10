-- teardown.sql — Clean database teardown
-- Drops all tables and related objects for fresh testing.
--
-- WARNING: This will DELETE ALL DATA in the nursery database!
-- Use with caution. This is intended for testing purposes only.
--
-- Usage:
--   psql "<connection_string>" -f teardown.sql
--   npm run teardown (if configured in package.json)

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS rota_entries CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS authorised_pickups CASCADE;
DROP TABLE IF EXISTS emergency_contacts CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS staff_availability CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Database teardown complete. All tables have been dropped.';
END $$;
