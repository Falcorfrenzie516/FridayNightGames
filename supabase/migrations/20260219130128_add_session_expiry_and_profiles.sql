/*
  # Add session expiry and user profiles

  ## Changes
  1. New Tables
    - `profiles` - stores display name for authenticated users
      - `id` (uuid, pk, references auth.users)
      - `display_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Modified Tables
    - `mp_sessions` - add `expires_at` column defaulting to 7 days from now

  3. Security
    - Enable RLS on `profiles`
    - Users can read/update their own profile
    - Users can insert their own profile
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mp_sessions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE mp_sessions ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
  END IF;
END $$;
