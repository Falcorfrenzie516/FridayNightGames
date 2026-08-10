/*
  # Add Missing Foreign Key Indexes

  ## Summary
  Several tables have foreign key columns without covering indexes, causing suboptimal
  query performance when joining or filtering on these columns.

  ## Changes
  - Add index on `card_game_player_state.player_id`
  - Add index on `card_game_round_scores.player_id`
  - Add index on `card_game_turns.player_id`
  - Add index on `dice_games.user_id`
  - Add index on `game_rolls.game_id`
  - Add index on `game_rolls.player_id`
  - Add index on `game_rounds.game_id`
  - Add index on `mp_players.session_id`
  - Add index on `mp_players.user_id`
  - Add index on `mp_sessions.host_id`
  - Add index on `mp_sessions.winner_id`
  - Add index on `mp_turns.player_id`
  - Add index on `mp_turns.session_id`
  - Add index on `player_records.user_id`

  ## Notes
  - All indexes use IF NOT EXISTS to be idempotent
*/

CREATE INDEX IF NOT EXISTS idx_card_game_player_state_player_id ON public.card_game_player_state(player_id);
CREATE INDEX IF NOT EXISTS idx_card_game_round_scores_player_id ON public.card_game_round_scores(player_id);
CREATE INDEX IF NOT EXISTS idx_card_game_turns_player_id ON public.card_game_turns(player_id);
CREATE INDEX IF NOT EXISTS idx_dice_games_user_id ON public.dice_games(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rolls_game_id ON public.game_rolls(game_id);
CREATE INDEX IF NOT EXISTS idx_game_rolls_player_id ON public.game_rolls(player_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_game_id ON public.game_rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_mp_players_session_id ON public.mp_players(session_id);
CREATE INDEX IF NOT EXISTS idx_mp_players_user_id ON public.mp_players(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_sessions_host_id ON public.mp_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_mp_sessions_winner_id ON public.mp_sessions(winner_id);
CREATE INDEX IF NOT EXISTS idx_mp_turns_player_id ON public.mp_turns(player_id);
CREATE INDEX IF NOT EXISTS idx_mp_turns_session_id ON public.mp_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_player_records_user_id ON public.player_records(user_id);
