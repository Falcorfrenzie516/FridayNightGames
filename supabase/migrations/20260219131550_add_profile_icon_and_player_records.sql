/*
  # Add profile icon and player records

  ## Summary
  Extends the profiles table with a display icon selection and adds a player_records
  table to track win/loss statistics for both solo and multiplayer game modes.

  ## Changes

  ### Modified Tables
  - `profiles`
    - `display_icon` (text) - chosen icon identifier (e.g. 'bone', 'star', 'flame'), defaults to 'bone'

  ### New Tables
  - `player_records`
    - `id` (uuid, pk)
    - `user_id` (uuid, references auth.users) - the player
    - `game_mode` (text) - 'solo' or 'multiplayer'
    - `result` (text) - 'win' or 'loss'
    - `score` (integer) - final score achieved
    - `created_at` (timestamptz)

  ## Security
  - Enable RLS on `player_records`
  - Users can insert their own records
  - Users can read their own records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'display_icon'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_icon text NOT NULL DEFAULT 'bone';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS player_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_mode text NOT NULL CHECK (game_mode IN ('solo', 'multiplayer')),
  result text NOT NULL CHECK (result IN ('win', 'loss')),
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE player_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own records"
  ON player_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own records"
  ON player_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS player_records_user_id_idx ON player_records(user_id);
CREATE INDEX IF NOT EXISTS player_records_game_mode_idx ON player_records(user_id, game_mode);
