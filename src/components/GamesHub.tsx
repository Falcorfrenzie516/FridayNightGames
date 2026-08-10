import React from 'react';
import type { User } from '@supabase/supabase-js';
import { Users, ChevronRight, LogIn, Wifi } from 'lucide-react';

function DiceIcon({ size = 36, className = '', style = {} }: { size?: number; className?: string; style?: React.CSSProperties }) {
  // Isometric die. Corners:
  // top vertex: (20,4), right: (34,12), bottom: (20,20), left: (6,12)
  // left face bottom-left: (6,30), right face bottom-right: (34,30)
  // Face centers (parallelogram centroid):
  //   top:   avg of (20,4),(34,12),(20,20),(6,12)  = (20,12)
  //   left:  avg of (6,12),(20,20),(20,38),(6,30)  = (13,25)
  //   right: avg of (34,12),(20,20),(20,38),(34,30) = (27,25)
  //
  // On the skewed faces dots are offset along the face axes:
  //   left face: x-axis goes +7,+4.5 (down-right), y-axis goes 0,+9 (straight down)
  //   right face: x-axis goes -7,+4.5 (down-left), y-axis goes 0,+9 (straight down)

  const top   = "M20,4 L34,12 L20,20 L6,12 Z";
  const left  = "M6,12 L20,20 L20,38 L6,30 Z";
  const right = "M34,12 L20,20 L20,38 L34,30 Z";

  // left face dot positions: center=(13,25), axis-offset unit=(3.5,2.25) horiz, (0,4.5) vert
  const lc = { x: 13, y: 25 };
  const lh = { x: 3.5, y: 2.25 };
  const lv = { x: 0,   y: 4.5  };
  const ld = (dh: number, dv: number) => ({ cx: lc.x + dh*lh.x + dv*lv.x, cy: lc.y + dh*lh.y + dv*lv.y });

  // right face dot positions: center=(27,25), axis-offset unit=(-3.5,2.25) horiz, (0,4.5) vert
  const rc = { x: 27, y: 25 };
  const rh = { x: -3.5, y: 2.25 };
  const rv = { x: 0,    y: 4.5  };
  const rd = (dh: number, dv: number) => ({ cx: rc.x + dh*rh.x + dv*rv.x, cy: rc.y + dh*rh.y + dv*rv.y });

  const r = 1.6;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} style={style}>
      <path d={top}   stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.22"/>
      <path d={left}  stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.12"/>
      <path d={right} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.06"/>
      {/* top face: 1 dot at center (20,12) */}
      <circle cx="20" cy="12" r="2" fill="currentColor"/>
      {/* left face: 2 dots — top-right and bottom-left of face */}
      <circle {...ld( 1, -1)} r={r} fill="currentColor"/>
      <circle {...ld(-1,  1)} r={r} fill="currentColor"/>
      {/* right face: 3 dots — top-left, center, bottom-right */}
      <circle {...rd( 1, -1)} r={r} fill="currentColor"/>
      <circle {...rd( 0,  0)} r={r} fill="currentColor"/>
      <circle {...rd(-1,  1)} r={r} fill="currentColor"/>
    </svg>
  );
}

function CardStackIcon({ size = 36, className = '', style = {} }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} style={style}>
      {/* single upright card */}
      <rect x="8" y="4" width="24" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08"/>
      {/* diamond suit centered */}
      <polygon points="20,13 26,20 20,27 14,20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
import DominoIcon from './DominoIcon';
function BingoCardIcon({ size = 36, className = '', style = {} }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const heart = (cx: number, cy: number, s = 1) => (
    <path d={`M${cx},${cy + 1.2 * s} C${cx},${cy + 1.2 * s} ${cx - 2.5 * s},${cy - 0.5 * s} ${cx - 2.5 * s},${cy - 1.5 * s} A${1.3 * s},${1.3 * s} 0 0 1 ${cx},${cy - 0.3 * s} A${1.3 * s},${1.3 * s} 0 0 1 ${cx + 2.5 * s},${cy - 1.5 * s} C${cx + 2.5 * s},${cy - 0.5 * s} ${cx},${cy + 1.2 * s} ${cx},${cy + 1.2 * s} Z`} fill="currentColor"/>
  );
  const spade = (cx: number, cy: number, s = 1) => (
    <path d={`M${cx},${cy - 2.2 * s} C${cx},${cy - 2.2 * s} ${cx - 2.5 * s},${cy - 0.4 * s} ${cx - 2.5 * s},${cy + 0.5 * s} A${1.2 * s},${1.2 * s} 0 0 0 ${cx},${cy - 0.6 * s} A${1.2 * s},${1.2 * s} 0 0 0 ${cx + 2.5 * s},${cy + 0.5 * s} C${cx + 2.5 * s},${cy - 0.4 * s} ${cx},${cy - 2.2 * s} ${cx},${cy - 2.2 * s} Z M${cx - 1 * s},${cy + 1.3 * s} L${cx + 1 * s},${cy + 1.3 * s} L${cx + 0.5 * s},${cy + 2.2 * s} L${cx - 0.5 * s},${cy + 2.2 * s} Z`} fill="currentColor"/>
  );
  const club = (cx: number, cy: number, s = 1) => (
    <g fill="currentColor">
      <circle cx={cx} cy={cy - 1.4 * s} r={1.1 * s}/>
      <circle cx={cx - 1.3 * s} cy={cy + 0.1 * s} r={1.1 * s}/>
      <circle cx={cx + 1.3 * s} cy={cy + 0.1 * s} r={1.1 * s}/>
      <path d={`M${cx - 0.6 * s},${cy + 0.9 * s} L${cx + 0.6 * s},${cy + 0.9 * s} L${cx + 0.4 * s},${cy + 2.1 * s} L${cx - 0.4 * s},${cy + 2.1 * s} Z`}/>
    </g>
  );
  const star = (cx: number, cy: number, s = 1) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? 2.3 * s : 1.0 * s;
      pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    }
    return <polygon points={pts.join(' ')} fill="currentColor"/>;
  };

  const symbols = [heart, club, heart, club, heart, spade, club, spade, star, spade, club, spade, club, spade, club, heart, club, heart, club, heart, spade, heart, spade, heart, spade];
  const cols = 5, rows = 5;
  const pad = 5, headerH = 10, cellSize = 11;
  const w = pad * 2 + cols * cellSize;
  const h = pad + headerH + rows * cellSize + pad;
  const letters = ['B','I','N','G','O'];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} fill="none" className={className} style={style}>
      <rect x="1" y="1" width={w - 2} height={h - 2} rx="3.5" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.08"/>
      {/* header row */}
      <rect x="1" y="1" width={w - 2} height={headerH + 2} rx="3.5" fill="currentColor" fillOpacity="0.18"/>
      {letters.map((l, i) => (
        <text key={l} x={pad + i * cellSize + cellSize / 2} y={pad + headerH - 2.5} textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">{l}</text>
      ))}
      {/* grid lines */}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <line key={`h${r}`} x1={pad} y1={pad + headerH + r * cellSize} x2={pad + cols * cellSize} y2={pad + headerH + r * cellSize} stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.35"/>
      ))}
      {Array.from({ length: cols + 1 }, (_, c) => (
        <line key={`v${c}`} x1={pad + c * cellSize} y1={pad + headerH} x2={pad + c * cellSize} y2={pad + headerH + rows * cellSize} stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.35"/>
      ))}
      {/* symbols */}
      {symbols.map((Sym, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const cx = pad + col * cellSize + cellSize / 2;
        const cy = pad + headerH + row * cellSize + cellSize / 2;
        return <Sym key={i} cx={cx} cy={cy} s={0.85}/>;
      })}
    </svg>
  );
}

import ProfileDropdown, { LoginButton } from './ProfileDropdown';
import FriendsList from './FriendsList';

const LOGO_ICONS: { node: (visible: boolean) => React.ReactNode; color: string }[] = [
  { color: 'var(--color-primary)', node: (v) => <DiceIcon size={20} className="text-white" style={{ opacity: v ? 1 : 0, transition: 'opacity 0.25s' }} /> },
  { color: '#0369a1',              node: (v) => <CardStackIcon size={20} className="text-white" style={{ opacity: v ? 1 : 0, transition: 'opacity 0.25s' }} /> },
  { color: '#be123c',              node: (v) => <BingoCardIcon size={20} className="text-white" style={{ opacity: v ? 1 : 0, transition: 'opacity 0.25s' }} /> },
  { color: '#15803d',              node: (v) => <DominoIcon size={20} className="text-white" strokeWidth={2} style={{ opacity: v ? 1 : 0, transition: 'opacity 0.25s' }} /> },
];

function CyclingLogo() {
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % LOGO_ICONS.length);
        setVisible(true);
      }, 250);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const { node, color } = LOGO_ICONS[index];

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-300"
      style={{ backgroundColor: color }}
    >
      {node(visible)}
    </div>
  );
}

interface Game {
  id: string;
  title: string;
  description: string;
  players: string;
  status: 'available' | 'coming_soon';
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
}

const GAMES: Game[] = [
  {
    id: 'bones',
    title: 'Bones',
    description: 'The classic dice-rolling risk game. Roll, score, and bank your points — or push your luck and lose it all. First to the target wins.',
    players: 'Solo · up to 5 bots',
    status: 'available',
    icon: <DiceIcon size={36} />,
    accentColor: 'text-[--color-primary]',
    bgColor: 'bg-[--color-primary-light]',
    borderColor: 'border-[--color-border]',
    badgeColor: 'bg-[--color-primary] text-white',
  },
  {
    id: '3-13',
    title: '3-13',
    description: 'The rummy card game. 11 rounds with changing wild cards — from 3s up to Kings. Form melds, knock when you\'re out, and keep your penalty score low.',
    players: 'Solo · 1 bot opponent',
    status: 'available',
    icon: <CardStackIcon size={36} />,
    accentColor: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    badgeColor: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'bingo',
    title: 'Card Bingo',
    description: 'Part poker, part bingo. Match the drawn cards to your board and be the first to complete a pattern.',
    players: 'Solo · 1–4 boards',
    status: 'available',
    icon: <BingoCardIcon size={36} />,
    accentColor: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    badgeColor: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'domino-trains',
    title: 'Domino Trains',
    description: 'Build your personal train from the engine outward while competing on the shared Community Train. Play doubles, block opponents, and empty your hand for the lowest score.',
    players: 'Solo · up to 3 bots',
    status: 'available',
    icon: <DominoIcon size={36} strokeWidth={1.5} />,
    accentColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
];

interface GamesHubProps {
  onSelectGame: (gameId: string) => void;
  onSelectMultiplayer: () => void;
  user: User | null;
  displayName: string;
  displayIcon: string;
  currentTheme: string;
  currentTable: string;
  onDisplayNameChange: (name: string) => void;
  onProfileSaved: (name: string, icon: string) => void;
  onThemeChange: (themeId: string) => void;
  onTableChange: (tableId: string) => void;
  onShowAuth: () => void;
}

export default function GamesHub({
  onSelectGame,
  onSelectMultiplayer,
  user,
  displayName,
  displayIcon,
  currentTheme,
  currentTable,
  onDisplayNameChange,
  onProfileSaved,
  onThemeChange,
  onTableChange,
  onShowAuth,
}: GamesHubProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-sm"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-bg) 85%, transparent)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CyclingLogo />
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: 'var(--color-heading)' }}
            >
              Friday Night Games
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <FriendsList user={user} displayName={displayName} />
            )}
            {user ? (
              <ProfileDropdown
                user={user}
                displayName={displayName}
                displayIcon={displayIcon}
                currentTheme={currentTheme}
                currentTable={currentTable}
                onDisplayNameChange={onDisplayNameChange}
                onProfileSaved={onProfileSaved}
                onThemeChange={onThemeChange}
                onTableChange={onTableChange}
              />
            ) : (
              <LoginButton onClick={onShowAuth} />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-12 md:py-16">
        {/* Multiplayer card */}
        <div
          onClick={onSelectMultiplayer}
          className="group mb-8 sm:mb-12 rounded-2xl border-2 p-5 sm:p-7 flex items-center gap-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-primary)' }}
        >
          {/* subtle bg glow */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, var(--color-primary) 0%, transparent 70%)' }} />
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Users size={26} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-extrabold" style={{ color: 'var(--color-heading)' }}>
                Multiplayer
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                <Wifi size={10} />
                Live
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-body)' }}>
              Host or join a live game with friends. Play Bones, 3-13, or Card Bingo in real time.
            </p>
          </div>
          <div
            className="flex items-center gap-1 text-sm font-bold flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
            style={{ color: 'var(--color-primary-text)' }}
          >
            Play
            <ChevronRight size={16} />
          </div>
        </div>

        <div className="mb-10 sm:mb-14">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-primary-text)' }}
          >
            Game Library
          </p>
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4"
            style={{ color: 'var(--color-heading)' }}
          >
            Play Solo
          </h1>
          <p
            className="text-lg max-w-xl leading-relaxed"
            style={{ color: 'var(--color-body)' }}
          >
            Solo challenges with bot opponents — choose a game and roll.
          </p>
        </div>

        {(() => {
          const available = GAMES.filter(g => g.status === 'available');
          const comingSoon = GAMES.filter(g => g.status === 'coming_soon');

          const renderCard = (game: Game) => {
            const isAvailable = game.status === 'available';
            return (
              <div
                key={game.id}
                onClick={() => isAvailable && onSelectGame(game.id)}
                className={[
                  'group relative rounded-2xl border p-4 sm:p-6 flex flex-col gap-3 sm:gap-5 transition-all duration-200',
                  isAvailable
                    ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
                    : 'cursor-not-allowed opacity-60',
                ].join(' ')}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${game.bgColor}`}
                  >
                    <span className={game.accentColor}>{game.icon}</span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${game.badgeColor} ${!isAvailable ? 'opacity-80' : ''}`}
                  >
                    {isAvailable ? 'Play Now' : 'Coming Soon'}
                  </span>
                </div>

                <div className="flex-1">
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ color: 'var(--color-heading)' }}
                  >
                    {game.title}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-body)' }}
                  >
                    {game.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                    <Users size={13} />
                    <span className="text-xs font-medium">{game.players}</span>
                  </div>
                  {isAvailable && (
                    <div
                      className="flex items-center gap-1 text-xs font-semibold transition-transform duration-150 group-hover:translate-x-0.5"
                      style={{ color: 'var(--color-primary-text)' }}
                    >
                      Play
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>

                {isAvailable && (
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      boxShadow: '0 0 0 2px var(--color-primary)',
                    }}
                  />
                )}
              </div>
            );
          };

          return (
            <>
              <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {available.map(renderCard)}
              </div>

              {comingSoon.length > 0 && (
                <>
                  <div className="mt-12 mb-5 flex items-center gap-4">
                    <p
                      className="text-sm font-semibold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      Coming Soon
                    </p>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                  </div>
                  <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {comingSoon.map(renderCard)}
                  </div>
                </>
              )}
            </>
          );
        })()}

        {!user && (
          <div
            className="mt-10 rounded-2xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex-1">
              <p className="font-semibold mb-1" style={{ color: 'var(--color-heading)' }}>
                Track your wins
              </p>
              <p className="text-sm" style={{ color: 'var(--color-body)' }}>
                Create a free account to save your record and customize your profile.
              </p>
            </div>
            <button
              onClick={onShowAuth}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 hover:opacity-90 active:scale-95 whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
            >
              <LogIn size={16} />
              Sign up free
            </button>
          </div>
        )}
      </main>

      <footer
        className="border-t py-6 text-center"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Friday Night Games &mdash; more games coming soon
        </p>
      </footer>
    </div>
  );
}
