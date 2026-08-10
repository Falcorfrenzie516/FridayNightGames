/*
  # Add max_players column to mp_sessions

  ## Changes
  - Adds `max_players` column to `mp_sessions` table with default of 4
  - Allows the host to configure how many players can join (2-6)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'max_players'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN max_players integer NOT NULL DEFAULT 4;
  END IF;
END $$;
