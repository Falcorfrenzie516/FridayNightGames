import { supabase } from './supabase';
import { Card, Meld } from './cardGameLogic';
import { MpSession, MpPlayer } from './multiplayerService';

export type { MpSession, MpPlayer };

export interface CardGamePlayerState {
  id: string;
  session_id: string;
  player_id: string;
  hand: Card[];
  total_score: number;
  round_score: number;
  has_knocked: boolean;
  knock_turn: number | null;
  updated_at: string;
}

export interface CardGameRoundScore {
  id: string;
  session_id: string;
  player_id: string;
  round_number: number;
  penalty_points: number;
  went_out: boolean;
  melds: Meld[];
  leftover_cards: Card[];
  created_at: string;
}

export interface DeckState {
  stock: Card[];
  discard: Card[];
  dealerIndex: number;
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function create313Session(
  displayName: string,
  maxPlayers: number,
): Promise<{ session: MpSession; player: MpPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let code = randomCode();
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await supabase
      .from('mp_sessions')
      .select('id')
      .eq('code', code)
      .eq('status', 'waiting')
      .maybeSingle();
    if (!existing) break;
    code = randomCode();
  }

  const { data: session, error: sessionError } = await supabase
    .from('mp_sessions')
    .insert({
      code,
      host_id: user.id,
      target_score: 0,
      max_players: maxPlayers,
      game_type: '3-13',
      current_round: 1,
    })
    .select()
    .single();

  if (sessionError || !session) return null;

  const { data: player, error: playerError } = await supabase
    .from('mp_players')
    .insert({
      session_id: session.id,
      user_id: user.id,
      display_name: displayName,
      turn_order: 0,
    })
    .select()
    .single();

  if (playerError || !player) return null;

  return { session, player };
}

export async function join313Session(
  code: string,
  displayName: string,
): Promise<{ session: MpSession; player: MpPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from('mp_sessions')
    .select()
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .eq('game_type', '3-13')
    .maybeSingle();

  if (!session) return null;

  const { data: existingPlayers } = await supabase
    .from('mp_players')
    .select()
    .eq('session_id', session.id)
    .eq('is_active', true);

  const alreadyJoined = existingPlayers?.find(p => p.user_id === user.id);
  if (alreadyJoined) return { session, player: alreadyJoined };

  if ((existingPlayers?.length ?? 0) >= (session.max_players ?? 4)) return null;

  const { data: player, error } = await supabase
    .from('mp_players')
    .insert({
      session_id: session.id,
      user_id: user.id,
      display_name: displayName,
      turn_order: existingPlayers?.length ?? 1,
    })
    .select()
    .single();

  if (error || !player) return null;

  return { session, player };
}

export async function get313Players(sessionId: string): Promise<MpPlayer[]> {
  const { data } = await supabase
    .from('mp_players')
    .select()
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .order('turn_order', { ascending: true });
  return data ?? [];
}

export async function getMy313WaitingSession(): Promise<{ session: MpSession; player: MpPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from('mp_sessions')
    .select()
    .eq('host_id', user.id)
    .eq('status', 'waiting')
    .eq('game_type', '3-13')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return null;

  const { data: player } = await supabase
    .from('mp_players')
    .select()
    .eq('session_id', session.id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!player) return null;

  return { session, player };
}

export async function start313Session(
  sessionId: string,
  deckState: DeckState,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('mp_sessions')
    .update({
      status: 'active',
      game_started_at: now,
      updated_at: now,
      deck_state: deckState,
      current_round: 1,
      current_player_index: 0,
      knock_player_index: null,
    })
    .eq('id', sessionId);
  return !error;
}

export async function initPlayerState(
  sessionId: string,
  playerId: string,
  hand: Card[],
  totalScore: number = 0,
): Promise<boolean> {
  const { error } = await supabase
    .from('card_game_player_state')
    .upsert({
      session_id: sessionId,
      player_id: playerId,
      hand,
      total_score: totalScore,
      round_score: 0,
      has_knocked: false,
      knock_turn: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id,player_id' });
  return !error;
}

export async function getPlayerState(
  sessionId: string,
  playerId: string,
): Promise<CardGamePlayerState | null> {
  const { data } = await supabase
    .from('card_game_player_state')
    .select()
    .eq('session_id', sessionId)
    .eq('player_id', playerId)
    .maybeSingle();
  return data as CardGamePlayerState | null;
}

export async function getAllPlayerStates(sessionId: string): Promise<CardGamePlayerState[]> {
  const { data } = await supabase
    .from('card_game_player_state')
    .select()
    .eq('session_id', sessionId);
  return (data ?? []) as CardGamePlayerState[];
}

export async function updatePlayerHand(
  sessionId: string,
  playerId: string,
  hand: Card[],
): Promise<boolean> {
  const { error } = await supabase
    .from('card_game_player_state')
    .update({ hand, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('player_id', playerId);
  return !error;
}

export async function setPlayerKnocked(
  sessionId: string,
  playerId: string,
  knockTurn: number,
  deckState: DeckState,
): Promise<boolean> {
  const [stateRes, sessionRes] = await Promise.all([
    supabase
      .from('card_game_player_state')
      .update({ has_knocked: true, knock_turn: knockTurn, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('player_id', playerId),
    supabase
      .from('mp_sessions')
      .update({ knock_player_index: knockTurn, deck_state: deckState, updated_at: new Date().toISOString() })
      .eq('id', sessionId),
  ]);
  return !stateRes.error && !sessionRes.error;
}

export async function advanceCardTurn(
  sessionId: string,
  nextPlayerIndex: number,
  deckState: DeckState,
  knockPlayerIndex: number | null = null,
): Promise<boolean> {
  const update: Record<string, unknown> = {
    current_player_index: nextPlayerIndex,
    deck_state: deckState,
    updated_at: new Date().toISOString(),
  };
  if (knockPlayerIndex !== null) update.knock_player_index = knockPlayerIndex;
  const { error } = await supabase
    .from('mp_sessions')
    .update(update)
    .eq('id', sessionId);
  return !error;
}

export async function recordRoundScores(
  sessionId: string,
  scores: Array<{
    playerId: string;
    roundNumber: number;
    penaltyPoints: number;
    wentOut: boolean;
    melds: Meld[];
    leftoverCards: Card[];
  }>,
): Promise<boolean> {
  const rows = scores.map(s => ({
    session_id: sessionId,
    player_id: s.playerId,
    round_number: s.roundNumber,
    penalty_points: s.penaltyPoints,
    went_out: s.wentOut,
    melds: s.melds,
    leftover_cards: s.leftoverCards,
  }));
  const { error } = await supabase.from('card_game_round_scores').insert(rows);
  return !error;
}

export async function getRoundScores(sessionId: string): Promise<CardGameRoundScore[]> {
  const { data } = await supabase
    .from('card_game_round_scores')
    .select()
    .eq('session_id', sessionId)
    .order('round_number', { ascending: true });
  return (data ?? []) as CardGameRoundScore[];
}

export async function advanceRound(
  sessionId: string,
  nextRound: number,
  deckState: DeckState,
  dealerIndex: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('mp_sessions')
    .update({
      current_round: nextRound,
      current_player_index: dealerIndex,
      deck_state: deckState,
      knock_player_index: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  return !error;
}

export async function finish313Session(
  sessionId: string,
  winnerId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('mp_sessions')
    .update({ status: 'finished', winner_id: winnerId, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
  return !error;
}

export async function delete313Session(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mp_sessions')
    .update({ status: 'finished', updated_at: new Date().toISOString() })
    .eq('id', sessionId);
  return !error;
}

export async function getOpen313Lobbies(): Promise<Array<{
  id: string;
  code: string;
  max_players: number;
  expires_at: string;
  player_count: number;
  host_name: string;
}>> {
  const { data } = await supabase
    .from('mp_sessions')
    .select('id, code, max_players, expires_at, mp_players(display_name, turn_order, joined_at)')
    .eq('status', 'waiting')
    .eq('game_type', '3-13')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data) return [];

  return data.map((s: {
    id: string;
    code: string;
    max_players: number;
    expires_at: string;
    mp_players: { display_name: string; turn_order: number; joined_at: string }[];
  }) => ({
    id: s.id,
    code: s.code,
    max_players: s.max_players,
    expires_at: s.expires_at,
    player_count: s.mp_players?.length ?? 0,
    host_name: s.mp_players?.sort((a, b) => a.turn_order - b.turn_order)[0]?.display_name ?? 'Unknown',
  }));
}
