/*
  # Fix RLS Auth Initialization Plan & Drop Unused Indexes

  ## Summary
  Two categories of issues addressed:

  1. **RLS Auth Initialization Plan** - Four policies were calling auth.uid() inline,
     causing it to be re-evaluated per row instead of once per query. Replaced with
     (select auth.uid()) so Postgres can cache the value across all rows.

  2. **Unused Indexes** - 14 indexes that have never been used are dropped to reduce
     write overhead and storage bloat. These can be re-added if query patterns change.

  ## Changes

  ### RLS Policy Fixes
  - public.mp_players: "Users can insert player row" — wrap auth.uid() calls
  - public.mp_players: "Host can remove players from waiting session" — wrap auth.uid()
  - public.games: "Authenticated users can create games" — wrap auth.uid()
  - public.game_players: "Authenticated users can insert game players" — wrap auth.uid()

  ### Dropped Indexes
  - idx_dice_games_user_id
  - idx_game_rounds_game_id
  - idx_game_rolls_game_id
  - idx_game_rolls_player_id
  - idx_mp_sessions_code
  - idx_mp_sessions_status
  - idx_mp_players_session_id
  - idx_mp_players_user_id
  - idx_mp_turns_session_id
  - idx_mp_turns_player_id
  - idx_mp_sessions_host_id
  - idx_mp_sessions_winner_id
  - player_records_user_id_idx
  - player_records_game_mode_idx
*/

-- ============================================================
-- mp_players: "Users can insert player row"
-- ============================================================
DROP POLICY IF EXISTS "Users can insert player row" ON public.mp_players;

CREATE POLICY "Users can insert player row"
  ON public.mp_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (((user_id = (select auth.uid())) AND (is_bot = false))
    OR
    ((is_bot = true) AND (user_id IS NULL) AND (EXISTS (
      SELECT 1 FROM mp_sessions
      WHERE mp_sessions.id = mp_players.session_id
        AND mp_sessions.host_id = (select auth.uid())
        AND mp_sessions.status = 'waiting'
    ))))
  );

-- ============================================================
-- mp_players: "Host can remove players from waiting session"
-- ============================================================
DROP POLICY IF EXISTS "Host can remove players from waiting session" ON public.mp_players;

CREATE POLICY "Host can remove players from waiting session"
  ON public.mp_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_sessions
      WHERE mp_sessions.id = mp_players.session_id
        AND mp_sessions.host_id = (select auth.uid())
        AND mp_sessions.status = 'waiting'
    )
  );

-- ============================================================
-- games: "Authenticated users can create games"
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create games" ON public.games;

CREATE POLICY "Authenticated users can create games"
  ON public.games
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================================
-- game_players: "Authenticated users can insert game players"
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert game players" ON public.game_players;

CREATE POLICY "Authenticated users can insert game players"
  ON public.game_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_players.game_id
    )
  );

-- ============================================================
-- Drop unused indexes
-- ============================================================
DROP INDEX IF EXISTS public.idx_dice_games_user_id;
DROP INDEX IF EXISTS public.idx_game_rounds_game_id;
DROP INDEX IF EXISTS public.idx_game_rolls_game_id;
DROP INDEX IF EXISTS public.idx_game_rolls_player_id;
DROP INDEX IF EXISTS public.idx_mp_sessions_code;
DROP INDEX IF EXISTS public.idx_mp_sessions_status;
DROP INDEX IF EXISTS public.idx_mp_players_session_id;
DROP INDEX IF EXISTS public.idx_mp_players_user_id;
DROP INDEX IF EXISTS public.idx_mp_turns_session_id;
DROP INDEX IF EXISTS public.idx_mp_turns_player_id;
DROP INDEX IF EXISTS public.idx_mp_sessions_host_id;
DROP INDEX IF EXISTS public.idx_mp_sessions_winner_id;
DROP INDEX IF EXISTS public.player_records_user_id_idx;
DROP INDEX IF EXISTS public.player_records_game_mode_idx;
