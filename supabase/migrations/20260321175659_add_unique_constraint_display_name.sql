/*
  # Add unique constraint on display_name in profiles

  ## Summary
  Enforces uniqueness of nicknames at the database level to prevent duplicates
  even if the application-level check is bypassed.

  ## Changes
  1. Modified Tables
    - `profiles`: Added a unique constraint on `display_name` column

  ## Notes
  - This migration is safe to run even if no duplicates exist
  - New sign-ups and profile updates that attempt to use an existing nickname
    will receive a database-level error in addition to the app-level check
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_display_name_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_display_name_key UNIQUE (display_name);
  END IF;
END $$;
