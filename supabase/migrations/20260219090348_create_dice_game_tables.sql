/*
  # Create Dice Game Tables

  1. New Tables
    - `dice_games` - Stores game sessions
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `status` (text: 'active' or 'completed')
      - `total_points` (integer, starting at 0)
      - `round_number` (integer, current round)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `game_rounds` - Stores individual round results
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to dice_games)
      - `round_number` (integer)
      - `dice_rolls` (integer array - the dice values rolled)
      - `points_earned` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only see their own games and rounds
*/

CREATE TABLE IF NOT EXISTS dice_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  total_points integer NOT NULL DEFAULT 0,
  round_number integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES dice_games(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  dice_rolls integer[] NOT NULL,
  points_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dice_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own games"
  ON dice_games FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create games"
  ON dice_games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games"
  ON dice_games FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own game rounds"
  ON game_rounds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dice_games
      WHERE dice_games.id = game_rounds.game_id
      AND dice_games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rounds in own games"
  ON game_rounds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dice_games
      WHERE dice_games.id = game_rounds.game_id
      AND dice_games.user_id = auth.uid()
    )
  );

CREATE INDEX idx_dice_games_user_id ON dice_games(user_id);
CREATE INDEX idx_game_rounds_game_id ON game_rounds(game_id);
