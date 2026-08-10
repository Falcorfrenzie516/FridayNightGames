/*
  # Fix Unindexed Foreign Keys and Unused Indexes

  ## Summary
  Adds covering indexes for all foreign key columns that lack them, and drops
  unused indexes on the friend_requests table to reduce write overhead.

  ## New Indexes
  - card_game_player_state.player_id
  - card_game_round_scores.player_id
  - card_game_turns.player_id
  - card_game_turns.session_id
  - dice_games.user_id
  - game_rolls.game_id
  - game_rolls.player_id
  - game_rounds.game_id
  - mp_players.user_id
  - mp_sessions.winner_id
  - mp_turns.player_id
  - mp_turns.session_id
  - player_records.user_id

  ## Removed Indexes
  - idx_friend_requests_sender (unused)
  - idx_friend_requests_receiver (unused)
  - idx_friend_requests_status (unused)
*/

CREATE INDEX IF NOT EXISTS idx_card_game_player_state_player_id
  ON public.card_game_player_state (player_id);

CREATE INDEX IF NOT EXISTS idx_card_game_round_scores_player_id
  ON public.card_game_round_scores (player_id);

CREATE INDEX IF NOT EXISTS idx_card_game_turns_player_id
  ON public.card_game_turns (player_id);

CREATE INDEX IF NOT EXISTS idx_card_game_turns_session_id
  ON public.card_game_turns (session_id);

CREATE INDEX IF NOT EXISTS idx_dice_games_user_id
  ON public.dice_games (user_id);

CREATE INDEX IF NOT EXISTS idx_game_rolls_game_id
  ON public.game_rolls (game_id);

CREATE INDEX IF NOT EXISTS idx_game_rolls_player_id
  ON public.game_rolls (player_id);

CREATE INDEX IF NOT EXISTS idx_game_rounds_game_id
  ON public.game_rounds (game_id);

CREATE INDEX IF NOT EXISTS idx_mp_players_user_id
  ON public.mp_players (user_id);

CREATE INDEX IF NOT EXISTS idx_mp_sessions_winner_id
  ON public.mp_sessions (winner_id);

CREATE INDEX IF NOT EXISTS idx_mp_turns_player_id
  ON public.mp_turns (player_id);

CREATE INDEX IF NOT EXISTS idx_mp_turns_session_id
  ON public.mp_turns (session_id);

CREATE INDEX IF NOT EXISTS idx_player_records_user_id
  ON public.player_records (user_id);

DROP INDEX IF EXISTS public.idx_friend_requests_sender;
DROP INDEX IF EXISTS public.idx_friend_requests_receiver;
DROP INDEX IF EXISTS public.idx_friend_requests_status;
