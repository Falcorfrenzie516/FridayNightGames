/*
  # Fix card_game_turns and card_game_round_scores RLS INSERT policies

  ## Problem
  Both tables had INSERT policies checking `player_id = auth.uid()` but `player_id`
  references mp_players.id (a row UUID), not the auth user UUID. This caused all
  turn and score recording to fail silently.

  ## Changes
  - Drop and replace INSERT policy on card_game_turns: allow session members to insert
    turns for themselves or for bots (host inserts bot turns)
  - Drop and replace INSERT policy on card_game_round_scores: same pattern
*/

DROP POLICY IF EXISTS "Players can insert own card turns" ON card_game_turns;
DROP POLICY IF EXISTS "Players can insert own round scores" ON card_game_round_scores;

CREATE POLICY "Session members can insert card turns"
  ON card_game_turns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = card_game_turns.session_id
        AND mp_players.user_id = (SELECT auth.uid())
        AND mp_players.is_active = true
    )
  );

CREATE POLICY "Session members can insert round scores"
  ON card_game_round_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = card_game_round_scores.session_id
        AND mp_players.user_id = (SELECT auth.uid())
        AND mp_players.is_active = true
    )
  );
