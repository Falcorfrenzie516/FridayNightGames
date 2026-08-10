/*
  # Fix Auth RLS Initialization Plan for Card Game Tables

  ## Summary
  RLS policies on card game tables were calling auth.uid() inline, causing it to be
  re-evaluated for every row. Wrapping with (select auth.uid()) allows the value to be
  computed once per query, improving performance at scale.

  ## Tables Affected
  - `card_game_player_state` — 3 policies updated
  - `card_game_turns` — 2 policies updated
  - `card_game_round_scores` — 2 policies updated

  ## Changes
  - Drop and recreate affected policies using (select auth.uid()) pattern
*/

-- card_game_player_state
DROP POLICY IF EXISTS "Session members can view card player state" ON public.card_game_player_state;
DROP POLICY IF EXISTS "Players can insert own card state" ON public.card_game_player_state;
DROP POLICY IF EXISTS "Players can update own card state" ON public.card_game_player_state;

CREATE POLICY "Session members can view card player state"
  ON public.card_game_player_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mp_players
      WHERE mp_players.session_id = card_game_player_state.session_id
        AND mp_players.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Players can insert own card state"
  ON public.card_game_player_state FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (select auth.uid()));

CREATE POLICY "Players can update own card state"
  ON public.card_game_player_state FOR UPDATE
  TO authenticated
  USING (player_id = (select auth.uid()))
  WITH CHECK (player_id = (select auth.uid()));

-- card_game_turns
DROP POLICY IF EXISTS "Session members can view card turns" ON public.card_game_turns;
DROP POLICY IF EXISTS "Players can insert own card turns" ON public.card_game_turns;

CREATE POLICY "Session members can view card turns"
  ON public.card_game_turns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mp_players
      WHERE mp_players.session_id = card_game_turns.session_id
        AND mp_players.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Players can insert own card turns"
  ON public.card_game_turns FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (select auth.uid()));

-- card_game_round_scores
DROP POLICY IF EXISTS "Session members can view round scores" ON public.card_game_round_scores;
DROP POLICY IF EXISTS "Players can insert own round scores" ON public.card_game_round_scores;

CREATE POLICY "Session members can view round scores"
  ON public.card_game_round_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mp_players
      WHERE mp_players.session_id = card_game_round_scores.session_id
        AND mp_players.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Players can insert own round scores"
  ON public.card_game_round_scores FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (select auth.uid()));
