/*
  # Add turn time limit to mp_sessions

  ## Summary
  Adds an optional per-turn time limit to multiplayer game sessions.

  ## Changes
  - `mp_sessions`: new nullable integer column `turn_time_limit` (seconds per turn)
    - NULL means no time limit
    - Common values: 15, 30, 60, 90, 120 seconds
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'turn_time_limit'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN turn_time_limit integer DEFAULT NULL;
  END IF;
END $$;
