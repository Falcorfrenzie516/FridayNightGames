import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Settings, X, RefreshCw, Info, ChevronRight, RotateCw, RotateCcw } from 'lucide-react';
import DominoIcon from './DominoIcon';
import {
  Domino,
  Train as TrainType,
  Player,
  GameState,
  PendingDouble,
  DOUBLE_SET,
  createDominoSet,
  shuffleDominoes,
  dealHands,
  tilesPerPlayer,
  playDominoOnTrain,
  drawFromBoneyard,
  getPlayableTrains,
  getPlayableTiles,
  canPlay,
  isDouble,
  orientDomino,
  botChooseMove,
  checkRoundOver,
  allPlayersStuck,
  handScore,
  findHighestDouble,
  dominoPipCount,
} from '../lib/dominoTrainsLogic';
import { supabase } from '../lib/supabase';
import { getTable, TABLES } from '../lib/tables';

export interface BotConfig {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DominoSavedState {
  gs: Omit<GameState, 'initialPlacementDone' | 'initialDrawDone'> & {
    initialPlacementDone: string[];
    initialDrawDone: string[];
  };
  bots: BotConfig[];
}

interface DominoTrainsProps {
  onBackToMenu: () => void;
  userId: string | null;
  displayName?: string;
  bots: BotConfig[];
  tableUrl: string;
  currentTable: string;
  onTableChange: (tableId: string) => void;
  savedState?: DominoSavedState | null;
  onSave?: (s: DominoSavedState) => void;
  onClearSave?: () => void;
}

type GridCell = 1 | 0;
type PipGrid = GridCell[][];

const PIP_GRIDS: Record<number, PipGrid> = {
  0:  [[0,0,0],[0,0,0],[0,0,0]],
  1:  [[0,0,0],[0,1,0],[0,0,0]],
  2:  [[1,0,0],[0,0,0],[0,0,1]],
  3:  [[1,0,0],[0,1,0],[0,0,1]],
  4:  [[1,0,1],[0,0,0],[1,0,1]],
  5:  [[1,0,1],[0,1,0],[1,0,1]],
  6:  [[1,0,1],[1,0,1],[1,0,1]],
  7:  [[1,0,1],[1,1,1],[1,0,1]],
  8:  [[1,1,1],[1,0,1],[1,1,1]],
  9:  [[1,1,1],[1,1,1],[1,1,1]],
};

const PIP_GRIDS_4ROW: Record<number, GridCell[][]> = {
  10: [[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
  11: [[1,1,1],[1,0,1],[1,0,1],[1,1,1]],
  12: [[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
};

const PIP_COLORS: Record<number, string> = {
  0:  '#cbd5e1',
  1:  '#dc2626',
  2:  '#ea580c',
  3:  '#d97706',
  4:  '#16a34a',
  5:  '#0891b2',
  6:  '#2563eb',
  7:  '#7c3aed',
  8:  '#db2777',
  9:  '#be123c',
  10: '#0f766e',
  11: '#92400e',
  12: '#1e3a5f',
};

function transposeGrid(grid: GridCell[][]): GridCell[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  return Array.from({ length: cols }, (_, ci) =>
    Array.from({ length: rows }, (_, ri) => grid[ri][ci])
  );
}

function DominoPips({ value, pipSize, rotate = false }: { value: number; pipSize: number; rotate?: boolean }) {
  const dotSize = pipSize <= 32 ? 5 : pipSize <= 44 ? 7 : 9;
  const pad = `${Math.round(dotSize * 0.9)}px`;
  const v = Math.min(value, 12);
  const color = PIP_COLORS[v] ?? '#1e293b';

  const cellStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const dotStyle: React.CSSProperties = { width: dotSize, height: dotSize, flexShrink: 0, borderRadius: '50%', backgroundColor: color };

  if (v <= 9) {
    const raw = PIP_GRIDS[v];
    const grid = rotate ? transposeGrid(raw) : raw;
    const cols = grid[0].length;
    const rows = grid.length;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, width: '100%', height: '100%', padding: pad, boxSizing: 'border-box' }}>
        {grid.flatMap((row, ri) =>
          row.map((cell, ci) => (
            <div key={`${ri}-${ci}`} style={cellStyle}>
              {cell === 1 && <div style={dotStyle} />}
            </div>
          ))
        )}
      </div>
    );
  }

  const raw4 = PIP_GRIDS_4ROW[v];
  const grid4 = rotate ? transposeGrid(raw4) : raw4;
  const cols4 = grid4[0].length;
  const rows4 = grid4.length;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols4}, 1fr)`, gridTemplateRows: `repeat(${rows4}, 1fr)`, width: '100%', height: '100%', padding: pad, boxSizing: 'border-box' }}>
      {grid4.flatMap((row, ri) =>
        row.map((cell, ci) => (
          <div key={`${ri}-${ci}`} style={cellStyle}>
            {cell === 1 && <div style={dotStyle} />}
          </div>
        ))
      )}
    </div>
  );
}

interface DominoTileProps {
  domino: Domino;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  rotation?: number;
  dimmed?: boolean;
  className?: string;
  pendingDouble?: boolean;
}

function DominoTile({
  domino,
  size = 'md',
  selected = false,
  playable = false,
  onClick,
  rotation = 0,
  dimmed = false,
  className = '',
  pendingDouble = false,
}: DominoTileProps) {
  const dims = {
    sm:  { w: 32, h: 80, pip: 32, divider: 2, r: 5 },
    md:  { w: 44, h: 110, pip: 44, divider: 3, r: 7 },
    lg:  { w: 56, h: 140, pip: 56, divider: 4, r: 9 },
  }[size];

  const rot = ((rotation % 4) + 4) % 4;
  const isHoriz = rot === 1 || rot === 3;
  const isFlipped = rot === 2 || rot === 3;

  const [tileW, tileH] = isHoriz ? [dims.h, dims.w] : [dims.w, dims.h];
  const firstSide = isFlipped ? domino.low : domino.high;
  const secondSide = isFlipped ? domino.high : domino.low;

  const halfPipW = isHoriz ? dims.h / 2 : dims.w;
  const halfPipH = isHoriz ? dims.w : dims.h / 2;

  const isDBL = isDouble(domino);

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={[
        'flex-shrink-0 relative rounded-lg border-2 flex transition-all duration-150',
        isHoriz ? 'flex-row' : 'flex-col',
        pendingDouble
          ? 'border-yellow-400'
          : selected
            ? 'border-yellow-400 shadow-yellow-300 shadow-md scale-105'
            : playable
              ? 'border-blue-400 hover:scale-105 hover:shadow-md cursor-pointer'
              : onClick
                ? (isDBL ? 'border-amber-400 hover:border-amber-500 cursor-pointer' : 'border-gray-300 hover:border-gray-400 cursor-pointer')
                : (isDBL ? 'border-amber-300' : 'border-gray-300 cursor-default'),
        dimmed ? 'opacity-40' : '',
        className,
      ].join(' ')}
      style={{
        width: tileW,
        height: tileH,
        backgroundColor: pendingDouble ? '#fef08a' : selected ? '#fef9c3' : (isDBL ? '#fffbeb' : '#fffdf5'),
        minWidth: tileW,
        boxShadow: pendingDouble
          ? '0 0 0 2px #eab308, 0 0 8px 2px rgba(234,179,8,0.4)'
          : isDBL && !selected
            ? '0 0 5px 1px rgba(245,158,11,0.25)'
            : undefined,
      }}
    >
      <div
        className="flex items-center justify-center flex-1"
        style={{ minWidth: 0, minHeight: 0 }}
      >
        <div style={{ width: Math.min(halfPipW, halfPipH), height: Math.min(halfPipW, halfPipH), flexShrink: 0 }} className="text-gray-800">
          <DominoPips value={firstSide} pipSize={dims.pip} rotate={isHoriz} />
        </div>
      </div>
      <div
        className={isHoriz ? 'w-px self-stretch bg-gray-400 my-1' : 'h-px self-stretch bg-gray-400 mx-1'}
      />
      <div
        className="flex items-center justify-center flex-1"
        style={{ minWidth: 0, minHeight: 0 }}
      >
        <div style={{ width: Math.min(halfPipW, halfPipH), height: Math.min(halfPipW, halfPipH), flexShrink: 0 }} className="text-gray-800">
          <DominoPips value={secondSide} pipSize={dims.pip} rotate={isHoriz} />
        </div>
      </div>
    </button>
  );
}

function TrainEngineDisplay({ engineValue }: { engineValue: number }) {
  const color = '#1d4ed8';
  const pip = (cx: number, cy: number, r = 3) => (
    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
  );

  const pipLayouts: Record<number, [number, number][]> = {
    0: [],
    1: [[0, 0]],
    2: [[-7, -7], [7, 7]],
    3: [[-7, -7], [0, 0], [7, 7]],
    4: [[-7, -7], [7, -7], [-7, 7], [7, 7]],
    5: [[-7, -7], [7, -7], [0, 0], [-7, 7], [7, 7]],
    6: [[-7, -7], [7, -7], [-7, 0], [7, 0], [-7, 7], [7, 7]],
    7: [[-7, -7], [7, -7], [-7, 0], [0, 0], [7, 0], [-7, 7], [7, 7]],
    8: [[-7, -7], [0, -7], [7, -7], [-7, 0], [7, 0], [-7, 7], [0, 7], [7, 7]],
    9: [[-7, -7], [0, -7], [7, -7], [-7, 0], [0, 0], [7, 0], [-7, 7], [0, 7], [7, 7]],
    10: [[-7, -9], [7, -9], [-7, -3], [7, -3], [-7, 3], [7, 3], [-7, 9], [7, 9]],
    11: [[-7, -9], [0, -9], [7, -9], [-7, -3], [7, -3], [-7, 3], [7, 3], [-7, 9], [0, 9], [7, 9]],
    12: [[-7, -9], [0, -9], [7, -9], [-7, -3], [0, -3], [7, -3], [-7, 3], [0, 3], [7, 3], [-7, 9], [0, 9], [7, 9]],
  };

  const v = Math.min(engineValue, 12);
  const pips = pipLayouts[v] ?? [];

  const halfPips = (cx: number, cy: number) =>
    pips.map(([dx, dy]) => pip(cx + dx, cy + dy, v >= 10 ? 2.5 : 3));

  const engineDomino: Domino = { id: 'engine', high: engineValue, low: engineValue };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 70, height: 170 }}>
        <svg viewBox="0 0 90 220" width={70} height={170} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="engine-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Outer blob / track outline */}
          <ellipse cx="45" cy="110" rx="40" ry="108" fill="#dbeafe" stroke={color} strokeWidth="2" opacity="0.5" />

          {/* Rails */}
          <rect x="17" y="30" width="5" height="160" rx="2.5" fill={color} opacity="0.35" />
          <rect x="68" y="30" width="5" height="160" rx="2.5" fill={color} opacity="0.35" />

          {/* Rail ties */}
          {[50, 70, 90, 110, 130, 150, 170].map(y => (
            <rect key={y} x="17" y={y} width="56" height="5" rx="2" fill={color} opacity="0.25" />
          ))}

          {/* Locomotive cab (top) */}
          <rect x="25" y="22" width="40" height="50" rx="10" fill={color} filter="url(#engine-shadow)" />
          {/* Cab window */}
          <rect x="32" y="30" width="26" height="16" rx="4" fill="white" opacity="0.85" />
          {/* Cab details */}
          <rect x="38" y="52" width="14" height="6" rx="3" fill="white" opacity="0.5" />
          {/* Horn */}
          <rect x="21" y="38" width="7" height="4" rx="2" fill={color} stroke="white" strokeWidth="0.8" />

          {/* Connector between cab and car */}
          <rect x="38" y="72" width="14" height="12" rx="3" fill={color} opacity="0.6" />

          {/* Wheels */}
          <circle cx="27" cy="168" r="7" fill={color} />
          <circle cx="63" cy="168" r="7" fill={color} />
          <circle cx="27" cy="168" r="3.5" fill="white" opacity="0.7" />
          <circle cx="63" cy="168" r="3.5" fill="white" opacity="0.7" />

          {/* Bumper */}
          <rect x="28" y="176" width="34" height="6" rx="3" fill={color} opacity="0.7" />
        </svg>
        <div className="absolute flex items-center justify-center" style={{ left: 15, top: 63, width: 40, height: 59 }}>
          <DominoTile domino={engineDomino} size="sm" rotation={0} />
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
        Engine
      </span>
    </div>
  );
}

interface TrainDisplayProps {
  train: TrainType;
  label: string;
  isMexican?: boolean;
  isCurrentPlayer?: boolean;
  canPlayOn?: boolean;
  selectedDomino: Domino | null;
  onPlayHere: () => void;
  compact?: boolean;
  tileOrientations?: Record<string, number>;
  tilesLeft?: number;
  pendingDoubleId?: string | null;
  startOpenEnd: number;
}

const TRAIN_ROW_TILES = 8;

function computeAutoRotation(domino: Domino, openEnd: number, rowIndex: number): number {
  const highLeads = domino.high === openEnd;
  const isEvenRow = rowIndex % 2 === 0;
  if (isDouble(domino)) {
    return isEvenRow ? 1 : 3;
  }
  if (isEvenRow) {
    return highLeads ? 1 : 3;
  } else {
    return highLeads ? 3 : 1;
  }
}

function computeTrainRotations(train: TrainType, startOpenEnd: number): number[] {
  const rotations: number[] = [];
  let openEnd = startOpenEnd;
  for (let i = 0; i < train.tiles.length; i++) {
    const t = train.tiles[i];
    const rowIndex = Math.floor(i / TRAIN_ROW_TILES);
    rotations.push(computeAutoRotation(t, openEnd, rowIndex));
    const { trailing } = orientDomino(t, openEnd);
    openEnd = trailing;
  }
  return rotations;
}

function TrainDisplay({
  train,
  label,
  isMexican = false,
  isCurrentPlayer = false,
  canPlayOn = false,
  selectedDomino,
  onPlayHere,
  compact = false,
  tileOrientations = {},
  tilesLeft,
  pendingDoubleId = null,
  startOpenEnd,
}: TrainDisplayProps) {
  const accentColor = isMexican
    ? '#f87171'
    : isCurrentPlayer
      ? '#60a5fa'
      : '#94a3b8';

  const canPlace = canPlayOn && selectedDomino && canPlay(selectedDomino, train.openEnd);

  const autoRotations = computeTrainRotations(train, startOpenEnd);

  const rows: { tile: Domino; autoRot: number }[][] = [];
  for (let i = 0; i < train.tiles.length; i += TRAIN_ROW_TILES) {
    rows.push(
      train.tiles.slice(i, i + TRAIN_ROW_TILES).map((tile, j) => ({
        tile,
        autoRot: autoRotations[i + j],
      }))
    );
  }

  return (
    <div
      className={[
        'rounded-xl border-2 p-3',
        canPlace ? 'border-dashed border-blue-400 bg-blue-900/30 cursor-pointer hover:bg-blue-800/40' : '',
        !canPlace && canPlayOn ? 'border-white/20 bg-white/10' : '',
        !canPlayOn ? 'border-white/10 bg-white/5' : '',
      ].join(' ')}
      onClick={canPlace ? onPlayHere : undefined}
      title={canPlace ? 'Click to play here' : undefined}
    >
      <div className="flex items-center gap-2 mb-2">
        {!isMexican && (
          <div className="flex-shrink-0 flex flex-col items-center">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-black shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              {tilesLeft ?? train.openEnd}
            </div>
            {tilesLeft !== undefined && (
              <span className="text-[8px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: accentColor, opacity: 0.7 }}>tiles</span>
            )}
          </div>
        )}
        {isMexican ? (
          <span className="text-xs font-bold" style={{ color: accentColor }}>Community Train</span>
        ) : (
          <span className="text-xs font-bold" style={{ color: accentColor }}>{label}</span>
        )}
        {!isMexican && (
          <span
            className="inline-block w-3 h-3 rounded-full shadow-sm flex-shrink-0"
            style={{
              backgroundColor: train.hasMarker ? '#16a34a' : '#dc2626',
              boxShadow: train.hasMarker
                ? '0 0 4px 1px rgba(22,163,74,0.5)'
                : '0 0 4px 1px rgba(220,38,38,0.4)',
            }}
            title={train.hasMarker ? 'Open — anyone can play here' : 'Closed — only owner can play here'}
          />
        )}
        {train.tiles.length === 0 && (
          <span className="text-[10px] text-white/40 font-medium">Empty</span>
        )}
        {canPlace && (
          <span className="ml-auto text-[10px] px-2 py-0.5 bg-blue-500 text-white font-bold rounded-lg shadow">
            Play here
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 overflow-x-auto">
        {rows.map((row, rowIdx) => {
          const isReverse = rowIdx % 2 === 1;
          const displayRow = isReverse ? [...row].reverse() : row;
          const numTies = Math.max(2, row.length + 1);
          return (
            <div key={rowIdx} className="relative">
              {/* Track — only as wide as the tiles in this row */}
              <div
                className="absolute inset-y-0 pointer-events-none"
                style={{
                  zIndex: 0,
                  left: isReverse ? 'auto' : 0,
                  right: isReverse ? 0 : 'auto',
                  width: 'fit-content',
                  minWidth: 0,
                }}
              >
                <div
                  className="h-full relative flex flex-col justify-between py-2"
                  style={{ width: `${row.length * 52}px` }}
                >
                  <div
                    style={{
                      height: 3,
                      background: 'repeating-linear-gradient(to right, #94a3b8 0px, #94a3b8 10px, transparent 10px, transparent 18px)',
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                  <div
                    style={{
                      height: 3,
                      background: 'repeating-linear-gradient(to right, #94a3b8 0px, #94a3b8 10px, transparent 10px, transparent 18px)',
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                  {/* Rail ties */}
                  <div className="absolute inset-0">
                    {Array.from({ length: numTies }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: `${(i / (numTies - 1)) * 100}%`,
                          top: '16%',
                          bottom: '16%',
                          width: 4,
                          background: '#94a3b8',
                          borderRadius: 2,
                          opacity: 0.35,
                          transform: 'translateX(-50%)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div
                className="flex gap-1.5 items-center relative"
                style={{ justifyContent: isReverse ? 'flex-end' : 'flex-start', zIndex: 1 }}
              >
                {displayRow.map(({ tile: t, autoRot }) => {
                  const rot = tileOrientations[t.id] ?? autoRot;
                  const isPendingDouble = t.id === pendingDoubleId;
                  const isDbl = isDouble(t);
                  return (
                    <div
                      key={t.id}
                      className="relative group flex-shrink-0"
                      style={{ display: 'inline-flex' }}
                    >
                      {isDbl && !isPendingDouble && (
                        <div
                          className="absolute inset-0 rounded-lg pointer-events-none"
                          style={{
                            border: '2px solid #f59e0b',
                            boxShadow: '0 0 6px 2px rgba(245,158,11,0.35)',
                            zIndex: 2,
                            borderRadius: 8,
                          }}
                        />
                      )}
                      <DominoTile
                        domino={t}
                        size="md"
                        rotation={rot}
                        pendingDouble={isPendingDouble}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function makePlayerId(name: string, isBot: boolean): string {
  return isBot ? `bot-${name.toLowerCase().replace(/\s+/g, '-')}` : 'human';
}

function initRound(round: number, existingPlayers: Player[]): GameState {
  const engineValue = DOUBLE_SET - round;
  const allTiles = shuffleDominoes(createDominoSet(DOUBLE_SET)).filter(
    d => !(d.high === engineValue && d.low === engineValue)
  );

  const players: Player[] = existingPlayers.map(p => ({ ...p, hand: [], roundScore: 0 }));
  const count = tilesPerPlayer(players.length);
  const { hands, remaining } = dealHands(allTiles, players, count);
  players.forEach((p, i) => { p.hand = hands[i]; });

  const trains: Record<string, TrainType> = {};
  for (const p of players) {
    trains[p.id] = {
      ownerId: p.id,
      tiles: [],
      openEnd: engineValue,
      isPublic: false,
      hasMarker: false,
    };
  }

  const mexicanTrain: TrainType = {
    ownerId: 'mexican',
    tiles: [],
    openEnd: engineValue,
    isPublic: true,
    hasMarker: false,
  };

  const initialPlacementDone = new Set<string>();
  const initialDrawDone = new Set<string>();
  const firstPlayerIndex = 0;

  return {
    round,
    maxRound: DOUBLE_SET,
    engineValue,
    boneyard: remaining,
    players,
    trains,
    mexicanTrain,
    currentPlayerIndex: firstPlayerIndex,
    pendingDouble: null,
    phase: 'initial-placement',
    initialPlacementDone,
    initialDrawDone,
    message: `Round ${round + 1} — Engine is double-${engineValue}. Place your first tile to start your train.`,
    drewFromBoneyard: false,
    winner: null,
    bonusTilePending: false,
  };
}

export default function DominoTrains({
  onBackToMenu,
  userId,
  displayName,
  bots,
  tableUrl,
  currentTable,
  onTableChange,
  savedState,
  onSave,
  onClearSave,
}: DominoTrainsProps) {
  const [gs, setGs] = useState<GameState | null>(() => {
    if (!savedState) return null;
    return {
      ...savedState.gs,
      initialPlacementDone: new Set(savedState.gs.initialPlacementDone),
      initialDrawDone: new Set(savedState.gs.initialDrawDone),
    };
  });
  const [selectedDomino, setSelectedDomino] = useState<Domino | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [roundSummaryData, setRoundSummaryData] = useState<{ name: string; roundScore: number; totalScore: number }[]>([]);
  const [handOrder, setHandOrder] = useState<string[]>([]);
  const [tileOrientations, setTileOrientations] = useState<Record<string, number>>({});
  const [trainTileOrientations, setTrainTileOrientations] = useState<Record<string, number>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const botTurnRef = useRef(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (savedState) return;
    const humanPlayer: Player = {
      id: 'human',
      name: displayName && displayName.trim() ? displayName.trim() : 'Guest',
      isBot: false,
      difficulty: 'medium',
      hand: [],
      score: 0,
      roundScore: 0,
    };
    const botPlayers: Player[] = bots.map(b => ({
      id: makePlayerId(b.name, true),
      name: b.name,
      isBot: true,
      difficulty: b.difficulty,
      hand: [],
      score: 0,
      roundScore: 0,
    }));
    const allPlayers = [humanPlayer, ...botPlayers];
    setGs(initRound(0, allPlayers));
  }, []);

  useEffect(() => {
    if (!gs) return;
    if (gs.phase !== 'playing' && gs.phase !== 'initial-placement') return;
    const currentPlayer = gs.players[gs.currentPlayerIndex];
    if (!currentPlayer.isBot) return;
    if (botTurnRef.current) return;
    botTurnRef.current = true;

    const delay = gs.phase === 'initial-placement' ? 700 : 900;
    const timer = setTimeout(() => {
      setGs(prev => {
        if (!prev) return prev;
        return runBotAction(prev);
      });
      botTurnRef.current = false;
    }, delay);
    return () => { clearTimeout(timer); botTurnRef.current = false; };
  }, [gs?.currentPlayerIndex, gs?.phase]);

  useEffect(() => {
    if (!settingsRef.current) return;
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  useEffect(() => {
    if (!gs) return;
    if (gs.phase === 'game-over') {
      onClearSave?.();
      return;
    }
    if (!onSave || !userId) return;
    const snapshot: DominoSavedState = {
      gs: {
        ...gs,
        initialPlacementDone: Array.from(gs.initialPlacementDone),
        initialDrawDone: Array.from(gs.initialDrawDone),
      },
      bots,
    };
    onSave(snapshot);
  }, [gs?.currentPlayerIndex, gs?.phase, gs?.round]);

  function runBotAction(state: GameState): GameState {
    const bot = state.players[state.currentPlayerIndex];
    if (!bot.isBot) return state;

    if (state.phase === 'initial-placement') {
      return handleInitialBotPlacement(state, bot);
    }
    return handleBotPlayTurn(state, bot);
  }

  function handleInitialBotPlacement(state: GameState, bot: Player): GameState {
    let newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const botPlayer = newState.players.find(p => p.id === bot.id)!;

    const hasDrawn = state.initialDrawDone.has(bot.id);
    const matchingTiles = getPlayableTiles(bot.hand, state.engineValue);
    const canPlayAny = hasDrawn && matchingTiles.length === 0;
    const tileToPlay: Domino | null = matchingTiles[0] ?? (canPlayAny ? bot.hand[0] ?? null : null);

    if (tileToPlay) {
      botPlayer.hand = botPlayer.hand.filter(d => d.id !== tileToPlay!.id);
      newState.trains = {
        ...newState.trains,
        [bot.id]: playDominoOnTrain(newState.trains[bot.id], tileToPlay),
      };
      const done = new Set(newState.initialPlacementDone);
      done.add(bot.id);
      newState.initialPlacementDone = done;

      const allDone = newState.players.every(p => done.has(p.id));
      if (allDone) {
        const humanIdx = newState.players.findIndex(p => !p.isBot);
        return {
          ...newState,
          phase: 'playing',
          currentPlayerIndex: humanIdx >= 0 ? humanIdx : 0,
          message: 'All trains started! Your turn.',
        };
      }

      const next = (newState.currentPlayerIndex + 1) % newState.players.length;
      const nextPlayer = newState.players[next];
      const humanDrawnMsg = newState.initialDrawDone.has('human') ? 'You can use any tile to start your train.' : 'Your turn to start your train.';
      return {
        ...newState,
        currentPlayerIndex: next,
        message: nextPlayer.isBot
          ? `${nextPlayer.name} is placing their first tile...`
          : humanDrawnMsg,
      };
    }

    if (!hasDrawn && newState.boneyard.length > 0) {
      const { drawn, remaining } = drawFromBoneyard(newState.boneyard);
      botPlayer.hand = [...botPlayer.hand, ...drawn];
      newState.boneyard = remaining;
      const drawnSet = new Set(newState.initialDrawDone);
      drawnSet.add(bot.id);
      newState.initialDrawDone = drawnSet;
      const next = (newState.currentPlayerIndex + 1) % newState.players.length;
      const nextPlayer = newState.players[next];
      return {
        ...newState,
        currentPlayerIndex: next,
        message: nextPlayer.isBot
          ? `${nextPlayer.name} is placing their first tile...`
          : `${bot.name} had no match — drew a tile. Your turn.`,
      };
    }

    const done = new Set(newState.initialPlacementDone);
    done.add(bot.id);
    newState.initialPlacementDone = done;
    newState.trains = {
      ...newState.trains,
      [bot.id]: { ...newState.trains[bot.id], hasMarker: true, isPublic: true },
    };

    const allDone = newState.players.every(p => done.has(p.id));
    if (allDone) {
      const humanIdx = newState.players.findIndex(p => !p.isBot);
      return {
        ...newState,
        phase: 'playing',
        currentPlayerIndex: humanIdx >= 0 ? humanIdx : 0,
        message: 'All trains started! Your turn.',
      };
    }

    const next = (newState.currentPlayerIndex + 1) % newState.players.length;
    const nextPlayer = newState.players[next];
    const humanDrawnMsg2 = newState.initialDrawDone.has('human') ? 'You can use any tile to start your train.' : 'Your turn to start your train.';
    return {
      ...newState,
      currentPlayerIndex: next,
      message: nextPlayer.isBot
        ? `${nextPlayer.name} is placing their first tile...`
        : humanDrawnMsg2,
    };
  }

  function botPlayTile(state: GameState, bot: Player, trainId: string, domino: Domino): GameState {
    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const botPlayer = newState.players.find(p => p.id === bot.id)!;
    botPlayer.hand = botPlayer.hand.filter(d => d.id !== domino.id);
    if (trainId === 'mexican') {
      newState.mexicanTrain = playDominoOnTrain(newState.mexicanTrain, domino);
    } else {
      newState.trains = { ...newState.trains, [trainId]: playDominoOnTrain(newState.trains[trainId], domino) };
      if (trainId === bot.id) {
        newState.trains[bot.id] = { ...newState.trains[bot.id], isPublic: false, hasMarker: false };
      }
    }
    return newState;
  }

  function handleBotPlayTurn(state: GameState, bot: Player): GameState {
    let newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const botPlayer = newState.players.find(p => p.id === bot.id)!;

    const coverTrainsForDouble = newState.pendingDouble
      ? getPlayableTrains(bot.id, newState.trains, newState.mexicanTrain, newState.pendingDouble)
      : null;

    if (newState.bonusTilePending) {
      const bonusTrains = getPlayableTrains(bot.id, newState.trains, newState.mexicanTrain, null);
      const bonusMove = botChooseMove(botPlayer.hand, bonusTrains, newState.trains, newState.mexicanTrain, bot.difficulty, null);
      newState.bonusTilePending = false;
      if (bonusMove) {
        newState = botPlayTile(newState, bot, bonusMove.trainId, bonusMove.domino);
        botPlayer.hand = newState.players.find(p => p.id === bot.id)!.hand;
        if (isDouble(bonusMove.domino)) {
          newState.pendingDouble = { trainId: bonusMove.trainId, domino: bonusMove.domino, playedByPlayerId: bot.id };
          newState.message = `${bot.name} played a double-${bonusMove.domino.high} as their bonus! It must be covered.`;
          return handleBotCoverOwnDouble(newState, bot);
        }
      }
      const winner = checkRoundOver(newState.players);
      if (winner) return endRound(newState, winner);
      if (allPlayersStuck(newState.players, newState.trains, newState.mexicanTrain, newState.boneyard, newState.pendingDouble)) return endRound(newState, null);
      return advanceTurn(newState, true);
    }

    if (newState.pendingDouble && coverTrainsForDouble) {
      const coverMove = botChooseMove(botPlayer.hand, coverTrainsForDouble, newState.trains, newState.mexicanTrain, bot.difficulty, newState.pendingDouble);
      if (coverMove) {
        newState = botPlayTile(newState, bot, coverMove.trainId, coverMove.domino);
        botPlayer.hand = newState.players.find(p => p.id === bot.id)!.hand;
        newState.pendingDouble = null;
        newState.bonusTilePending = true;
        newState.message = `${bot.name} covered the double and gets a bonus tile.`;
        return handleBotPlayTurn(newState, bot);
      }
      if (newState.boneyard.length > 0) {
        const { drawn, remaining } = drawFromBoneyard(newState.boneyard);
        botPlayer.hand = [...botPlayer.hand, ...drawn];
        newState.boneyard = remaining;
        const coverMoveAfterDraw = botChooseMove(botPlayer.hand, coverTrainsForDouble, newState.trains, newState.mexicanTrain, bot.difficulty, newState.pendingDouble);
        if (coverMoveAfterDraw) {
          newState = botPlayTile(newState, bot, coverMoveAfterDraw.trainId, coverMoveAfterDraw.domino);
          botPlayer.hand = newState.players.find(p => p.id === bot.id)!.hand;
          newState.pendingDouble = null;
          newState.bonusTilePending = true;
          newState.message = `${bot.name} drew and covered the double!`;
          return handleBotPlayTurn(newState, bot);
        }
      }
      newState.trains[bot.id] = { ...newState.trains[bot.id], hasMarker: true, isPublic: true };
      newState.message = `${bot.name} couldn't cover the double. Their train is now open.`;
      if (allPlayersStuck(newState.players, newState.trains, newState.mexicanTrain, newState.boneyard, newState.pendingDouble)) return endRound(newState, null);
      return advanceTurn(newState, true);
    }

    const playableTrains = getPlayableTrains(bot.id, newState.trains, newState.mexicanTrain, null);
    const move = botChooseMove(botPlayer.hand, playableTrains, newState.trains, newState.mexicanTrain, bot.difficulty, null);

    if (move) {
      newState = botPlayTile(newState, bot, move.trainId, move.domino);
      botPlayer.hand = newState.players.find(p => p.id === bot.id)!.hand;

      if (isDouble(move.domino)) {
        newState.pendingDouble = { trainId: move.trainId, domino: move.domino, playedByPlayerId: bot.id };
        newState.message = `${bot.name} played a double-${move.domino.high}! They must cover it.`;
        return handleBotCoverOwnDouble(newState, bot);
      }

      const winner = checkRoundOver(newState.players);
      if (winner) return endRound(newState, winner);
      if (allPlayersStuck(newState.players, newState.trains, newState.mexicanTrain, newState.boneyard, newState.pendingDouble)) return endRound(newState, null);
      return advanceTurn(newState, true);
    }

    if (newState.boneyard.length > 0) {
      const { drawn, remaining } = drawFromBoneyard(newState.boneyard);
      botPlayer.hand = [...botPlayer.hand, ...drawn];
      newState.boneyard = remaining;
      const move2 = botChooseMove(botPlayer.hand, playableTrains, newState.trains, newState.mexicanTrain, bot.difficulty, null);
      if (move2) {
        newState = botPlayTile(newState, bot, move2.trainId, move2.domino);
        botPlayer.hand = newState.players.find(p => p.id === bot.id)!.hand;
        if (isDouble(move2.domino)) {
          newState.pendingDouble = { trainId: move2.trainId, domino: move2.domino, playedByPlayerId: bot.id };
          newState.message = `${bot.name} drew and played a double-${move2.domino.high}! They must cover it.`;
          return handleBotCoverOwnDouble(newState, bot);
        }
        const winner = checkRoundOver(newState.players);
        if (winner) return endRound(newState, winner);
        if (allPlayersStuck(newState.players, newState.trains, newState.mexicanTrain, newState.boneyard, newState.pendingDouble)) return endRound(newState, null);
        return advanceTurn(newState, true);
      }
    }

    newState.trains[bot.id] = { ...newState.trains[bot.id], hasMarker: true, isPublic: true };
    newState.message = `${bot.name} can't play — their train is now open.`;
    if (allPlayersStuck(newState.players, newState.trains, newState.mexicanTrain, newState.boneyard, newState.pendingDouble)) return endRound(newState, null);
    return advanceTurn(newState, true);
  }

  function handleBotCoverOwnDouble(state: GameState, bot: Player): GameState {
    let newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const botPlayer = newState.players.find(p => p.id === bot.id)!;
    if (!newState.pendingDouble) return advanceTurn(newState, false);

    const coverTrains = getPlayableTrains(bot.id, newState.trains, newState.mexicanTrain, newState.pendingDouble);
    const coverMove = botChooseMove(botPlayer.hand, coverTrains, newState.trains, newState.mexicanTrain, bot.difficulty, newState.pendingDouble);

    if (coverMove) {
      newState = botPlayTile(newState, bot, coverMove.trainId, coverMove.domino);
      botPlayer.hand = newState.players.find(p => p.id === bot.id)!.hand;
      newState.pendingDouble = null;
      newState.bonusTilePending = true;
      newState.message = `${bot.name} covered their own double and gets a bonus tile.`;
      return handleBotPlayTurn(newState, bot);
    }

    if (newState.boneyard.length > 0) {
      const { drawn, remaining } = drawFromBoneyard(newState.boneyard);
      botPlayer.hand = [...botPlayer.hand, ...drawn];
      newState.boneyard = remaining;
      const coverMoveAfterDraw = botChooseMove(botPlayer.hand, coverTrains, newState.trains, newState.mexicanTrain, bot.difficulty, newState.pendingDouble);
      if (coverMoveAfterDraw) {
        newState = botPlayTile(newState, bot, coverMoveAfterDraw.trainId, coverMoveAfterDraw.domino);
        botPlayer.hand = newState.players.find(p => p.id === bot.id)!.hand;
        newState.pendingDouble = null;
        newState.bonusTilePending = true;
        newState.message = `${bot.name} drew and covered their own double!`;
        return handleBotPlayTurn(newState, bot);
      }
    }

    newState.trains[bot.id] = { ...newState.trains[bot.id], hasMarker: true, isPublic: true };
    newState.message = `${bot.name} played a double-${newState.pendingDouble.domino.high} but couldn't cover it. Their train is now open.`;
    if (allPlayersStuck(newState.players, newState.trains, newState.mexicanTrain, newState.boneyard, newState.pendingDouble)) return endRound(newState, null);
    return advanceTurn(newState, false);
  }

  function advanceTurn(state: GameState, clearDrewFlag: boolean): GameState {
    const next = (state.currentPlayerIndex + 1) % state.players.length;
    const nextPlayer = state.players[next];
    return {
      ...state,
      currentPlayerIndex: next,
      drewFromBoneyard: false,
      message: nextPlayer.isBot
        ? `${nextPlayer.name} is thinking...`
        : state.pendingDouble
          ? `A double must be satisfied — play on that train.`
          : 'Your turn.',
    };
  }

  function endRound(state: GameState, winnerId: string | null): GameState {
    const updatedPlayers = state.players.map(p => {
      const rs = handScore(p.hand);
      return { ...p, roundScore: rs, score: p.score + rs };
    });

    const summary = updatedPlayers.map(p => ({
      name: p.name,
      roundScore: p.roundScore,
      totalScore: p.score,
    }));
    setRoundSummaryData(summary);
    setShowRoundSummary(true);

    const isGameOver = state.round >= state.maxRound;
    const gameWinner = isGameOver
      ? updatedPlayers.reduce((best, p) => p.score < best.score ? p : best, updatedPlayers[0]).name
      : null;

    return {
      ...state,
      players: updatedPlayers,
      phase: isGameOver ? 'game-over' : 'round-over',
      message: winnerId
        ? `${updatedPlayers.find(p => p.id === winnerId)?.name ?? 'Someone'} played all tiles!`
        : 'No more moves available.',
      winner: gameWinner,
    };
  }

  function startNextRound() {
    if (!gs) return;
    setShowRoundSummary(false);
    setSelectedDomino(null);
    botTurnRef.current = false;
    const next = initRound(gs.round + 1, gs.players);
    setGs(next);
  }

  function handleSelectDomino(domino: Domino) {
    if (!gs || gs.phase === 'round-over' || gs.phase === 'game-over') return;
    const human = gs.players.find(p => !p.isBot);
    if (!human || gs.players[gs.currentPlayerIndex].id !== 'human') return;
    setSelectedDomino(prev => (prev?.id === domino.id ? null : domino));
  }

  function handleInitialHumanPlacement(domino: Domino) {
    if (!gs) return;
    setGs(prev => {
      if (!prev) return prev;
      const human = prev.players.find(p => !p.isBot)!;
      const newPlayers = prev.players.map(p =>
        p.id === 'human' ? { ...p, hand: p.hand.filter(d => d.id !== domino.id) } : { ...p }
      );
      const newTrains = {
        ...prev.trains,
        human: playDominoOnTrain(prev.trains['human'], domino),
      };
      const done = new Set(prev.initialPlacementDone);
      done.add('human');

      const allDone = prev.players.every(p => done.has(p.id));
      if (allDone) {
        return { ...prev, players: newPlayers, trains: newTrains, initialPlacementDone: done, phase: 'playing', message: 'All trains started! Your turn.' };
      }
      const next = (prev.currentPlayerIndex + 1) % prev.players.length;
      const nextPlayer = prev.players[next];
      return {
        ...prev,
        players: newPlayers,
        trains: newTrains,
        initialPlacementDone: done,
        currentPlayerIndex: next,
        message: nextPlayer.isBot ? `${nextPlayer.name} is placing their first tile...` : 'Your turn.',
      };
    });
    setSelectedDomino(null);
  }

  function handlePlayOnTrain(trainId: string) {
    if (!gs || !selectedDomino) return;
    const trainObj = trainId === 'mexican' ? gs.mexicanTrain : gs.trains[trainId];
    if (!trainObj || !canPlay(selectedDomino, trainObj.openEnd)) return;

    setGs(prev => {
      if (!prev || !selectedDomino) return prev;
      let newState = { ...prev, players: prev.players.map(p => ({ ...p })) };
      const humanPlayer = newState.players.find(p => p.id === 'human')!;

      humanPlayer.hand = humanPlayer.hand.filter(d => d.id !== selectedDomino.id);
      if (trainId === 'mexican') {
        newState.mexicanTrain = playDominoOnTrain(newState.mexicanTrain, selectedDomino);
      } else {
        newState.trains = { ...newState.trains, [trainId]: playDominoOnTrain(newState.trains[trainId], selectedDomino) };
        if (trainId === 'human') {
          newState.trains['human'] = { ...newState.trains['human'], isPublic: false, hasMarker: false };
        }
      }

      if (prev.bonusTilePending) {
        newState.bonusTilePending = false;
        if (isDouble(selectedDomino)) {
          newState.pendingDouble = { trainId, domino: selectedDomino, playedByPlayerId: 'human' };
          const canCover = getPlayableTrains('human', newState.trains, newState.mexicanTrain, newState.pendingDouble).some(tid => {
            const end = tid === 'mexican' ? newState.mexicanTrain.openEnd : newState.trains[tid]?.openEnd ?? -1;
            return getPlayableTiles(humanPlayer.hand, end).length > 0;
          });
          if (canCover) {
            newState.message = `You played a double-${selectedDomino.high} as your bonus! Now cover it.`;
            return newState;
          }
          newState.message = `You played a double-${selectedDomino.high}! It must be satisfied.`;
          return advanceTurn(newState, true);
        }
        const winner = checkRoundOver(newState.players);
        if (winner) return endRound(newState, winner);
        if (allPlayersStuck(newState.players, newState.trains, newState.mexicanTrain, newState.boneyard, newState.pendingDouble)) return endRound(newState, null);
        return advanceTurn(newState, true);
      }

      if (isDouble(selectedDomino)) {
        newState.pendingDouble = { trainId, domino: selectedDomino, playedByPlayerId: 'human' };
        const canCover = getPlayableTrains('human', newState.trains, newState.mexicanTrain, newState.pendingDouble).some(tid => {
          const end = tid === 'mexican' ? newState.mexicanTrain.openEnd : newState.trains[tid]?.openEnd ?? -1;
          return getPlayableTiles(humanPlayer.hand, end).length > 0;
        });
        if (canCover) {
          newState.message = `You played a double-${selectedDomino.high}! Cover it now, or pass if you'd rather not.`;
          return newState;
        }
        newState.message = `You played a double-${selectedDomino.high}! You have no cover — draw or pass.`;
        return newState;
      }

      const coveringDouble = prev.pendingDouble && trainId === prev.pendingDouble.trainId;
      if (coveringDouble) {
        newState.pendingDouble = null;
        newState.drewFromBoneyard = false;
        const winnerAfterCover = checkRoundOver(newState.players);
        if (winnerAfterCover) return endRound(newState, winnerAfterCover);
        newState.bonusTilePending = true;
        newState.message = `You covered the double! Play a bonus tile if you can, or pass.`;
        return newState;
      }

      const winner = checkRoundOver(newState.players);
      if (winner) return endRound(newState, winner);
      if (allPlayersStuck(newState.players, newState.trains, newState.mexicanTrain, newState.boneyard, newState.pendingDouble)) return endRound(newState, null);
      return advanceTurn(newState, true);
    });
    setSelectedDomino(null);
  }

  function handleDrawFromBoneyard() {
    if (!gs || gs.drewFromBoneyard || gs.boneyard.length === 0) return;
    if (gs.players[gs.currentPlayerIndex].id !== 'human') return;
    setGs(prev => {
      if (!prev) return prev;
      const { drawn, remaining } = drawFromBoneyard(prev.boneyard);
      const newPlayers = prev.players.map(p =>
        p.id === 'human' ? { ...p, hand: [...p.hand, ...drawn] } : { ...p }
      );

      if (prev.phase === 'initial-placement' && !prev.initialPlacementDone.has('human')) {
        const drawnSet = new Set(prev.initialDrawDone);
        drawnSet.add('human');
        const next = (prev.currentPlayerIndex + 1) % prev.players.length;
        const nextPlayer = prev.players[next];
        return {
          ...prev,
          players: newPlayers,
          boneyard: remaining,
          initialDrawDone: drawnSet,
          currentPlayerIndex: next,
          drewFromBoneyard: false,
          message: nextPlayer.isBot
            ? `${nextPlayer.name} is placing their first tile...`
            : `You drew a tile. Next round you can play any tile to start your train.`,
        };
      }

      return {
        ...prev,
        players: newPlayers,
        boneyard: remaining,
        drewFromBoneyard: true,
        message: `You drew a tile. Play it or pass if you can't.`,
      };
    });
  }

  function handlePass() {
    if (!gs) return;
    setGs(prev => {
      if (!prev) return prev;

      if (prev.phase === 'initial-placement') {
        const hasDrawn = prev.initialDrawDone.has('human');
        if (!hasDrawn && prev.boneyard.length > 0) return prev;
        const done = new Set(prev.initialPlacementDone);
        done.add('human');
        const allDone = prev.players.every(p => done.has(p.id));
        if (allDone) {
          return { ...prev, initialPlacementDone: done, phase: 'playing', drewFromBoneyard: false, message: 'All trains started! Your turn.' };
        }
        return advanceTurn({ ...prev, initialPlacementDone: done, drewFromBoneyard: false }, false);
      }

      if (prev.bonusTilePending) {
        const nextState = { ...prev, bonusTilePending: false };
        if (allPlayersStuck(nextState.players, nextState.trains, nextState.mexicanTrain, nextState.boneyard, nextState.pendingDouble)) return endRound(nextState, null);
        return advanceTurn(nextState, true);
      }

      if (prev.pendingDouble && prev.pendingDouble.playedByPlayerId === 'human') {
        const newTrains = { ...prev.trains, human: { ...prev.trains['human'], hasMarker: true, isPublic: true } };
        const nextState = { ...prev, trains: newTrains };
        if (allPlayersStuck(nextState.players, newTrains, nextState.mexicanTrain, nextState.boneyard, nextState.pendingDouble)) return endRound(nextState, null);
        return advanceTurn(nextState, true);
      }

      if (prev.pendingDouble) {
        const newTrains = { ...prev.trains, human: { ...prev.trains['human'], hasMarker: true, isPublic: true } };
        const nextState = { ...prev, trains: newTrains };
        if (allPlayersStuck(nextState.players, newTrains, nextState.mexicanTrain, nextState.boneyard, nextState.pendingDouble)) return endRound(nextState, null);
        return advanceTurn(nextState, true);
      }

      const newTrains = { ...prev.trains, human: { ...prev.trains['human'], hasMarker: true, isPublic: true } };
      const nextState = { ...prev, trains: newTrains };
      if (allPlayersStuck(nextState.players, newTrains, nextState.mexicanTrain, nextState.boneyard, nextState.pendingDouble)) return endRound(nextState, null);
      return advanceTurn(nextState, true);
    });
    setSelectedDomino(null);
  }

  const human = gs?.players.find(p => !p.isBot);
  const handIds = human?.hand.map(d => d.id) ?? [];

  useEffect(() => {
    if (!human) return;
    setHandOrder(prev => {
      const existing = prev.filter(id => handIds.includes(id));
      const newIds = handIds.filter(id => !existing.includes(id));
      return [...existing, ...newIds];
    });
  }, [handIds.join(',')]);

  function handleDragStart(id: string) {
    setDragId(id);
  }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }
  function handleDrop(id: string) {
    if (!dragId || dragId === id) { setDragId(null); setDragOverId(null); return; }
    setHandOrder(prev => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(dragId);
      const toIdx = arr.indexOf(id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, dragId);
      return arr;
    });
    setDragId(null);
    setDragOverId(null);
  }
  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  if (!gs || !human) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-lg font-semibold" style={{ color: 'var(--color-heading)' }}>Setting up...</div>
      </div>
    );
  }

  const isHumanTurn = gs.players[gs.currentPlayerIndex].id === 'human';
  const isInitialPhase = gs.phase === 'initial-placement';
  const isPlaying = gs.phase === 'playing';

  const playableTrainIds = isHumanTurn && isPlaying
    ? gs.bonusTilePending
      ? getPlayableTrains('human', gs.trains, gs.mexicanTrain, null)
      : getPlayableTrains('human', gs.trains, gs.mexicanTrain, gs.pendingDouble)
    : [];

  const humanHasPlayableMove = playableTrainIds.some(tid => {
    const end = tid === 'mexican' ? gs.mexicanTrain.openEnd : gs.trains[tid]?.openEnd ?? -1;
    return getPlayableTiles(human.hand, end).length > 0;
  });

  const humanJustPlayedDouble = isHumanTurn && isPlaying && !!gs.pendingDouble && gs.pendingDouble.playedByPlayerId === 'human' && !gs.bonusTilePending;
  const canDraw = isHumanTurn && isPlaying && !gs.drewFromBoneyard && gs.boneyard.length > 0 && !humanHasPlayableMove && !gs.bonusTilePending;
  const canPass = isHumanTurn && isPlaying && (
    gs.bonusTilePending ||
    (humanJustPlayedDouble && !humanHasPlayableMove && (gs.drewFromBoneyard || gs.boneyard.length === 0)) ||
    (!gs.pendingDouble && gs.drewFromBoneyard && !humanHasPlayableMove) ||
    (!!gs.pendingDouble && !humanJustPlayedDouble && gs.drewFromBoneyard && !humanHasPlayableMove)
  );

  const initialCanPlay = isInitialPhase && isHumanTurn && !gs.initialPlacementDone.has('human');
  const humanInitialDrawDone = gs.initialDrawDone.has('human');
  const initialMatchingTiles = initialCanPlay ? human.hand.filter(d => canPlay(d, gs.engineValue)) : [];
  const initialPlayable = initialCanPlay
    ? (humanInitialDrawDone && initialMatchingTiles.length === 0 ? human.hand : initialMatchingTiles)
    : [];
  const canDrawInitial = initialCanPlay && initialMatchingTiles.length === 0 && !humanInitialDrawDone && !gs.drewFromBoneyard && gs.boneyard.length > 0;
  const canPassInitial = initialCanPlay && initialPlayable.length === 0 && (humanInitialDrawDone || gs.boneyard.length === 0);

  const sortedHand = handOrder
    .filter(id => handIds.includes(id))
    .map(id => human.hand.find(d => d.id === id)!)
    .concat(human.hand.filter(d => !handOrder.includes(d.id)));

  const playerRanking = [...gs.players].sort((a, b) => a.score - b.score);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: tableUrl ? `url(${tableUrl})` : undefined,
        backgroundColor: tableUrl ? undefined : 'var(--color-bg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <header className="flex items-center justify-between px-4 py-3 bg-black/30">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToMenu}
            className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-full transition duration-200 shadow-lg whitespace-nowrap"
          >
            ← Menu
          </button>
          <button
            onClick={() => { onClearSave?.(); setGs(initRound(0, gs.players.map(p => ({ ...p, score: 0, roundScore: 0 })))); }}
            className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition duration-200 shadow-lg"
            title="New Game"
          >
            <RotateCw size={16} />
          </button>
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(s => !s)}
              className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition duration-200 shadow-lg"
              title="Settings"
            >
              <Settings size={16} />
            </button>
            {showSettings && (
              <div className="absolute left-0 top-12 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-48 sm:w-56 z-30">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Table</p>
                <div className="grid grid-cols-3 gap-2">
                  {TABLES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { onTableChange(t.id); setShowSettings(false); }}
                      className={`h-10 rounded-lg border-2 transition-all ${currentTable === t.id ? 'border-blue-500 scale-105' : 'border-transparent hover:border-gray-300'}`}
                      style={{ backgroundImage: `url(${t.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      title={t.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg tracking-wide">Domino Trains</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white/90">
            Round {gs.round + 1}/{gs.maxRound + 1} · Engine {gs.engineValue}
          </span>
        </div>

        <button
          onClick={() => setShowHowToPlay(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition duration-200 flex items-center gap-1.5 text-sm"
        >
          <span className="hidden sm:inline">How to Play</span>
          <span className="sm:hidden">Rules</span>
          <Info size={14} />
        </button>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-2 sm:px-3 py-2 sm:py-4 flex flex-col gap-2 sm:gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {playerRanking.map(p => (
            <div
              key={p.id}
              className={[
                'rounded-xl border px-3 py-2 flex flex-col gap-0.5 transition-all',
                gs.players[gs.currentPlayerIndex].id === p.id ? 'border-yellow-400 bg-yellow-50 shadow-sm' : 'border-gray-200 bg-white/70',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold truncate" style={{ color: p.isBot ? '#475569' : 'var(--color-primary)' }}>
                  {p.name}
                </span>
                {gs.players[gs.currentPlayerIndex].id === p.id && (
                  <span className="text-[9px] font-black text-yellow-600 bg-yellow-100 px-1 rounded">GO</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{p.hand.length} tiles</span>
                <span className="text-sm font-black" style={{ color: 'var(--color-heading)' }}>{p.score}</span>
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(20,20,25,0.75)', backdropFilter: 'blur(8px)' }}
        >
          <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Trains</span>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Boneyard: {gs.boneyard.length}</span>
          </div>
          <div className="flex">
            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2 px-1.5 sm:px-3 py-2 sm:py-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <TrainEngineDisplay engineValue={gs.engineValue} />
            </div>
            <div className="flex-1 p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 min-w-0 overflow-x-auto">
              {gs.players.map(p => (
                <TrainDisplay
                  key={p.id}
                  train={gs.trains[p.id]}
                  label={`${p.name}'s Train`}
                  isCurrentPlayer={p.id === 'human'}
                  canPlayOn={isPlaying && isHumanTurn && playableTrainIds.includes(p.id)}
                  selectedDomino={selectedDomino}
                  onPlayHere={() => handlePlayOnTrain(p.id)}
                  tileOrientations={trainTileOrientations}
                  tilesLeft={p.hand.length}
                  pendingDoubleId={gs.pendingDouble?.trainId === p.id ? gs.pendingDouble.domino.id : null}
                  startOpenEnd={gs.engineValue}
                />
              ))}
              <TrainDisplay
                train={gs.mexicanTrain}
                label="Community Train"
                isMexican
                canPlayOn={isPlaying && isHumanTurn && playableTrainIds.includes('mexican')}
                selectedDomino={selectedDomino}
                onPlayHere={() => handlePlayOnTrain('mexican')}
                tileOrientations={trainTileOrientations}
                pendingDoubleId={gs.pendingDouble?.trainId === 'mexican' ? gs.pendingDouble.domino.id : null}
                startOpenEnd={gs.engineValue}
              />
            </div>
          </div>
        </div>

        {gs.pendingDouble && !gs.bonusTilePending && (
          <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-3 flex items-center gap-3">
            <DominoTile domino={gs.pendingDouble.domino} size="sm" rotation={0} pendingDouble />
            <div className="flex flex-col gap-0.5">
              <span className="text-yellow-700 text-sm font-black">Double must be satisfied!</span>
              <span className="text-yellow-600 text-xs">Play on the double-{gs.pendingDouble.domino.high} train to cover it.</span>
            </div>
          </div>
        )}
        {gs.bonusTilePending && isHumanTurn && (
          <div className="rounded-xl border-2 border-green-400 bg-green-50 p-3 flex items-center gap-3">
            <span className="text-2xl">+1</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-green-700 text-sm font-black">Bonus tile!</span>
              <span className="text-green-600 text-xs">You covered the double — play a bonus tile if you can, or pass.</span>
            </div>
          </div>
        )}

        <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(20,20,25,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="px-3 py-2 border-b flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your Hand ({human.hand.length} · {handScore(human.hand)} pts)
              </span>
              <span className="hidden sm:inline text-[10px] text-white/30">Use the arrows below each tile to rotate</span>
            </div>
            <div className="flex items-center gap-2">
              {(canDraw || canDrawInitial) && (
                <button
                  onClick={handleDrawFromBoneyard}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <RefreshCw size={12} />
                  Draw
                </button>
              )}
              {(canPass || canPassInitial) && (
                <button
                  onClick={handlePass}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90 active:scale-95 bg-gray-500"
                >
                  Pass
                </button>
              )}
              {!isHumanTurn && gs.phase === 'playing' && (
                <span className="text-xs font-semibold text-white/40">Waiting for {gs.players[gs.currentPlayerIndex].name}...</span>
              )}
              {initialCanPlay && initialPlayable.length > 0 && (
                <span className="text-xs font-semibold" style={{ color: 'var(--color-primary-text)' }}>
                  Select a tile to start your train
                </span>
              )}
              {initialCanPlay && initialPlayable.length === 0 && !gs.drewFromBoneyard && (
                <span className="text-xs font-semibold text-orange-600">
                  No matching tile — draw from boneyard
                </span>
              )}
            </div>
          </div>

          <div className="p-2 sm:p-4">
            {gs.phase === 'round-over' || gs.phase === 'game-over' ? (
              <div className="text-center py-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)' }}>{gs.message}</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-x-2 gap-y-2 sm:gap-x-4 sm:gap-y-3">
                {sortedHand.map(d => {
                  const isPlayableInitial = initialPlayable.some(p => p.id === d.id);
                  const isPlayableNow = isHumanTurn && isPlaying && playableTrainIds.some(tid => {
                    const end = tid === 'mexican' ? gs.mexicanTrain.openEnd : gs.trains[tid]?.openEnd ?? -1;
                    return canPlay(d, end);
                  });
                  const isSelected = selectedDomino?.id === d.id;
                  const isDragging = dragId === d.id;
                  const isDragOver = dragOverId === d.id;

                  const rotStep = tileOrientations[d.id] ?? 0;
                  const rotateCw = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTileOrientations(prev => ({ ...prev, [d.id]: ((prev[d.id] ?? 0) + 1) % 4 }));
                  };
                  const rotateCcw = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTileOrientations(prev => ({ ...prev, [d.id]: ((prev[d.id] ?? 0) + 3) % 4 }));
                  };

                  return (
                    <div
                      key={d.id}
                      className="flex flex-col items-center gap-1"
                      style={{
                        opacity: isDragging ? 0.35 : 1,
                        transform: isDragOver && !isDragging ? 'translateX(4px)' : undefined,
                        transition: 'opacity 0.15s, transform 0.15s',
                      }}
                    >
                      <div
                        className="relative group"
                        draggable
                        onDragStart={() => handleDragStart(d.id)}
                        onDragOver={e => handleDragOver(e, d.id)}
                        onDrop={() => handleDrop(d.id)}
                        onDragEnd={handleDragEnd}
                        onContextMenu={rotateCw}
                        style={{ cursor: 'grab' }}
                      >
                        <DominoTile
                          domino={d}
                          size="md"
                          rotation={rotStep}
                          selected={isSelected}
                          playable={isPlayableInitial || (isHumanTurn && isPlaying && isPlayableNow)}
                          dimmed={isHumanTurn && isPlaying && !isPlayableNow && !isSelected}
                          onClick={
                            isInitialPhase && isHumanTurn && !gs.initialPlacementDone.has('human')
                              ? isPlayableInitial ? () => handleInitialHumanPlacement(d) : undefined
                              : isHumanTurn && isPlaying
                                ? () => handleSelectDomino(d)
                                : undefined
                          }
                        />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onMouseDown={rotateCcw}
                          className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors shadow-sm"
                          title="Rotate counter-clockwise"
                        >
                          <RotateCcw size={9} className="text-white/70" />
                        </button>
                        <button
                          onMouseDown={rotateCw}
                          className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors shadow-sm"
                          title="Rotate clockwise"
                        >
                          <RotateCw size={9} className="text-white/70" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {human.hand.length === 0 && (
                  <p className="text-sm text-white/40 font-medium">No tiles remaining.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="rounded-xl px-4 py-2 text-sm font-medium text-center"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-text)' }}
        >
          {gs.message}
        </div>
      </main>

      {showRoundSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h2 className="text-xl font-black mb-1" style={{ color: 'var(--color-heading)' }}>
              {gs.phase === 'game-over' ? 'Game Over!' : `Round ${gs.round + 1} Over`}
            </h2>
            {gs.winner && (
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-primary-text)' }}>
                Winner: {gs.winner}
              </p>
            )}
            <div className="flex flex-col gap-2 mb-5">
              {roundSummaryData
                .slice()
                .sort((a, b) => a.totalScore - b.totalScore)
                .map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                      <span className="font-bold text-sm" style={{ color: 'var(--color-heading)' }}>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400">+{p.roundScore}</span>
                      <span className="font-black" style={{ color: 'var(--color-primary-text)' }}>{p.totalScore}</span>
                    </div>
                  </div>
                ))}
            </div>
            {gs.phase === 'game-over' ? (
              <button
                onClick={onBackToMenu}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Back to Menu
              </button>
            ) : (
              <button
                onClick={startNextRound}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Next Round (Engine {gs.engineValue - 1})
              </button>
            )}
          </div>
        </div>
      )}

      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black" style={{ color: 'var(--color-heading)' }}>How to Play</h2>
              <button onClick={() => setShowHowToPlay(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="flex flex-col gap-4 text-sm text-gray-600 leading-relaxed">
              <div>
                <p className="font-bold text-gray-800 mb-1">Objective</p>
                <p>Score the lowest total points across all 13 rounds. Each round uses a lower double as the engine.</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-1">Your Turn</p>
                <p>Select a tile from your hand, then click a train to play it. You can play on your personal train, the Community Train (shared), or any marked (open) train.</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-1">Doubles</p>
                <p>Playing a double requires the next player to satisfy it by playing on that same train. If no one can, they draw and mark their own train.</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-1">Markers</p>
                <p>If you can't play, draw one tile. If still unable, your train gets an OPEN marker — others can play on it until you play on it yourself.</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-1">Scoring</p>
                <p>At round end, count the pips on all remaining tiles in your hand. Lowest cumulative score after round 13 wins.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
