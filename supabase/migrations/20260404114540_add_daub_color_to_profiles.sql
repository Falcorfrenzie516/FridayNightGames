/*
  # Add daub_color to profiles

  1. Changes
    - `profiles` table: adds `daub_color` column (text, default 'blue')
      Stores the player's preferred bingo daub color ID.

  2. Notes
    - Existing rows default to 'blue' (matching the previous hardcoded colour).
    - Existing profile RLS policies already cover this column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daub_color'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daub_color text NOT NULL DEFAULT 'blue';
  END IF;
END $$;
