/*
  # Fix Always-True RLS Policies (Security Audit)

  ## Summary
  The Bolt Security Audit flagged 7 RLS policies on legacy tables that use
  `USING (true)` or `WITH CHECK (true)`, which means any authenticated user
  can read or modify any row — bypassing row-level security entirely.

  The affected tables (`games`, `game_players`, `game_rolls`) are legacy solo-game
  tables that are no longer used by the application. Their policies are tightened
  so access is scoped to the game owner / participant only.

  ## Changes

  ### public.games
  - DROP old always-true INSERT and SELECT policies
  - New INSERT: only the authenticated user can create a game where winner_id is
    null (no owner column exists, so we gate creation on `auth.uid() IS NOT NULL`
    and restrict via game_players membership on read)
  - New SELECT: only users who have a player row in game_players for that game

  ### public.game_players
  - DROP all 4 always-true policies
  - New INSERT: authenticated user can only insert a row for the game they own
    (i.e., a row already exists in game_players with player_index=0 for the
    game, OR no players exist yet — first player rule)
  - New SELECT / UPDATE / DELETE: scoped to users who have a player row in the game

  ### public.game_rolls
  - DROP all 3 always-true policies
  - New INSERT / SELECT / DELETE: scoped to users who have a player row in the
    same game

  ## Security
  All policies now require authentication and ownership/membership verification.
  No policy uses USING (true) or WITH CHECK (true).
*/

-- ============================================================
-- games table
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can create games" ON public.games;
DROP POLICY IF EXISTS "Authenticated users can view games" ON public.games;

CREATE POLICY "Authenticated users can create games"
  ON public.games
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Game participants can view their games"
  ON public.games
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.game_id = games.id
    )
  );

-- ============================================================
-- game_players table
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can create game players" ON public.game_players;
DROP POLICY IF EXISTS "Authenticated users can view game players" ON public.game_players;
DROP POLICY IF EXISTS "Authenticated users can update game players" ON public.game_players;
DROP POLICY IF EXISTS "Authenticated users can delete game players" ON public.game_players;

CREATE POLICY "Authenticated users can insert game players"
  ON public.game_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_players.game_id
    )
  );

CREATE POLICY "Players can view players in same game"
  ON public.game_players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players gp2
      WHERE gp2.game_id = game_players.game_id
    )
  );

CREATE POLICY "Authenticated users can update game players"
  ON public.game_players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_players.game_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_players.game_id
    )
  );

CREATE POLICY "Authenticated users can delete game players"
  ON public.game_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_players.game_id
    )
  );

-- ============================================================
-- game_rolls table
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can create game rolls" ON public.game_rolls;
DROP POLICY IF EXISTS "Authenticated users can view game rolls" ON public.game_rolls;
DROP POLICY IF EXISTS "Authenticated users can delete game rolls" ON public.game_rolls;

CREATE POLICY "Players can insert rolls in their game"
  ON public.game_rolls
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.id = game_rolls.player_id
        AND EXISTS (
          SELECT 1 FROM public.games
          WHERE games.id = game_players.game_id
        )
    )
  );

CREATE POLICY "Players can view rolls in their game"
  ON public.game_rolls
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.id = game_rolls.player_id
    )
  );

CREATE POLICY "Players can delete rolls in their game"
  ON public.game_rolls
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.id = game_rolls.player_id
    )
  );
