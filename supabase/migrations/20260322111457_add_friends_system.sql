/*
  # Add Friends System

  ## Summary
  Creates a friends/follow system where users can send and accept friend requests.

  ## New Tables

  ### `friend_requests`
  - `id` (uuid, pk) - unique identifier
  - `sender_id` (uuid, fk auth.users) - user who sent the request
  - `receiver_id` (uuid, fk auth.users) - user who received the request
  - `status` (text) - 'pending', 'accepted', or 'rejected'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled with policies ensuring users can only see their own requests
  - Senders can insert new requests
  - Both parties can view requests they are involved in
  - Receivers can update (accept/reject) requests
  - Either party can delete a friendship

  ## Notes
  - Unique constraint prevents duplicate requests between same pair
  - A check ensures you cannot send a request to yourself
*/

CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_friend CHECK (sender_id <> receiver_id),
  CONSTRAINT unique_friend_pair UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend requests"
  ON friend_requests
  FOR SELECT
  TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    OR receiver_id = (SELECT auth.uid())
  );

CREATE POLICY "Users can send friend requests"
  ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
  );

CREATE POLICY "Receivers can update friend request status"
  ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (receiver_id = (SELECT auth.uid()))
  WITH CHECK (receiver_id = (SELECT auth.uid()));

CREATE POLICY "Either party can delete a friendship"
  ON friend_requests
  FOR DELETE
  TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    OR receiver_id = (SELECT auth.uid())
  );
