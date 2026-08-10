/*
  # Allow host to remove players from their waiting session

  ## Changes
  - `mp_players`: new DELETE policy allowing the session host to remove any player
    (including bots) while the session is still in 'waiting' status.

  ## Security
  - Only the session host (auth.uid() = mp_sessions.host_id) can delete players.
  - Deletion is blocked once the session moves past 'waiting'.
*/

CREATE POLICY "Host can remove players from waiting session"
  ON mp_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_sessions
      WHERE mp_sessions.id = mp_players.session_id
        AND mp_sessions.host_id = auth.uid()
        AND mp_sessions.status = 'waiting'
    )
  );
