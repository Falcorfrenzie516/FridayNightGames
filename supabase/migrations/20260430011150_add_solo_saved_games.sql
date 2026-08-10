/*
  # Add solo saved games

  ## Summary
  Allows logged-in users to save and resume solo games in progress.
  One save slot per user per game type — new saves overwrite the previous one.

  ## New Tables
  - `solo_saved_games`
    - `id` uuid pk
    - `user_id` uuid references auth.users
    - `game_type` text — 'bones' | '3-13' | 'card-bingo'
    - `state` jsonb — full serialized game state
    - `saved_at` timestamptz — when last saved

  ## Security
  - RLS enabled
  - Users can only read, insert, update, and delete their own saved games
*/

CREATE TABLE IF NOT EXISTS solo_saved_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}',
  saved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solo_saved_games_user_game_type_unique UNIQUE (user_id, game_type)
);

ALTER TABLE solo_saved_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved games"
  ON solo_saved_games FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved games"
  ON solo_saved_games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved games"
  ON solo_saved_games FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved games"
  ON solo_saved_games FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_solo_saved_games_user ON solo_saved_games(user_id);
