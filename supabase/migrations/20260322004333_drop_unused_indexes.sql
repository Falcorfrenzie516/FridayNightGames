/*
  # Drop unused indexes

  Removes all indexes flagged as unused by the security audit.
  These indexes consume storage and write overhead without providing query benefits.

  Tables affected:
  - game_rounds, game_rolls, dice_games
  - mp_players, mp_sessions, mp_turns
  - player_records
  - card_game_player_state, card_game_turns, card_game_round_scores
*/

DROP INDEX IF EXISTS public.idx_game_rounds_game_id;
DROP INDEX IF EXISTS public.idx_game_rolls_game_id;
DROP INDEX IF EXISTS public.idx_game_rolls_player_id;
DROP INDEX IF EXISTS public.idx_dice_games_user_id;
DROP INDEX IF EXISTS public.idx_mp_players_session_id;
DROP INDEX IF EXISTS public.idx_mp_players_user_id;
DROP INDEX IF EXISTS public.idx_mp_sessions_winner_id;
DROP INDEX IF EXISTS public.idx_mp_turns_player_id;
DROP INDEX IF EXISTS public.idx_mp_turns_session_id;
DROP INDEX IF EXISTS public.idx_player_records_user_id;
DROP INDEX IF EXISTS public.idx_card_game_player_state_session;
DROP INDEX IF EXISTS public.idx_card_game_player_state_player_id;
DROP INDEX IF EXISTS public.idx_card_game_turns_session;
DROP INDEX IF EXISTS public.idx_card_game_turns_player_id;
DROP INDEX IF EXISTS public.idx_card_game_round_scores_session;
DROP INDEX IF EXISTS public.idx_card_game_round_scores_player_id;
