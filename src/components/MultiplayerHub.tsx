import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Users, RefreshCw, Copy, Check, LogIn, Dices, Layers, Grid3x3, ChevronRight, Clock, Zap, X, Hash, Trophy } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  createSession, joinSession, getOpenLobbies, getSessionPlayers, startSession, deleteSession, removePlayer, getMyActiveSession,
  type MpSession, type MpPlayer, type LobbySession,
} from '../lib/multiplayerService';
import DominoIcon from './DominoIcon';

// ─── game config ─────────────────────────────────────────────────────────────

type GameTypeId = 'bones' | '3-13' | 'card-bingo';

const GAME_CONFIGS: Record<GameTypeId, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  defaultMaxPlayers: number;
  targetScoreOptions?: number[];
  defaultTargetScore?: number;
}> = {
  bones: {
    label: 'Bones',
    icon: <Dices className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    description: 'Roll dice, bank points, first to the target wins.',
    minPlayers: 2,
    maxPlayers: 6,
    defaultMaxPlayers: 4,
    targetScoreOptions: [5000, 10000, 20000, 50000],
    defaultTargetScore: 10000,
  },
  '3-13': {
    label: '3-13',
    icon: <Layers className="w-5 h-5" />,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    description: '11 rounds of rummy. Lowest penalty score wins.',
    minPlayers: 2,
    maxPlayers: 6,
    defaultMaxPlayers: 4,
    defaultTargetScore: 0,
  },
  'card-bingo': {
    label: 'Card Bingo',
    icon: <Grid3x3 className="w-5 h-5" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    description: 'Match drawn cards to your board. First bingo wins.',
    minPlayers: 2,
    maxPlayers: 8,
    defaultMaxPlayers: 6,
    defaultTargetScore: 0,
  },
};

function GameIcon({ gameType, size = 'md' }: { gameType: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10';
  const cfg = GAME_CONFIGS[gameType as GameTypeId];
  if (!cfg) return (
    <div className={`${s} rounded-xl bg-gray-100 flex items-center justify-center text-gray-400`}>
      <DominoIcon size={size === 'sm' ? 14 : 20} />
    </div>
  );
  return (
    <div className={`${s} rounded-xl ${cfg.bgColor} flex items-center justify-center ${cfg.color}`}>
      {cfg.icon}
    </div>
  );
}

// ─── stat card ───────────────────────────────────────────────────────────────

interface MpStats {
  wins: number;
  losses: number;
  total: number;
}

// ─── subcomponents ───────────────────────────────────────────────────────────

function StatBadge({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
      <p className="text-2xl font-black text-gray-800">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function LobbyCard({
  lobby,
  userId,
  onJoin,
}: {
  lobby: LobbySession;
  userId: string | null;
  onJoin: (lobby: LobbySession) => void;
}) {
  const cfg = GAME_CONFIGS[lobby.game_type as GameTypeId];
  const isHosting = userId === lobby.host_id;
  const isFull = lobby.player_count >= lobby.max_players;
  const age = Math.floor((Date.now() - new Date(lobby.created_at).getTime()) / 60000);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-gray-200 transition-all duration-150">
      <GameIcon gameType={lobby.game_type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-800 text-sm">{cfg?.label ?? lobby.game_type}</span>
          {isHosting && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Your Game</span>
          )}
          {isFull && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Full</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Users size={11} />
            {lobby.player_count}/{lobby.max_players}
          </span>
          {lobby.target_score > 0 && (
            <span className="flex items-center gap-1">
              <Zap size={11} />
              {lobby.target_score.toLocaleString()} pts
            </span>
          )}
          {lobby.turn_time_limit && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {lobby.turn_time_limit}s/turn
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {age < 1 ? 'just now' : `${age}m ago`}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">Host: {lobby.host_name}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <code className="text-xs font-mono font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{lobby.code}</code>
        <button
          onClick={() => onJoin(lobby)}
          disabled={isFull && !isHosting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white"
          style={{ backgroundColor: isFull && !isHosting ? '#94a3b8' : 'var(--color-primary)' }}
        >
          {isHosting ? 'Enter' : 'Join'}
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── waiting room ─────────────────────────────────────────────────────────────

function WaitingRoom({
  session,
  myPlayer,
  userId,
  onLeave,
  onStart,
}: {
  session: MpSession;
  myPlayer: MpPlayer;
  userId: string;
  onLeave: () => void;
  onStart: () => void;
}) {
  const [players, setPlayers] = useState<MpPlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const isHost = session.host_id === userId;
  const cfg = GAME_CONFIGS[session.game_type as GameTypeId];
  const canStart = isHost && players.length >= (cfg?.minPlayers ?? 2);

  const loadPlayers = useCallback(async () => {
    const ps = await getSessionPlayers(session.id);
    setPlayers(ps);
  }, [session.id]);

  useEffect(() => {
    loadPlayers();
    const channel = supabase
      .channel(`waiting-room:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mp_players', filter: `session_id=eq.${session.id}` }, loadPlayers)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mp_sessions', filter: `id=eq.${session.id}` }, (payload) => {
        const updated = payload.new as MpSession;
        if (updated.status === 'active') onStart();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, loadPlayers, onStart]);

  async function handleCopyCode() {
    await navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleKick(playerId: string) {
    await removePlayer(playerId);
    loadPlayers();
  }

  async function handleLeave() {
    if (isHost) {
      await deleteSession(session.id);
    } else {
      await removePlayer(myPlayer.id);
    }
    onLeave();
  }

  async function handleStart() {
    const { ok } = await startSession(session.id);
    if (ok) onStart();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* session header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <GameIcon gameType={session.game_type ?? 'bones'} />
          <div>
            <p className="font-bold text-gray-800">{cfg?.label ?? 'Game'} Lobby</p>
            <p className="text-xs text-gray-400">{isHost ? 'You are the host' : `Hosted by someone else`}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Join Code</p>
              <p className="text-2xl font-black text-gray-800 tracking-widest font-mono">{session.code}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-600 transition"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {session.target_score > 0 && (
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <Zap size={11} /> Target: {session.target_score.toLocaleString()} points
          </p>
        )}
      </div>

      {/* player list */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Users size={12} />
          Players ({players.length}/{session.max_players})
        </p>
        <div className="flex flex-col gap-2">
          {players.map((p, idx) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {p.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {p.display_name}
                  {p.user_id === userId && <span className="ml-1.5 text-[10px] text-blue-400">(you)</span>}
                  {session.host_id === p.user_id && <span className="ml-1.5 text-[10px] text-amber-500">host</span>}
                </p>
                <p className="text-[11px] text-gray-400">Turn {idx + 1}</p>
              </div>
              {isHost && p.id !== myPlayer.id && (
                <button
                  onClick={() => handleKick(p.id)}
                  className="text-gray-300 hover:text-red-400 transition p-1 rounded-lg"
                  title="Remove player"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {players.length < session.max_players && (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-center text-xs text-gray-400">
              Waiting for players... share the code <span className="font-mono font-bold">{session.code}</span>
            </div>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex gap-3">
        <button
          onClick={handleLeave}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition"
        >
          {isHost ? 'Cancel Game' : 'Leave Lobby'}
        </button>
        {isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {canStart ? 'Start Game' : `Need ${(cfg?.minPlayers ?? 2) - players.length} more`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── create game form ─────────────────────────────────────────────────────────

function CreateGameForm({
  displayName,
  onCreated,
  onCancel,
}: {
  displayName: string;
  onCreated: (session: MpSession, player: MpPlayer) => void;
  onCancel: () => void;
}) {
  const [gameType, setGameType] = useState<GameTypeId>('bones');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [targetScore, setTargetScore] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cfg = GAME_CONFIGS[gameType];

  useEffect(() => {
    setMaxPlayers(cfg.defaultMaxPlayers);
    setTargetScore(cfg.defaultTargetScore ?? 0);
  }, [gameType]);

  async function handleCreate() {
    setLoading(true);
    setError('');
    const result = await createSession(displayName, targetScore, maxPlayers, null, gameType);
    setLoading(false);
    if (!result) {
      setError('Could not create game. Please try again.');
      return;
    }
    onCreated(result.session, result.player);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Create a Game</h2>
      </div>

      {/* game picker */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Game</p>
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(GAME_CONFIGS) as [GameTypeId, typeof GAME_CONFIGS[GameTypeId]][]).map(([id, c]) => (
            <button
              key={id}
              onClick={() => setGameType(id)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                gameType === id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${c.bgColor} flex items-center justify-center ${c.color} flex-shrink-0`}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${gameType === id ? 'text-blue-700' : 'text-gray-800'}`}>{c.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
              </div>
              {gameType === id && <Check size={16} className="text-blue-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* settings */}
      <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Max Players</label>
          <div className="flex gap-2">
            {Array.from({ length: cfg.maxPlayers - cfg.minPlayers + 1 }, (_, i) => i + cfg.minPlayers).map(n => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n)}
                className="w-10 h-10 rounded-xl text-sm font-bold transition-all"
                style={maxPlayers === n
                  ? { backgroundColor: 'var(--color-primary)', color: 'white' }
                  : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {cfg.targetScoreOptions && cfg.targetScoreOptions.length > 0 && (
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Target Score</label>
            <div className="flex gap-2 flex-wrap">
              {cfg.targetScoreOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setTargetScore(s)}
                  className="px-3 h-9 rounded-xl text-sm font-bold transition-all"
                  style={targetScore === s
                    ? { backgroundColor: 'var(--color-primary)', color: 'white' }
                    : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
                  }
                >
                  {(s / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-white font-bold text-base transition hover:opacity-90 active:scale-95 disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {loading ? 'Creating...' : 'Create Game'}
      </button>
    </div>
  );
}

// ─── join by code ─────────────────────────────────────────────────────────────

function JoinByCode({
  displayName,
  onJoined,
  onCancel,
}: {
  displayName: string;
  onJoined: (session: MpSession, player: MpPlayer) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    if (code.trim().length < 4) return;
    setLoading(true);
    setError('');
    const result = await joinSession(code.trim().toUpperCase(), displayName);
    setLoading(false);
    if (!result) {
      setError('Game not found or already started. Check the code and try again.');
      return;
    }
    onJoined(result.session, result.player);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Join by Code</h2>
      </div>

      <div className="bg-gray-50 rounded-2xl p-5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Enter 4-character code</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="AB3K"
          maxLength={4}
          className="w-full text-center text-4xl font-black font-mono tracking-[0.3em] bg-white border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-blue-400 transition uppercase"
          autoFocus
        />
        <p className="text-xs text-gray-400 text-center mt-2">Ask the host for their 4-letter code</p>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={loading || code.length < 4}
        className="w-full py-4 rounded-2xl text-white font-bold text-base transition hover:opacity-90 active:scale-95 disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {loading ? 'Joining...' : 'Join Game'}
      </button>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

type HubView = 'lobby' | 'create' | 'join-code' | 'waiting-room';

interface MultiplayerHubProps {
  user: User | null;
  displayName: string;
  onBack: () => void;
  onShowAuth: () => void;
  onGameStart: (session: MpSession, player: MpPlayer) => void;
}

export default function MultiplayerHub({ user, displayName, onBack, onShowAuth, onGameStart }: MultiplayerHubProps) {
  const [view, setView] = useState<HubView>('lobby');
  const [lobbies, setLobbies] = useState<LobbySession[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [activeSession, setActiveSession] = useState<MpSession | null>(null);
  const [activePlayer, setActivePlayer] = useState<MpPlayer | null>(null);
  const [mpStats, setMpStats] = useState<MpStats>({ wins: 0, losses: 0, total: 0 });

  const fetchLobbies = useCallback(async () => {
    setLoadingLobbies(true);
    const data = await getOpenLobbies();
    setLobbies(data);
    setLoadingLobbies(false);
  }, []);

  useEffect(() => {
    fetchLobbies();
    // real-time lobby updates
    const channel = supabase
      .channel('lobby-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mp_sessions' }, fetchLobbies)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mp_players' }, fetchLobbies)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLobbies]);

  // load player's multiplayer stats
  useEffect(() => {
    if (!user) return;
    supabase
      .from('player_records')
      .select('result')
      .eq('user_id', user.id)
      .eq('game_mode', 'multiplayer')
      .then(({ data }) => {
        if (!data) return;
        const wins = data.filter(r => r.result === 'win').length;
        const losses = data.filter(r => r.result === 'loss').length;
        setMpStats({ wins, losses, total: wins + losses });
      });
  }, [user]);

  // check if user already in a session
  useEffect(() => {
    if (!user) return;
    getMyActiveSession().then(res => {
      if (res) {
        setActiveSession(res.session);
        setActivePlayer(res.player);
        if (res.session.status === 'waiting') setView('waiting-room');
        else if (res.session.status === 'active') onGameStart(res.session, res.player);
      }
    });
  }, [user]);

  function handleSessionCreatedOrJoined(session: MpSession, player: MpPlayer) {
    setActiveSession(session);
    setActivePlayer(player);
    setView('waiting-room');
  }

  function handleJoinLobby(lobby: LobbySession) {
    if (!user) { onShowAuth(); return; }
    // if it's the user's own lobby, enter waiting room directly
    if (lobby.host_id === user.id && activeSession?.id === lobby.id) {
      setView('waiting-room');
      return;
    }
    joinSession(lobby.code, displayName || 'Player').then(res => {
      if (res) handleSessionCreatedOrJoined(res.session, res.player);
    });
  }

  function handleLeaveWaitingRoom() {
    setActiveSession(null);
    setActivePlayer(null);
    setView('lobby');
    fetchLobbies();
  }

  function handleGameStarted() {
    if (activeSession && activePlayer) {
      onGameStart(activeSession, activePlayer);
    }
  }

  const name = displayName || user?.email?.split('@')[0] || 'Player';
  const winRate = mpStats.total > 0 ? Math.round((mpStats.wins / mpStats.total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-sm"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg) 85%, transparent)', borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-70"
            style={{ color: 'var(--color-muted)' }}
          >
            <ArrowLeft size={16} />
            Games
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Users size={16} className="text-white" />
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--color-heading)' }}>Multiplayer</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6">
        {!user ? (
          // ── not logged in ────────────────────────────────────────────────
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Users size={32} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign in to play with others</h2>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">Create a free account to host games, join friends, and track your multiplayer record.</p>
            </div>
            <button
              onClick={onShowAuth}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <LogIn size={18} />
              Sign In / Create Account
            </button>
          </div>
        ) : view === 'waiting-room' && activeSession && activePlayer ? (
          // ── waiting room ─────────────────────────────────────────────────
          <WaitingRoom
            session={activeSession}
            myPlayer={activePlayer}
            userId={user.id}
            onLeave={handleLeaveWaitingRoom}
            onStart={handleGameStarted}
          />
        ) : view === 'create' ? (
          // ── create game ──────────────────────────────────────────────────
          <CreateGameForm
            displayName={name}
            onCreated={handleSessionCreatedOrJoined}
            onCancel={() => setView('lobby')}
          />
        ) : view === 'join-code' ? (
          // ── join by code ─────────────────────────────────────────────────
          <JoinByCode
            displayName={name}
            onJoined={handleSessionCreatedOrJoined}
            onCancel={() => setView('lobby')}
          />
        ) : (
          // ── main lobby ───────────────────────────────────────────────────
          <div className="flex flex-col gap-6">
            {/* player stats */}
            {mpStats.total > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Trophy size={12} />
                  Your Multiplayer Record
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <StatBadge label="Wins" value={mpStats.wins} />
                  <StatBadge label="Losses" value={mpStats.losses} />
                  <StatBadge label="Win Rate" value={`${winRate}%`} sub={`${mpStats.total} games`} />
                </div>
              </div>
            )}

            {/* action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setView('create')}
                className="flex flex-col items-center gap-2 py-5 px-4 rounded-2xl text-white font-bold transition hover:opacity-90 active:scale-95 shadow-sm"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={22} />
                <span className="text-sm">Create Game</span>
              </button>
              <button
                onClick={() => setView('join-code')}
                className="flex flex-col items-center gap-2 py-5 px-4 rounded-2xl font-bold border-2 transition hover:bg-gray-50 active:scale-95"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-heading)' }}
              >
                <Hash size={22} />
                <span className="text-sm">Join by Code</span>
              </button>
            </div>

            {/* open lobbies */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
                  <Users size={12} />
                  Open Games
                </p>
                <button
                  onClick={fetchLobbies}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={loadingLobbies ? 'animate-spin' : ''} />
                </button>
              </div>

              {loadingLobbies ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading games...</div>
              ) : lobbies.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200">
                  <Users size={28} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-400">No open games right now</p>
                  <p className="text-xs text-gray-300 mt-1">Create one and invite friends</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {lobbies.map(lobby => (
                    <LobbyCard
                      key={lobby.id}
                      lobby={lobby}
                      userId={user.id}
                      onJoin={handleJoinLobby}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* game legend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Available Games</p>
              <div className="flex flex-col gap-3">
                {(Object.entries(GAME_CONFIGS) as [GameTypeId, typeof GAME_CONFIGS[GameTypeId]][]).map(([id, c]) => (
                  <div key={id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center ${c.color} flex-shrink-0`}>
                      {c.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{c.label}</p>
                      <p className="text-xs text-gray-400">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
