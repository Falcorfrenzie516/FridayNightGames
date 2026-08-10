/*
  # Add table preference to profiles

  ## Changes
  - Adds `table_id` column to `profiles` table
    - Stores the user's selected table/background texture ID
    - Defaults to 'oak' (Classic Oak)

  ## Notes
  - Non-destructive: only adds a new column with a safe default
  - Existing RLS policies already cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'table_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN table_id text NOT NULL DEFAULT 'oak';
  END IF;
END $$;
