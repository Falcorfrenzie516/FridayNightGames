/*
  # Add theme preference to profiles

  ## Changes
  - Adds `theme` column to `profiles` table
    - Stores the user's selected UI theme ID as a text value
    - Defaults to 'ocean' (the default theme)

  ## Notes
  - Non-destructive: only adds a new column with a safe default
  - No RLS changes needed; existing policies already cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) THEN
    ALTER TABLE profiles ADD COLUMN theme text NOT NULL DEFAULT 'ocean';
  END IF;
END $$;
