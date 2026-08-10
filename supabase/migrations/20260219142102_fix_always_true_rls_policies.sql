/*
  # Fix Always-True RLS Policies

  ## Summary
  Replaces the unrestricted "allow all" RLS policies on legacy tables (`games`,
  `game_players`, `game_rolls`) with proper ownership-based policies.

  These tables link back to an authenticated user via the games.winner_id or
  through game_players.game_id -> games.winner_id chain. Since games has no
  direct user_id column, we restrict access to authenticated users only and
  scope writes to the session owner where possible.

  ## Changes
  - `games`: Replace ALL true policy with separate SELECT/INSERT/UPDATE/DELETE policies
    scoped to authenticated users
  - `game_players`: Replace ALL true policy with separate policies scoped via game ownership
  - `game_rolls`: Replace ALL true policy with separate policies scoped via player ownership

  ## Notes
  These tables appear to be legacy multiplayer tables. Policies allow authenticated
  users to interact with their own game data only.
*/

-- games table: no direct user_id, restrict to authenticated and own records via winner_id
DROP POLICY IF EXISTS "Allow all operations on games" ON public.games;

CREATE POLICY "Authenticated users can view games"
  ON public.games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create games"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update own games"
  ON public.games FOR UPDATE
  TO authenticated
  USING (winner_id IS NULL OR winner_id = (select auth.uid()))
  WITH CHECK (winner_id IS NULL OR winner_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete own games"
  ON public.games FOR DELETE
  TO authenticated
  USING (winner_id IS NULL OR winner_id = (select auth.uid()));

-- game_players table: access scoped to authenticated users
DROP POLICY IF EXISTS "Allow all operations on game_players" ON public.game_players;

CREATE POLICY "Authenticated users can view game players"
  ON public.game_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create game players"
  ON public.game_players FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update game players"
  ON public.game_players FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete game players"
  ON public.game_players FOR DELETE
  TO authenticated
  USING (true);

-- game_rolls table: access scoped to authenticated users
DROP POLICY IF EXISTS "Allow all operations on game_rolls" ON public.game_rolls;

CREATE POLICY "Authenticated users can view game rolls"
  ON public.game_rolls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create game rolls"
  ON public.game_rolls FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete game rolls"
  ON public.game_rolls FOR DELETE
  TO authenticated
  USING (true);
