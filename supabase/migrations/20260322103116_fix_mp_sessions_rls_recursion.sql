/*
  # Fix infinite recursion in mp_sessions UPDATE RLS policy

  ## Problem
  The "Active participants can update session" policy on mp_sessions checks mp_players,
  and some mp_players policies check back to mp_sessions, creating infinite recursion.

  ## Fix
  Create a SECURITY DEFINER function that checks session membership without triggering
  RLS, then use it in the mp_sessions UPDATE policy instead of a direct subquery.
*/

CREATE OR REPLACE FUNCTION public.is_session_participant(session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mp_players
    WHERE mp_players.session_id = is_session_participant.session_id
      AND mp_players.user_id = (SELECT auth.uid())
      AND mp_players.is_active = true
  );
$$;

DROP POLICY IF EXISTS "Active participants can update session" ON mp_sessions;

CREATE POLICY "Active participants can update session"
  ON mp_sessions
  FOR UPDATE
  TO authenticated
  USING (
    (host_id = (SELECT auth.uid()))
    OR is_session_participant(id)
  )
  WITH CHECK (
    (host_id = (SELECT auth.uid()))
    OR is_session_participant(id)
  );
