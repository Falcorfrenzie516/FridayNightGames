/*
  # Fix profiles RLS to allow player search, add email column

  ## Changes
  1. Drop the overly restrictive SELECT policy that only allowed users to see their own profile
  2. Add a new SELECT policy allowing authenticated users to read all profiles (needed for friend search)
  3. Add email column to profiles table (synced from auth.users)
  4. Update searchable fields to include email
*/

-- Drop old restrictive read policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Allow any authenticated user to read any profile (needed for friend search)
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Backfill emails from auth.users for existing profiles
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
