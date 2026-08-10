/*
  # Add Multiplayer Support

  ## Overview
  Adds tables and policies to support turn-based multiplayer sessions where 2-4 players
  take turns rolling dice, with real-time updates via Supabase Realtime.

  ## New Tables

  ### `mp_sessions`
  A multiplayer game lobby/session. One player creates it, others join via a 4-character code.

  ### `mp_players`
  One row per player per session.

  ### `mp_turns`
  Records each completed turn for history and state replay.

  ## Security
  - RLS enabled on all new tables
  - Players can only read/write sessions they are part of
*/

-- mp_sessions table
CREATE TABLE IF NOT EXISTS mp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  target_score integer NOT NULL DEFAULT 10000,
  current_player_index integer NOT NULL DEFAULT 0,
  winner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host can create session"
  ON mp_sessions FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host can update session"
  ON mp_sessions FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- mp_players table
CREATE TABLE IF NOT EXISTS mp_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES mp_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  turn_order integer NOT NULL DEFAULT 0,
  banked_points integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now()
);

ALTER TABLE mp_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session members can view players"
  ON mp_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_players p2
      WHERE p2.session_id = mp_players.session_id
        AND p2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own player row"
  ON mp_players FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own player row"
  ON mp_players FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Now add the session SELECT policy that depends on mp_players
CREATE POLICY "Session members can view session"
  ON mp_sessions FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = mp_sessions.id
        AND mp_players.user_id = auth.uid()
    )
  );

-- mp_turns table
CREATE TABLE IF NOT EXISTS mp_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES mp_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES mp_players(id) ON DELETE CASCADE,
  turn_number integer NOT NULL DEFAULT 1,
  tray_dice jsonb NOT NULL DEFAULT '[]',
  points_scored integer NOT NULL DEFAULT 0,
  was_banked boolean NOT NULL DEFAULT false,
  was_lost boolean NOT NULL DEFAULT false,
  bust_roll integer[] DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mp_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session members can view turns"
  ON mp_turns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = mp_turns.session_id
        AND mp_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Active player can insert own turns"
  ON mp_turns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.id = mp_turns.player_id
        AND mp_players.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mp_sessions_code ON mp_sessions(code);
CREATE INDEX IF NOT EXISTS idx_mp_sessions_status ON mp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mp_players_session_id ON mp_players(session_id);
CREATE INDEX IF NOT EXISTS idx_mp_players_user_id ON mp_players(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_turns_session_id ON mp_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_mp_turns_player_id ON mp_turns(player_id);
