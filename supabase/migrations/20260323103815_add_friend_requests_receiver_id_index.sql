/*
  # Add missing index on friend_requests.receiver_id

  ## Summary
  Adds a covering index for the friend_requests_receiver_id_fkey foreign key
  which was flagged as missing a covering index.

  ## New Indexes
  - friend_requests.receiver_id
*/

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id
  ON public.friend_requests (receiver_id);
