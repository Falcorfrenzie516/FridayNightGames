import { supabase } from './supabase';
import { Card, BingoBoard } from './bingoLogic';

export interface BingoSession {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'active' | 'finished';
  win_category: string;
  win_condition: string;
  current_card: Card | null;
  flipped_cards: Card[];
  winner_id: string | null;
  max_players: number;
  boards_per_player: number;
  last_flip_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface BingoPlayer {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string;
  boards: BingoBoard[];
  daubs: Record<string, number[]>;
  is_active: boolean;
  joined_at: string;
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createBingoSession(
  displayName: string,
  maxPlayers: number,
  boardsPerPlayer: number,
  winCategory: string,
  winCondition: string,
): Promise<{ session: BingoSession; player: BingoPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let code = randomCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('bingo_sessions')
      .select('id')
      .eq('code', code)
      .eq('status', 'waiting')
      .maybeSingle();
    if (!existing) break;
    code = randomCode();
    attempts++;
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('bingo_sessions')
    .insert({
      code,
      host_id: user.id,
      status: 'waiting',
      win_category: winCategory,
      win_condition: winCondition,
      max_players: maxPlayers,
      boards_per_player: boardsPerPlayer,
    })
    .select()
    .single();

  if (sessionError || !sessionData) return null;

  const { data: playerData, error: playerError } = await supabase
    .from('bingo_players')
    .insert({
      session_id: sessionData.id,
      user_id: user.id,
      display_name: displayName,
      boards: [],
      daubs: {},
    })
    .select()
    .single();

  if (playerError || !playerData) return null;

  return {
    session: sessionData as BingoSession,
    player: playerData as BingoPlayer,
  };
}

export async function joinBingoSession(
  code: string,
  displayName: string,
): Promise<{ session: BingoSession; player: BingoPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessionData } = await supabase
    .from('bingo_sessions')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .maybeSingle();

  if (!sessionData) return null;

  const { data: existingPlayer } = await supabase
    .from('bingo_players')
    .select('*')
    .eq('session_id', sessionData.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingPlayer) {
    return { session: sessionData as BingoSession, player: existingPlayer as BingoPlayer };
  }

  const { data: playerData, error } = await supabase
    .from('bingo_players')
    .insert({
      session_id: sessionData.id,
      user_id: user.id,
      display_name: displayName,
      boards: [],
      daubs: {},
    })
    .select()
    .single();

  if (error || !playerData) return null;

  return { session: sessionData as BingoSession, player: playerData as BingoPlayer };
}

export async function getMyBingoWaitingSession(): Promise<{ session: BingoSession; player: BingoPlayer } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: playerRows } = await supabase
    .from('bingo_players')
    .select('*, bingo_sessions(*)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (!playerRows || playerRows.length === 0) return null;

  for (const row of playerRows) {
    const sess = row.bingo_sessions as BingoSession;
    if (sess?.status === 'waiting' && sess.host_id === user.id) {
      return { session: sess, player: row as BingoPlayer };
    }
  }

  return null;
}

export async function getBingoPlayers(sessionId: string): Promise<BingoPlayer[]> {
  const { data } = await supabase
    .from('bingo_players')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });

  return (data ?? []) as BingoPlayer[];
}

export async function startBingoSession(
  sessionId: string,
  playerBoards: { playerId: string; boards: BingoBoard[] }[],
  winCategory: string,
  winCondition: string,
): Promise<boolean> {
  for (const { playerId, boards } of playerBoards) {
    await supabase
      .from('bingo_players')
      .update({ boards, daubs: {} })
      .eq('id', playerId);
  }

  const { error } = await supabase
    .from('bingo_sessions')
    .update({
      status: 'active',
      win_category: winCategory,
      win_condition: winCondition,
    })
    .eq('id', sessionId);

  return !error;
}

export async function deleteBingoSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('bingo_sessions')
    .delete()
    .eq('id', sessionId);
  return !error;
}

export async function removeBingoPlayer(playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('bingo_players')
    .update({ is_active: false })
    .eq('id', playerId);
  return !error;
}

export async function flipCard(
  sessionId: string,
  card: Card,
  allFlipped: Card[],
): Promise<boolean> {
  const { error } = await supabase
    .from('bingo_sessions')
    .update({
      current_card: card,
      flipped_cards: [...allFlipped, card],
      last_flip_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  return !error;
}

export async function updateDaubs(
  playerId: string,
  daubs: Record<string, number[]>,
): Promise<boolean> {
  const { error } = await supabase
    .from('bingo_players')
    .update({ daubs })
    .eq('id', playerId);
  return !error;
}

export async function declareWinner(
  sessionId: string,
  winnerId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('bingo_sessions')
    .update({ status: 'finished', winner_id: winnerId })
    .eq('id', sessionId);
  return !error;
}

export async function getSessionState(sessionId: string): Promise<BingoSession | null> {
  const { data } = await supabase
    .from('bingo_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  return data as BingoSession | null;
}
