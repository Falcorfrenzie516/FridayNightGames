/*
  # Clean up all duplicate real players and add unique constraint

  ## Problem
  Some sessions have the same user_id appearing multiple times in mp_players.
  The previous cleanup missed rows in non-waiting sessions.

  ## Changes
  1. Deactivates ALL duplicate real-user rows across all sessions (keeps the one with
     the lowest turn_order per session+user combination)
  2. Adds a partial unique index on (session_id, user_id) WHERE user_id IS NOT NULL

  ## Notes
  - Only real players (user_id IS NOT NULL) are affected; bots remain untouched
  - The kept row is the one with the smallest turn_order (typically the original join)
*/

-- Step 1: Deactivate all duplicate real-player rows (keep the first/lowest turn_order)
UPDATE mp_players
SET is_active = false
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY session_id, user_id ORDER BY turn_order ASC) AS rn
    FROM mp_players
    WHERE user_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Create partial unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_players_unique_user_per_session
  ON mp_players (session_id, user_id)
  WHERE user_id IS NOT NULL AND is_active = true;
