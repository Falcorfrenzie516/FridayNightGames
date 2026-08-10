/*
  # Fix card_game_player_state RLS policies

  ## Problem
  The original INSERT and UPDATE policies used `player_id = auth.uid()` which compares
  the mp_players UUID (not the auth UUID) to the auth user ID — this always fails.
  This caused all multiplayer 3-13 game state writes to be silently rejected,
  preventing the game from loading.

  ## Changes
  1. Drop and replace INSERT policy: allow session members to insert state for
     any player in their session (including bots managed by the host)
  2. Drop and replace UPDATE policy: allow players to update their own state (matched
     via mp_players.user_id) OR the session host to update bot player state
  3. Fix SELECT policy: add is_active check and allow bot player state to be visible
     to session members
*/

DROP POLICY IF EXISTS "Players can insert own card state" ON card_game_player_state;
DROP POLICY IF EXISTS "Players can update own card state" ON card_game_player_state;
DROP POLICY IF EXISTS "Session members can view card player state" ON card_game_player_state;

CREATE POLICY "Session members can view card player state"
  ON card_game_player_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = card_game_player_state.session_id
        AND mp_players.user_id = (SELECT auth.uid())
        AND mp_players.is_active = true
    )
  );

CREATE POLICY "Session members can insert card state"
  ON card_game_player_state FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = card_game_player_state.session_id
        AND mp_players.user_id = (SELECT auth.uid())
        AND mp_players.is_active = true
    )
  );

CREATE POLICY "Players can update own card state"
  ON card_game_player_state FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.id = card_game_player_state.player_id
        AND mp_players.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM mp_sessions
      WHERE mp_sessions.id = card_game_player_state.session_id
        AND mp_sessions.host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.id = card_game_player_state.player_id
        AND mp_players.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM mp_sessions
      WHERE mp_sessions.id = card_game_player_state.session_id
        AND mp_sessions.host_id = (SELECT auth.uid())
    )
  );
