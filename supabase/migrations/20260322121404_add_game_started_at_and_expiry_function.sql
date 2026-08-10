/*
  # Add game_started_at and auto-expiry support

  1. Changes
    - Add `game_started_at` column to `mp_sessions` to track when a game transitions to active status
    - Create a database function `cancel_expired_active_games` that finds and cancels any active game
      whose turn_time_limit has elapsed since game_started_at
    - This function sets status to 'finished' and marks the session as expired

  2. Notes
    - turn_time_limit is stored in seconds (e.g. 900 = 15 minutes, 86400 = 1 day)
    - The function is designed to be called by a scheduled edge function
    - Games with NULL turn_time_limit are never expired
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'game_started_at'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN game_started_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'expired'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN expired boolean DEFAULT false;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION cancel_expired_active_games()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE mp_sessions
  SET
    status = 'finished',
    expired = true,
    updated_at = now()
  WHERE
    status = 'active'
    AND turn_time_limit IS NOT NULL
    AND game_started_at IS NOT NULL
    AND (game_started_at + (turn_time_limit * interval '1 second')) < now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
