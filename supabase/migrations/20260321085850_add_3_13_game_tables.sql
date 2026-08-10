/*
  # Add 3-13 Card Game Tables

  ## Summary
  Adds all database tables needed to support the 3-13 rummy card game, including:
  - Session management (reuses existing mp_sessions with a game_type column)
  - Per-player hand/state storage for card game
  - Turn history for card game actions
  - Round tracking

  ## New Tables

  ### card_game_player_state
  Stores the current hand and round state for each player in a 3-13 game session.
  - `id` - UUID primary key
  - `session_id` - References mp_sessions
  - `player_id` - References mp_players
  - `hand` - JSONB array of cards currently in hand
  - `round_score` - Points accumulated this round (penalty cards)
  - `total_score` - Cumulative score across all rounds (lower is better)
  - `has_knocked` - Whether this player has knocked (gone out) this round
  - `knock_turn` - Turn number when player knocked
  - `updated_at` - Last update timestamp

  ### card_game_turns
  Records every turn action in a 3-13 game.
  - `id` - UUID primary key
  - `session_id` - References mp_sessions
  - `player_id` - References mp_players
  - `round_number` - Which round (1-11, corresponding to 3-13 cards)
  - `turn_number` - Sequential turn within the session
  - `action` - Type: 'draw_deck', 'draw_discard', 'knock', 'discard'
  - `card_drawn` - Card that was drawn (nullable)
  - `card_discarded` - Card that was discarded
  - `hand_after` - Full hand state after this action
  - `created_at` - Timestamp

  ### card_game_round_scores
  Records end-of-round scoring for each player.
  - `id` - UUID primary key
  - `session_id` - References mp_sessions
  - `player_id` - References mp_players
  - `round_number` - Which round (1-11)
  - `penalty_points` - Points scored (penalty for unmelded cards)
  - `went_out` - Whether this player knocked/went out
  - `melds` - JSONB array of final melds shown
  - `leftover_cards` - JSONB array of unmelded cards
  - `created_at` - Timestamp

  ## Modified Tables

  ### mp_sessions
  - Adds `game_type` column (default 'bones') to distinguish game types
  - Adds `current_round` column for card game round tracking
  - Adds `deck_state` JSONB column to persist shuffled deck and discard pile
  - Adds `knock_player_index` to track who knocked and one-more-turn countdown

  ## Security
  - RLS enabled on all new tables
  - Players can only see/update their own state
  - Session members can view round scores
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'game_type'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN game_type text NOT NULL DEFAULT 'bones';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'current_round'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN current_round integer NOT NULL DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'deck_state'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN deck_state jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'knock_player_index'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN knock_player_index integer;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS card_game_player_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES mp_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES mp_players(id) ON DELETE CASCADE,
  hand jsonb NOT NULL DEFAULT '[]',
  total_score integer NOT NULL DEFAULT 0,
  round_score integer NOT NULL DEFAULT 0,
  has_knocked boolean NOT NULL DEFAULT false,
  knock_turn integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_id)
);

ALTER TABLE card_game_player_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session members can view card player state"
  ON card_game_player_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = card_game_player_state.session_id
        AND mp_players.user_id = auth.uid()
        AND mp_players.is_active = true
    )
  );

CREATE POLICY "Players can insert own card state"
  ON card_game_player_state FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.id = card_game_player_state.player_id
        AND mp_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update own card state"
  ON card_game_player_state FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.id = card_game_player_state.player_id
        AND mp_players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.id = card_game_player_state.player_id
        AND mp_players.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS card_game_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES mp_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES mp_players(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  turn_number integer NOT NULL,
  action text NOT NULL,
  card_drawn jsonb,
  card_discarded jsonb,
  hand_after jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_game_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session members can view card turns"
  ON card_game_turns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = card_game_turns.session_id
        AND mp_players.user_id = auth.uid()
        AND mp_players.is_active = true
    )
  );

CREATE POLICY "Players can insert own card turns"
  ON card_game_turns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.id = card_game_turns.player_id
        AND mp_players.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS card_game_round_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES mp_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES mp_players(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  penalty_points integer NOT NULL DEFAULT 0,
  went_out boolean NOT NULL DEFAULT false,
  melds jsonb NOT NULL DEFAULT '[]',
  leftover_cards jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_id, round_number)
);

ALTER TABLE card_game_round_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session members can view round scores"
  ON card_game_round_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.session_id = card_game_round_scores.session_id
        AND mp_players.user_id = auth.uid()
        AND mp_players.is_active = true
    )
  );

CREATE POLICY "Players can insert own round scores"
  ON card_game_round_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_players
      WHERE mp_players.id = card_game_round_scores.player_id
        AND mp_players.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_card_game_player_state_session ON card_game_player_state(session_id);
CREATE INDEX IF NOT EXISTS idx_card_game_turns_session ON card_game_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_card_game_round_scores_session ON card_game_round_scores(session_id);
