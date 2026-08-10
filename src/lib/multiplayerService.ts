import { supabase } from './supabase';

export interface MpSession {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'active' | 'finished';
  target_score: number;
  max_players: number;
  current_player_index: number;
  winner_id: string | null;
  turn_time_limit: number | null;
  game_started_at: string | null;
  expired: boolean;
  game_type?: string;
  current_round?: number;
  deck_state?: unknown;
  knock_player_index?: number | null;
  created_at: string;
  updated_at: string;
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface MpPlayer {
  id: string;
  session_id: string;
  user_id: string | null;
  display_name: string;
  turn_order: number;
  banked_points: number;
  is_active: boolean;
  is_bot: boolean;
  bot_difficulty: BotDifficulty | null;
  joined_at: string;
}

export interface MpTurn {
  id: string;
  session_id: string;
  player_id: string;
  turn_number: number;
  tray_dice: number[][][];
  points_scored: number;
  was_banked: boolean;
  was_lost: boolean;
  bust_roll: number[] | null;
  created_at: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createSession(
  displayName: string,
  targetScore: number,
  maxPlayers = 4,
  turnTimeLimit: number | null = null,
  gameType = 'bones',
): Promise<{ session: MpSession; player: MpPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from('mp_sessions')
      .select('id')
      .eq('code', code)
      .eq('status', 'waiting')
      .maybeSingle();
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const { data: session, error: sessionError } = await supabase
    .from('mp_sessions')
    .insert({ code, host_id: user.id, target_score: targetScore, max_players: maxPlayers, turn_time_limit: turnTimeLimit, game_type: gameType })
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

export interface LobbySession {
  id: string;
  code: string;
  host_id: string;
  host_name: string;
  game_type: string;
  target_score: number;
  max_players: number;
  player_count: number;
  turn_time_limit: number | null;
  created_at: string;
}

export async function getOpenLobbies(): Promise<LobbySession[]> {
  const { data: sessions } = await supabase
    .from('mp_sessions')
    .select('id, code, host_id, game_type, target_score, max_players, turn_time_limit, created_at')
    .eq('status', 'waiting')
    .eq('expired', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30);

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map(s => s.id);
  const { data: players } = await supabase
    .from('mp_players')
    .select('session_id, display_name, user_id, turn_order')
    .in('session_id', sessionIds)
    .eq('is_active', true)
    .order('turn_order', { ascending: true });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', sessions.map(s => s.host_id));

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]));
  const playerCountMap = new Map<string, number>();
  (players ?? []).forEach(p => {
    playerCountMap.set(p.session_id, (playerCountMap.get(p.session_id) ?? 0) + 1);
  });

  return sessions.map(s => ({
    id: s.id,
    code: s.code,
    host_id: s.host_id,
    host_name: profileMap.get(s.host_id) ?? 'Unknown',
    game_type: s.game_type ?? 'bones',
    target_score: s.target_score,
    max_players: s.max_players,
    player_count: playerCountMap.get(s.id) ?? 0,
    turn_time_limit: s.turn_time_limit,
    created_at: s.created_at,
  }));
}

export async function getMyActiveSession(): Promise<{ session: MpSession; player: MpPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: playerRow } = await supabase
    .from('mp_players')
    .select('session_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!playerRow) return null;

  const { data: session } = await supabase
    .from('mp_sessions')
    .select()
    .eq('id', playerRow.session_id)
    .in('status', ['waiting', 'active'])
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!session) return null;

  const { data: player } = await supabase
    .from('mp_players')
    .select()
    .eq('session_id', session.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!player) return null;
  return { session, player };
}

export async function joinSession(code: string, displayName: string): Promise<{ session: MpSession; player: MpPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session, error: sessionError } = await supabase
    .from('mp_sessions')
    .select()
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .maybeSingle();

  if (sessionError || !session) return null;

  const { data: existingPlayers } = await supabase
    .from('mp_players')
    .select()
    .eq('session_id', session.id)
    .eq('is_active', true);

  const alreadyJoined = existingPlayers?.find(p => p.user_id === user.id);
  if (alreadyJoined) {
    return { session, player: alreadyJoined };
  }

  if ((existingPlayers?.length ?? 0) >= (session.max_players ?? 6)) return null;

  const { data: player, error: playerError } = await supabase
    .from('mp_players')
    .insert({
      session_id: session.id,
      user_id: user.id,
      display_name: displayName,
      turn_order: existingPlayers?.length ?? 1,
    })
    .select()
    .single();

  if (playerError || !player) return null;

  return { session, player };
}

export async function getSessionPlayers(sessionId: string): Promise<MpPlayer[]> {
  const { data } = await supabase
    .from('mp_players')
    .select()
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .order('turn_order', { ascending: true });
  return data ?? [];
}

export async function startSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('mp_sessions')
    .update({ status: 'active', game_started_at: now, updated_at: now })
    .eq('id', sessionId);
  if (error) {
    console.error('startSession error:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function advanceTurn(sessionId: string, nextPlayerIndex: number): Promise<boolean> {
  const { error } = await supabase
    .from('mp_sessions')
    .update({ current_player_index: nextPlayerIndex, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
  return !error;
}

export async function finishSession(sessionId: string, winnerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mp_sessions')
    .update({ status: 'finished', winner_id: winnerId, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
  return !error;
}

export async function updatePlayerPoints(playerId: string, bankedPoints: number): Promise<boolean> {
  const { error } = await supabase
    .from('mp_players')
    .update({ banked_points: bankedPoints })
    .eq('id', playerId);
  return !error;
}

export async function recordTurn(turn: Omit<MpTurn, 'id' | 'created_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('mp_turns')
    .insert(turn);
  return !error;
}

const BOT_NAMES: Record<BotDifficulty, string[]> = {
  easy:   ['Clumsy', 'Fumbles', 'Dizzy', 'Wobbly', 'Noodle'],
  medium: ['Rattle', 'Bonehead', 'Lucky', 'Skully', 'Clatter'],
  hard:   ['Risky', 'The Roller', 'Dice Devil', 'Viper', 'Phantom'],
};

export async function addBotPlayer(sessionId: string, existingCount: number, difficulty: BotDifficulty = 'medium'): Promise<MpPlayer | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const usedNames = await getSessionPlayers(sessionId).then(ps => ps.map(p => p.display_name));
  const pool = BOT_NAMES[difficulty];
  const available = pool.filter(n => !usedNames.includes(n));
  const name = available.length > 0 ? available[0] : `Bot ${existingCount + 1}`;

  const { data: player, error } = await supabase
    .from('mp_players')
    .insert({
      session_id: sessionId,
      user_id: null,
      display_name: name,
      turn_order: existingCount,
      is_bot: true,
      bot_difficulty: difficulty,
    })
    .select()
    .single();

  if (error || !player) return null;
  return player;
}

export async function removePlayer(playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mp_players')
    .delete()
    .eq('id', playerId);
  return !error;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mp_sessions')
    .update({ status: 'finished', updated_at: new Date().toISOString() })
    .eq('id', sessionId);
  return !error;
}

export async function getSessionTurns(sessionId: string): Promise<MpTurn[]> {
  const { data } = await supabase
    .from('mp_turns')
    .select()
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getMyWaitingSession(): Promise<{ session: MpSession; player: MpPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from('mp_sessions')
    .select()
    .eq('host_id', user.id)
    .eq('status', 'waiting')
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

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signInAnonymously(displayName: string) {
  const email = `guest_${Date.now()}@bones.local`;
  const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return null;
  return data.user;
}
