import { useState, useEffect } from 'react';
import { X, Trophy, Trash2, Dices, Layers, Grid3x3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type GameType = 'bones' | '3-13' | 'card-bingo';

interface GameStats {
  wins: number;
  losses: number;
  bestScore: number | null;
  clearedAt: string | null;
}

interface PlayerRecordModalProps {
  user: SupabaseUser;
  displayName: string;
  onClose: () => void;
}

const GAME_CONFIG: Record<GameType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  winDescription: string;
  scoreLabel: string;
  lowerIsBetter: boolean;
}> = {
  'bones': {
    label: 'Bones',
    icon: <Dices className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    winDescription: 'Roll five of a kind (Bones!) or reach the target score by banking points.',
    scoreLabel: 'Best Score',
    lowerIsBetter: false,
  },
  '3-13': {
    label: '3-13',
    icon: <Layers className="w-4 h-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    winDescription: 'Have the fewest penalty points at the end of all 11 rounds.',
    scoreLabel: 'Best (Lowest)',
    lowerIsBetter: true,
  },
  'card-bingo': {
    label: 'Card Bingo',
    icon: <Grid3x3 className="w-4 h-4" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    winDescription: 'Complete any bingo pattern on one of your boards before the deck runs out.',
    scoreLabel: 'Fewest Cards',
    lowerIsBetter: true,
  },
};

export default function PlayerRecordModal({ user, displayName, onClose }: PlayerRecordModalProps) {
  const [stats, setStats] = useState<Record<GameType, GameStats>>({
    'bones': { wins: 0, losses: 0, bestScore: null, clearedAt: null },
    '3-13': { wins: 0, losses: 0, bestScore: null, clearedAt: null },
    'card-bingo': { wins: 0, losses: 0, bestScore: null, clearedAt: null },
  });
  const [activeTab, setActiveTab] = useState<GameType>('bones');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  async function load() {
    const [recordsRes, clearsRes] = await Promise.all([
      supabase
        .from('player_records')
        .select('game_type, result, score, created_at')
        .eq('user_id', user.id),
      supabase
        .from('player_record_clears')
        .select('game_type, cleared_at')
        .eq('user_id', user.id),
    ]);

    const records = recordsRes.data ?? [];
    const clears = clearsRes.data ?? [];

    const newStats = { ...stats };

    for (const gt of ['bones', '3-13', 'card-bingo'] as GameType[]) {
      const clearRow = clears
        .filter(c => c.game_type === gt)
        .sort((a, b) => b.cleared_at.localeCompare(a.cleared_at))[0];
      const clearedAt = clearRow?.cleared_at ?? null;

      const filtered = records.filter(r =>
        r.game_type === gt &&
        (!clearedAt || r.created_at > clearedAt)
      );

      const wins = filtered.filter(r => r.result === 'win').length;
      const losses = filtered.filter(r => r.result === 'loss').length;
      const cfg = GAME_CONFIG[gt];

      let bestScore: number | null = null;
      if (filtered.length > 0) {
        const scores = filtered.map(r => r.score);
        bestScore = cfg.lowerIsBetter
          ? Math.min(...scores)
          : Math.max(...scores);
      }

      newStats[gt] = { wins, losses, bestScore, clearedAt };
    }

    setStats(newStats);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]);

  async function handleClear() {
    setClearing(true);
    await supabase.from('player_record_clears').insert({
      user_id: user.id,
      game_type: activeTab,
    });
    setConfirmClear(false);
    setClearing(false);
    await load();
  }

  const label = displayName || user.email?.split('@')[0] || 'Player';
  const cfg = GAME_CONFIG[activeTab];
  const current = stats[activeTab];
  const total = current.wins + current.losses;
  const winRate = total > 0 ? Math.round((current.wins / total) * 100) : 0;

  const totalAllWins = Object.values(stats).reduce((s, g) => s + g.wins, 0);
  const totalAllGames = Object.values(stats).reduce((s, g) => s + g.wins + g.losses, 0);
  const overallWinRate = totalAllGames > 0 ? Math.round((totalAllWins / totalAllGames) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-800">Scoreboard</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-4">
          {/* Player pill */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {label.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{label}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            {!loading && totalAllGames > 0 && (
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-black text-gray-800">{overallWinRate}%</p>
                <p className="text-xs text-gray-400">overall</p>
              </div>
            )}
          </div>

          {/* Game tabs */}
          <div className="grid grid-cols-3 gap-1.5 bg-gray-100 rounded-2xl p-1">
            {(['bones', '3-13', 'card-bingo'] as GameType[]).map(gt => {
              const c = GAME_CONFIG[gt];
              const s = stats[gt];
              const isActive = activeTab === gt;
              return (
                <button
                  key={gt}
                  onClick={() => { setActiveTab(gt); setConfirmClear(false); }}
                  className={`relative py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                    isActive ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={isActive ? c.color : 'text-gray-400'}>{c.icon}</span>
                    <span>{c.label}</span>
                    {(s.wins + s.losses) > 0 && (
                      <span className={`text-[10px] ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                        {s.wins}W {s.losses}L
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : (
            <>
              {/* Win condition explanation */}
              <div className={`${cfg.bgColor} rounded-2xl px-4 py-3`}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${cfg.color}`}>How to Win</p>
                <p className="text-sm text-gray-600 leading-relaxed">{cfg.winDescription}</p>
              </div>

              {/* Stats */}
              {total === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No {cfg.label} games recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-emerald-600">{current.wins}</p>
                      <p className="text-xs text-emerald-500 font-semibold mt-0.5">Wins</p>
                    </div>
                    <div className="bg-red-50 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-red-500">{current.losses}</p>
                      <p className="text-xs text-red-400 font-semibold mt-0.5">Losses</p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-blue-600">{winRate}%</p>
                      <p className="text-xs text-blue-400 font-semibold mt-0.5">Win Rate</p>
                    </div>
                  </div>

                  {current.bestScore !== null && (
                    <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{cfg.scoreLabel}</p>
                        <p className="text-xl font-black text-gray-800 mt-0.5">{current.bestScore.toLocaleString()}</p>
                      </div>
                      <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                  )}

                  {/* Win rate bar */}
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${winRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">{total} game{total !== 1 ? 's' : ''} played</p>
                  </div>
                </div>
              )}

              {/* Clear button */}
              {total > 0 && (
                <div>
                  {confirmClear ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                      <p className="text-sm text-red-700 font-semibold text-center">
                        Clear all {cfg.label} stats? This can't be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmClear(false)}
                          className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleClear}
                          disabled={clearing}
                          className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60"
                        >
                          {clearing ? 'Clearing...' : 'Yes, Clear'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 text-sm font-semibold transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear {cfg.label} Stats
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
