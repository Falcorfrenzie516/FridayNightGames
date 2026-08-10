/*
  # Add bot_difficulty to mp_players

  ## Changes
  - `mp_players`: new column `bot_difficulty` (text, nullable)
    - null for human players
    - 'easy', 'medium', or 'hard' for bot players

  ## Notes
  - No data migration needed; existing bots default to null (will be treated as medium)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_players' AND column_name = 'bot_difficulty'
  ) THEN
    ALTER TABLE mp_players ADD COLUMN bot_difficulty text DEFAULT NULL;
  END IF;
END $$;
