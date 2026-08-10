/*
  # Card Bingo Game Tables

  ## Summary
  Creates all tables needed to support the Card Bingo (Pokeno-style) game,
  both solo and multiplayer modes.

  ## New Tables

  ### bingo_sessions
  Stores multiplayer bingo game sessions.
  - id: UUID primary key
  - code: 4-char join code
  - host_id: references auth.users
  - status: waiting | active | finished
  - win_category: 'basic' | 'spring'
  - win_condition: the name of the win pattern (e.g. 'LINE', 'PLUS_SIGN')
  - current_card: the currently flipped playing card (JSONB)
  - flipped_cards: array of all flipped cards so far (JSONB)
  - winner_id: references bingo_players when someone wins
  - max_players: 2-12
  - boards_per_player: 1-4
  - last_flip_at: timestamp of last card flip
  - created_at, expires_at

  ### bingo_players
  Each participant in a bingo session.
  - id, session_id, user_id, display_name
  - boards: JSONB array of 1-4 boards (each board is a 5x5 grid of cards)
  - daubs: JSONB - per-board daub state { boardIndex: [cellIndex...] }
  - is_active, joined_at

  ## Security
  - RLS enabled on all tables
  - Authenticated users can manage their own data
*/

CREATE TABLE IF NOT EXISTS bingo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  win_category text NOT NULL DEFAULT 'basic',
  win_condition text NOT NULL DEFAULT 'LINE',
  current_card jsonb,
  flipped_cards jsonb NOT NULL DEFAULT '[]',
  winner_id uuid,
  max_players int NOT NULL DEFAULT 8,
  boards_per_player int NOT NULL DEFAULT 1 CHECK (boards_per_player BETWEEN 1 AND 4),
  last_flip_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '2 hours')
);

CREATE INDEX IF NOT EXISTS idx_bingo_sessions_code ON bingo_sessions (code);
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_host_id ON bingo_sessions (host_id);
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_status ON bingo_sessions (status);

ALTER TABLE bingo_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS bingo_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  boards jsonb NOT NULL DEFAULT '[]',
  daubs jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bingo_players_session_id ON bingo_players (session_id);
CREATE INDEX IF NOT EXISTS idx_bingo_players_user_id ON bingo_players (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bingo_players_session_user ON bingo_players (session_id, user_id);

ALTER TABLE bingo_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create bingo sessions"
  ON bingo_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Players in session can view bingo session"
  ON bingo_sessions FOR SELECT
  TO authenticated
  USING (
    status = 'waiting'
    OR host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bingo_players
      WHERE bingo_players.session_id = bingo_sessions.id
      AND bingo_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Host can update bingo session"
  ON bingo_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can delete bingo session"
  ON bingo_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Players can join bingo sessions"
  ON bingo_players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players in session can view all bingo players"
  ON bingo_players FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bingo_players bp2
      WHERE bp2.session_id = bingo_players.session_id
      AND bp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update their own bingo player row"
  ON bingo_players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can delete their own bingo player row"
  ON bingo_players FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Host can delete bingo players"
  ON bingo_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bingo_sessions
      WHERE bingo_sessions.id = bingo_players.session_id
      AND bingo_sessions.host_id = auth.uid()
    )
  );
