/*
  # Add game_type to player_records

  ## Changes
  - Adds `game_type` column to `player_records` to distinguish between:
    - 'bones' (Dice game - solo)
    - '3-13' (Card game 3-13)
    - 'card-bingo' (Card Bingo)
  - Backfills existing rows (all were Bones / solo dice game) with game_type = 'bones'
  - Adds cleared_at tracking: a `cleared_at` timestamp per user per game_type
    so users can "clear" their scoreboard without deleting rows

  ## New Tables
  - `player_record_clears` — tracks when a user cleared their stats for a given game_type
    - `id` uuid pk
    - `user_id` uuid references auth.users
    - `game_type` text
    - `cleared_at` timestamptz

  ## Security
  - RLS enabled on `player_record_clears`
  - Users can only read/insert/delete their own clear records
*/

-- Add game_type column to player_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_records' AND column_name = 'game_type'
  ) THEN
    ALTER TABLE player_records ADD COLUMN game_type text NOT NULL DEFAULT 'bones';
  END IF;
END $$;

-- Backfill existing rows
UPDATE player_records SET game_type = 'bones' WHERE game_type = 'bones';

-- Create clear tracking table
CREATE TABLE IF NOT EXISTS player_record_clears (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  cleared_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE player_record_clears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own clears"
  ON player_record_clears FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clears"
  ON player_record_clears FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clears"
  ON player_record_clears FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_player_record_clears_user_game ON player_record_clears(user_id, game_type);
