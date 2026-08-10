/*
  # Fix session update policy to allow all active players to advance turns

  ## Problem
  The current "Host can update session" RLS policy restricts session updates to only
  the host. This prevents non-host players from calling advanceTurn() after they bank
  or bust, so the turn never passes to the next player (including bots).

  ## Changes
  - Drop the restrictive "Host can update session" policy
  - Add a new policy that allows any active session participant to update the session
    (for advancing turns, finishing the game, etc.)
  - Hosts retain full update access; non-hosts can also update sessions they are in

  ## Security
  - Still requires authentication (auth.uid() must exist)
  - Still requires the user to be an active participant in the session
*/

DROP POLICY IF EXISTS "Host can update session" ON mp_sessions;

CREATE POLICY "Active participants can update session"
  ON mp_sessions
  FOR UPDATE
  TO authenticated
  USING (
    (host_id = (SELECT auth.uid() AS uid))
    OR
    (EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = mp_sessions.id
        AND mp_players.user_id = (SELECT auth.uid() AS uid)
        AND mp_players.is_active = true
    ))
  )
  WITH CHECK (
    (host_id = (SELECT auth.uid() AS uid))
    OR
    (EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = mp_sessions.id
        AND mp_players.user_id = (SELECT auth.uid() AS uid)
        AND mp_players.is_active = true
    ))
  );
