/*
  # Fix Unindexed Foreign Keys

  ## Summary
  Adds covering indexes for foreign key columns that were missing indexes.
  This improves query performance for JOIN operations and cascading lookups.

  ## New Indexes
  1. `game_rolls.game_id` - foreign key to games/dice_games
  2. `game_rolls.player_id` - foreign key to game_players
  3. `mp_sessions.host_id` - foreign key to auth.users
  4. `mp_sessions.winner_id` - foreign key to auth.users (nullable)
*/

CREATE INDEX IF NOT EXISTS idx_game_rolls_game_id ON public.game_rolls (game_id);
CREATE INDEX IF NOT EXISTS idx_game_rolls_player_id ON public.game_rolls (player_id);
CREATE INDEX IF NOT EXISTS idx_mp_sessions_host_id ON public.mp_sessions (host_id);
CREATE INDEX IF NOT EXISTS idx_mp_sessions_winner_id ON public.mp_sessions (winner_id);
