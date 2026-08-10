/*
  # Add Target Score Column

  1. Changes
    - Add `target_score` column to `dice_games` table
      - `target_score` (integer, default 10000)
      - Allows players to customize winning score between 10000-50000

  2. Notes
    - This enables variable game length based on player preference
    - Default value ensures existing games remain functional
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dice_games' AND column_name = 'target_score'
  ) THEN
    ALTER TABLE dice_games ADD COLUMN target_score integer NOT NULL DEFAULT 10000;
  END IF;
END $$;
