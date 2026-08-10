/*
  # Fix RLS Auth Initialization Plan

  ## Summary
  Replaces `auth.uid()` with `(select auth.uid())` in all RLS policies.
  This prevents re-evaluation of the auth function for each row, significantly
  improving query performance at scale by evaluating the function once per query.

  ## Tables Affected
  - `dice_games` - 3 policies
  - `game_rounds` - 2 policies
  - `mp_sessions` - 3 policies
  - `mp_players` - 3 policies
  - `mp_turns` - 2 policies
  - `profiles` - 3 policies
  - `player_records` - 2 policies
*/

-- dice_games policies
DROP POLICY IF EXISTS "Users can view own games" ON public.dice_games;
DROP POLICY IF EXISTS "Users can create games" ON public.dice_games;
DROP POLICY IF EXISTS "Users can update own games" ON public.dice_games;

CREATE POLICY "Users can view own games"
  ON public.dice_games FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create games"
  ON public.dice_games FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own games"
  ON public.dice_games FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- game_rounds policies
DROP POLICY IF EXISTS "Users can view own game rounds" ON public.game_rounds;
DROP POLICY IF EXISTS "Users can create rounds in own games" ON public.game_rounds;

CREATE POLICY "Users can view own game rounds"
  ON public.game_rounds FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM dice_games
    WHERE dice_games.id = game_rounds.game_id
      AND dice_games.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can create rounds in own games"
  ON public.game_rounds FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM dice_games
    WHERE dice_games.id = game_rounds.game_id
      AND dice_games.user_id = (select auth.uid())
  ));

-- mp_sessions policies
DROP POLICY IF EXISTS "Host can create session" ON public.mp_sessions;
DROP POLICY IF EXISTS "Host can update session" ON public.mp_sessions;
DROP POLICY IF EXISTS "Authenticated can view waiting or own sessions" ON public.mp_sessions;

CREATE POLICY "Host can create session"
  ON public.mp_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Host can update session"
  ON public.mp_sessions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = host_id)
  WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Authenticated can view waiting or own sessions"
  ON public.mp_sessions FOR SELECT
  TO authenticated
  USING (
    status = 'waiting'
    OR host_id = (select auth.uid())
    OR id IN (SELECT get_my_session_ids())
  );

-- mp_players policies
DROP POLICY IF EXISTS "Users can insert own player row" ON public.mp_players;
DROP POLICY IF EXISTS "Users can update own player row" ON public.mp_players;
DROP POLICY IF EXISTS "Authenticated can view players in waiting or own sessions" ON public.mp_players;

CREATE POLICY "Users can insert own player row"
  ON public.mp_players FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own player row"
  ON public.mp_players FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Authenticated can view players in waiting or own sessions"
  ON public.mp_players FOR SELECT
  TO authenticated
  USING (session_id IN (
    SELECT mp_sessions.id FROM mp_sessions
    WHERE mp_sessions.status = 'waiting'
      OR mp_sessions.host_id = (select auth.uid())
      OR mp_sessions.id IN (SELECT get_my_session_ids())
  ));

-- mp_turns policies
DROP POLICY IF EXISTS "Session members can view turns" ON public.mp_turns;
DROP POLICY IF EXISTS "Active player can insert own turns" ON public.mp_turns;

CREATE POLICY "Session members can view turns"
  ON public.mp_turns FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mp_players
    WHERE mp_players.session_id = mp_turns.session_id
      AND mp_players.user_id = (select auth.uid())
  ));

CREATE POLICY "Active player can insert own turns"
  ON public.mp_turns FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM mp_players
    WHERE mp_players.id = mp_turns.player_id
      AND mp_players.user_id = (select auth.uid())
  ));

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- player_records policies
DROP POLICY IF EXISTS "Users can view own records" ON public.player_records;
DROP POLICY IF EXISTS "Users can insert own records" ON public.player_records;

CREATE POLICY "Users can view own records"
  ON public.player_records FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own records"
  ON public.player_records FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
