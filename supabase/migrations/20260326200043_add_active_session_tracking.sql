/*
  # Add active session tracking for single-login enforcement

  1. New Column
    - `active_session_token` on `profiles` table
      - Stores a random token that identifies the current active browser session
      - When a user logs in, a new token is generated and stored
      - Other tabs/sessions compare their token; if mismatched, they sign out

  2. Notes
    - This is a lightweight way to enforce one active login per user
    - Does not use additional tables; piggybacks on existing profiles
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active_session_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active_session_token text DEFAULT NULL;
  END IF;
END $$;
