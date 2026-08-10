import { supabase } from './supabase';

export type SavedGameType = 'bones' | '3-13' | 'card-bingo' | 'domino-trains';

export async function saveGame(userId: string, gameType: SavedGameType, state: unknown) {
  await supabase.from('solo_saved_games').upsert(
    { user_id: userId, game_type: gameType, state, saved_at: new Date().toISOString() },
    { onConflict: 'user_id,game_type' }
  );
}

export async function loadSavedGame(userId: string, gameType: SavedGameType): Promise<unknown | null> {
  const { data } = await supabase
    .from('solo_saved_games')
    .select('state')
    .eq('user_id', userId)
    .eq('game_type', gameType)
    .maybeSingle();
  return data?.state ?? null;
}

export async function clearSavedGame(userId: string, gameType: SavedGameType) {
  await supabase
    .from('solo_saved_games')
    .delete()
    .eq('user_id', userId)
    .eq('game_type', gameType);
}

export async function loadAllSavedGames(userId: string): Promise<Record<SavedGameType, boolean>> {
  const { data } = await supabase
    .from('solo_saved_games')
    .select('game_type')
    .eq('user_id', userId);

  const result: Record<SavedGameType, boolean> = { 'bones': false, '3-13': false, 'card-bingo': false, 'domino-trains': false };
  (data ?? []).forEach(row => {
    if (row.game_type in result) result[row.game_type as SavedGameType] = true;
  });
  return result;
}
