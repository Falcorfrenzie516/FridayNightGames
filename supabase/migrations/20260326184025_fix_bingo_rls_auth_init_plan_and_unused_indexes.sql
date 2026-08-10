/*
  # Fix Bingo RLS Auth Initialization Plan & Drop Unused Indexes

  ## Changes

  ### 1. RLS Policy Fixes (bingo_sessions & bingo_players)
  Drop and recreate all affected policies replacing `auth.uid()` with `(select auth.uid())`
  and `auth.role()` with `(select auth.role())` to avoid per-row re-evaluation.

  Also fixes the multiple permissive DELETE policies on bingo_players by merging into one.

  ### 2. Drop Unused Indexes
  Removes indexes that have never been used to reduce write overhead.
*/

-- ============================================================
-- Fix bingo_sessions RLS policies
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can create bingo sessions" ON public.bingo_sessions;
DROP POLICY IF EXISTS "Players in session can view bingo session" ON public.bingo_sessions;
DROP POLICY IF EXISTS "Host can update bingo session" ON public.bingo_sessions;
DROP POLICY IF EXISTS "Host can delete bingo session" ON public.bingo_sessions;

CREATE POLICY "Authenticated users can create bingo sessions"
  ON public.bingo_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Players in session can view bingo session"
  ON public.bingo_sessions
  FOR SELECT
  TO authenticated
  USING (
    host_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bingo_players
      WHERE bingo_players.session_id = bingo_sessions.id
        AND bingo_players.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Host can update bingo session"
  ON public.bingo_sessions
  FOR UPDATE
  TO authenticated
  USING (host_id = (select auth.uid()))
  WITH CHECK (host_id = (select auth.uid()));

CREATE POLICY "Host can delete bingo session"
  ON public.bingo_sessions
  FOR DELETE
  TO authenticated
  USING (host_id = (select auth.uid()));

-- ============================================================
-- Fix bingo_players RLS policies
-- Merge duplicate DELETE policies into one
-- ============================================================

DROP POLICY IF EXISTS "Players can join bingo sessions" ON public.bingo_players;
DROP POLICY IF EXISTS "Players in session can view all bingo players" ON public.bingo_players;
DROP POLICY IF EXISTS "Players can update their own bingo player row" ON public.bingo_players;
DROP POLICY IF EXISTS "Players can delete their own bingo player row" ON public.bingo_players;
DROP POLICY IF EXISTS "Host can delete bingo players" ON public.bingo_players;

CREATE POLICY "Players can join bingo sessions"
  ON public.bingo_players
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Players in session can view all bingo players"
  ON public.bingo_players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bingo_sessions
      WHERE bingo_sessions.id = bingo_players.session_id
        AND (
          bingo_sessions.host_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.bingo_players bp2
            WHERE bp2.session_id = bingo_players.session_id
              AND bp2.user_id = (select auth.uid())
          )
        )
    )
  );

CREATE POLICY "Players can update their own bingo player row"
  ON public.bingo_players
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Players or host can delete bingo player row"
  ON public.bingo_players
  FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bingo_sessions
      WHERE bingo_sessions.id = bingo_players.session_id
        AND bingo_sessions.host_id = (select auth.uid())
    )
  );

-- ============================================================
-- Drop unused indexes
-- ============================================================

DROP INDEX IF EXISTS public.idx_game_rounds_game_id;
DROP INDEX IF EXISTS public.idx_game_rolls_game_id;
DROP INDEX IF EXISTS public.idx_game_rolls_player_id;
DROP INDEX IF EXISTS public.idx_dice_games_user_id;
DROP INDEX IF EXISTS public.idx_mp_sessions_winner_id;
DROP INDEX IF EXISTS public.idx_mp_players_user_id;
DROP INDEX IF EXISTS public.idx_mp_turns_player_id;
DROP INDEX IF EXISTS public.idx_mp_turns_session_id;
DROP INDEX IF EXISTS public.idx_player_records_user_id;
DROP INDEX IF EXISTS public.idx_bingo_sessions_code;
DROP INDEX IF EXISTS public.idx_bingo_sessions_host_id;
DROP INDEX IF EXISTS public.idx_bingo_sessions_status;
DROP INDEX IF EXISTS public.idx_friend_requests_receiver_id;
DROP INDEX IF EXISTS public.idx_bingo_players_session_id;
DROP INDEX IF EXISTS public.idx_bingo_players_user_id;
DROP INDEX IF EXISTS public.idx_card_game_player_state_player_id;
DROP INDEX IF EXISTS public.idx_card_game_turns_player_id;
DROP INDEX IF EXISTS public.idx_card_game_turns_session_id;
DROP INDEX IF EXISTS public.idx_card_game_round_scores_player_id;
