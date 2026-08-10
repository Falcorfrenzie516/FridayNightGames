/*
  # Allow authenticated users to view waiting sessions

  ## Changes
  - Updates SELECT policy on mp_sessions so authenticated users can browse waiting lobbies
  - Also allows viewing mp_players for waiting sessions (for lobby browser)
*/

DROP POLICY IF EXISTS "Session members can view session" ON mp_sessions;

CREATE POLICY "Authenticated can view waiting or own sessions"
  ON mp_sessions FOR SELECT
  TO authenticated
  USING (
    status = 'waiting'
    OR host_id = auth.uid()
    OR id IN (SELECT get_my_session_ids())
  );

DROP POLICY IF EXISTS "Session members can view players" ON mp_players;

CREATE POLICY "Authenticated can view players in waiting or own sessions"
  ON mp_players FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM mp_sessions
      WHERE status = 'waiting'
        OR host_id = auth.uid()
        OR id IN (SELECT get_my_session_ids())
    )
  );
