/*
  # Add deck_color to profiles

  1. Changes
    - `profiles` table: adds `deck_color` column (text, default 'blue')
      Stores the player's preferred card-back color ID from the DECK_COLORS list.

  2. Notes
    - Existing rows will default to 'blue' (matching the previous hardcoded colour).
    - No RLS changes required — existing profile policies already govern this column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deck_color'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deck_color text NOT NULL DEFAULT 'blue';
  END IF;
END $$;
