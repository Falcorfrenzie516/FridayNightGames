/*
  # Fix RLS infinite recursion and improve policies

  ## Problems Fixed

  1. `mp_players` SELECT policy used a self-referencing subquery on `mp_players`,
     causing infinite recursion when queried.

  2. `mp_sessions` SELECT policy checked `mp_players` before a player row exists
     (e.g., during code lookup when creating/joining), causing 500 errors.

  ## Changes

  - Drop and recreate the `mp_players` SELECT policy using a security definer
    helper function to break the recursion.
  - Drop and recreate the `mp_sessions` SELECT policy to allow any authenticated
    user to view 'waiting' sessions (needed for join-by-code flow), while
    restricting 'active'/'finished' sessions to participants only.

  ## Notes
  - The helper function `get_my_session_ids()` runs as the function owner
    (security definer) so it bypasses RLS when checking membership, avoiding
    the recursive loop.
*/

-- Helper function that returns all session IDs the current user is a member of
-- Uses SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION get_my_session_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT session_id FROM mp_players WHERE user_id = auth.uid() AND is_active = true;
$$;

-- Fix mp_players: drop old self-referencing policy, replace with function-based one
DROP POLICY IF EXISTS "Session members can view players" ON mp_players;

CREATE POLICY "Session members can view players"
  ON mp_players FOR SELECT
  TO authenticated
  USING (
    session_id IN (SELECT get_my_session_ids())
  );

-- Fix mp_sessions: allow viewing waiting sessions openly (needed to look up join codes)
-- and restrict active/finished sessions to participants
DROP POLICY IF EXISTS "Session members can view session" ON mp_sessions;

CREATE POLICY "Session members can view session"
  ON mp_sessions FOR SELECT
  TO authenticated
  USING (
    status = 'waiting'
    OR host_id = auth.uid()
    OR id IN (SELECT get_my_session_ids())
  );
