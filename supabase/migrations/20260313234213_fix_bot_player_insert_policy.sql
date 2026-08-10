/*
  # Fix bot player insert policy

  ## Summary
  Allows the session host to insert bot players into mp_players.
  Previously the INSERT policy only allowed users to insert their own row (user_id = auth.uid()),
  which blocked adding bots (which need user_id = NULL).

  ## Changes
  - Makes `user_id` nullable in `mp_players` (bots have no real user)
  - Drops the old INSERT policy
  - Adds a new INSERT policy allowing:
    1. A user to insert their own player row (user_id = auth.uid())
    2. The session host to insert a bot row (is_bot = true, user_id IS NULL)

  ## Notes
  - Bot rows are identified by is_bot = true and user_id = NULL
  - The host check looks up mp_sessions to confirm the inserting user is the host
*/

-- Make user_id nullable to support bots
ALTER TABLE mp_players ALTER COLUMN user_id DROP NOT NULL;

-- Drop old insert policy
DROP POLICY IF EXISTS "Users can insert own player row" ON mp_players;

-- New policy: own row OR host inserting a bot
CREATE POLICY "Users can insert player row"
  ON mp_players FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND is_bot = false)
    OR
    (is_bot = true AND user_id IS NULL AND EXISTS (
      SELECT 1 FROM mp_sessions
      WHERE mp_sessions.id = session_id
        AND mp_sessions.host_id = auth.uid()
        AND mp_sessions.status = 'waiting'
    ))
  );
