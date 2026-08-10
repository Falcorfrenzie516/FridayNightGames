/*
  # Add bot player support

  1. Changes
    - Adds `is_bot` boolean column to `mp_players` table (default false)
    - Bots are inserted with a special flag so the client can identify them and run their turns automatically

  2. Notes
    - No RLS changes needed; bots are inserted by authenticated users (the host) using the existing insert policy
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_players' AND column_name = 'is_bot'
  ) THEN
    ALTER TABLE mp_players ADD COLUMN is_bot boolean NOT NULL DEFAULT false;
  END IF;
END $$;
