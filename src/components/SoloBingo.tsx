import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BingoBoard,
  WIN_CATEGORIES,
  WinCondition,
  WinCategory,
  generateBoards,
  checkBoardForWin,
  createFlipDeck,
  getRandomWinCondition,
} from '../lib/bingoLogic';
import { Card } from '../lib/bingoLogic';
import BingoBoardDisplay, { WinPatternPreview } from './BingoBoardDisplay';
import CardBack from './CardBack';
import DeckColorPicker from './DeckColorPicker';
import DaubColorPicker from './DaubColorPicker';
import { Play, Settings, ChevronDown, Trophy, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface BingoSavedState {
  phase: GamePhase;
  numBoards: number;
  selectedCategoryId: string;
  winConditionId: string;
  boards: BingoBoard[];
  daubs: Record<number, number[]>;
  flippedCards: Card[];
  currentCard: Card | null;
  winningBoards: number[];
  bingoCount: number;
  roundNumber: number;
  autoFlip: boolean;
  remainingDeck: Card[];
}

interface SoloBingoProps {
  onBackToMenu: () => void;
  userId?: string | null;
  tableUrl: string;
  deckColor?: string;
  currentDeckColor?: string;
  onDeckColorChange?: (colorId: string) => void;
  daubColor?: string;
  daubGhostColor?: string;
  currentDaubColor?: string;
  onDaubColorChange?: (colorId: string) => void;
  savedState?: BingoSavedState | null;
  onSave?: (s: BingoSavedState) => void;
  onClearSave?: () => void;
}

type GamePhase = 'setup' | 'playing' | 'between_rounds';

export default function SoloBingo({ onBackToMenu, userId, tableUrl, deckColor = '#1a3bbf', currentDeckColor = 'blue', onDeckColorChange, daubColor = '#1e40af', daubGhostColor = 'rgba(30,64,175,0.18)', currentDaubColor = 'blue', onDaubColorChange, savedState, onSave, onClearSave }: SoloBingoProps) {
  const [phase, setPhase] = useState<GamePhase>(() => savedState?.phase ?? 'setup');
  const [numBoards, setNumBoards] = useState(() => savedState?.numBoards ?? 1);
  const [selectedCategory, setSelectedCategory] = useState<WinCategory>(() =>
    savedState ? (WIN_CATEGORIES.find(c => c.id === savedState.selectedCategoryId) ?? WIN_CATEGORIES[0]) : WIN_CATEGORIES[0]
  );
  const [winCondition, setWinCondition] = useState<WinCondition>(() => {
    if (!savedState) return WIN_CATEGORIES[0].conditions[0];
    const cat = WIN_CATEGORIES.find(c => c.id === savedState.selectedCategoryId) ?? WIN_CATEGORIES[0];
    return cat.conditions.find(c => c.id === savedState.winConditionId) ?? cat.conditions[0];
  });
  const [boards, setBoards] = useState<BingoBoard[]>(() => savedState?.boards ?? []);
  const [daubs, setDaubs] = useState<Record<number, number[]>>(() => savedState?.daubs ?? {});
  const [_flipDeck, setFlipDeck] = useState<Card[]>(() => savedState?.remainingDeck ?? []);
  const flipDeckRef = useRef<Card[]>(savedState?.remainingDeck ?? []);
  const [flippedCards, setFlippedCards] = useState<Card[]>(() => savedState?.flippedCards ?? []);
  const [currentCard, setCurrentCard] = useState<Card | null>(() => savedState?.currentCard ?? null);
  const [winningBoards, setWinningBoards] = useState<number[]>(() => savedState?.winningBoards ?? []);
  const [bingoCount, setBingoCount] = useState(() => savedState?.bingoCount ?? 0);
  const [roundNumber, setRoundNumber] = useState(() => savedState?.roundNumber ?? 1);
  const [autoFlip, setAutoFlip] = useState(() => savedState?.autoFlip ?? true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onSave || !userId || phase === 'setup') return;
    onSave({
      phase,
      numBoards,
      selectedCategoryId: selectedCategory.id,
      winConditionId: winCondition.id,
      boards,
      daubs,
      flippedCards,
      currentCard,
      winningBoards,
      bingoCount,
      roundNumber,
      autoFlip,
      remainingDeck: flipDeckRef.current,
    });
  }, [flippedCards.length, daubs, phase, bingoCount]);

  const flipNext = useCallback(() => {
    const deck = flipDeckRef.current;
    if (deck.length === 0) return;
    const [card, ...rest] = deck;
    flipDeckRef.current = rest;
    setFlipDeck(rest);
    setCurrentCard(card);
    setFlippedCards(f => [...f, card]);
  }, []);

  useEffect(() => {
    if (phase === 'playing' && autoFlip) {
      intervalRef.current = setInterval(flipNext, 7000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, autoFlip, flipNext]);

  useEffect(() => {
    if (phase !== 'playing' || winningBoards.length > 0) return;
    const winners: number[] = [];
    boards.forEach((_, bi) => {
      const bd = daubs[bi] ?? [];
      if (checkBoardForWin(bd, winCondition)) {
        winners.push(bi);
      }
    });
    if (winners.length > 0) {
      setWinningBoards(winners);
      setBingoCount(c => c + 1);
      setPhase('between_rounds');
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (userId) {
        supabase.from('player_records').insert({
          user_id: userId,
          game_mode: 'solo',
          game_type: 'card-bingo',
          result: 'win',
          score: flippedCards.length,
        });
      }
    }
  }, [daubs, boards, winCondition, phase, winningBoards.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  function handleStartGame() {
    const newBoards = generateBoards(numBoards);
    const newDeck = createFlipDeck();
    const randomWin = getRandomWinCondition(selectedCategory.id);
    setBoards(newBoards);
    flipDeckRef.current = newDeck;
    setFlipDeck(newDeck);
    setFlippedCards([]);
    setCurrentCard(null);
    setDaubs({});
    setWinningBoards([]);
    setBingoCount(0);
    setRoundNumber(1);
    setWinCondition(randomWin);
    setPhase('playing');
    setAutoFlip(true);
  }

  function handleNextRound() {
    const newBoards = generateBoards(numBoards);
    const newDeck = createFlipDeck();
    const randomWin = getRandomWinCondition(selectedCategory.id);
    setBoards(newBoards);
    flipDeckRef.current = newDeck;
    setFlipDeck(newDeck);
    setFlippedCards([]);
    setCurrentCard(null);
    setDaubs({});
    setWinningBoards([]);
    setWinCondition(randomWin);
    setRoundNumber(r => r + 1);
    setPhase('playing');
    setShowSettings(false);
  }

  function handleResetGame() {
    onClearSave?.();
    setPhase('setup');
    setBoards([]);
    setFlippedCards([]);
    setCurrentCard(null);
    setDaubs({});
    setWinningBoards([]);
    setBingoCount(0);
    setRoundNumber(1);
    setShowSettings(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function handleDaub(boardIndex: number, cellIndex: number) {
    setDaubs(prev => {
      const bd = prev[boardIndex] ?? [];
      if (bd.includes(cellIndex)) return prev;
      return { ...prev, [boardIndex]: [...bd, cellIndex] };
    });
  }

  function handleManualFlip() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    flipNext();
    if (autoFlip) {
      intervalRef.current = setInterval(flipNext, 7000);
    }
  }

  const showSettingsForPhase = phase === 'setup' || phase === 'between_rounds';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${tableUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToMenu}
              className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-full transition duration-200 shadow-lg whitespace-nowrap"
            >
              ← Menu
            </button>
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(s => !s)}
                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition duration-200 shadow-lg"
              >
                <Settings size={16} />
              </button>
              {showSettings && (
                <div
                  className="absolute left-0 mt-2 rounded-2xl shadow-2xl p-4 sm:p-5 z-50 w-72 sm:w-80 max-w-[92vw]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.98)', border: '1px solid #e5e7eb' }}
                >
                  <h3 className="font-black text-gray-900 text-base mb-4">Settings</h3>

                  {showSettingsForPhase && (
                    <>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Number of Boards</p>
                      <div className="grid grid-cols-4 gap-1.5 mb-5">
                        {[1, 2, 3, 4].map(n => (
                          <button
                            key={n}
                            onClick={() => setNumBoards(n)}
                            className="py-2 rounded-xl font-black text-sm transition"
                            style={numBoards === n
                              ? { backgroundColor: '#1d4ed8', color: 'white' }
                              : { backgroundColor: '#eff6ff', color: '#1e3a8a' }
                            }
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Win Pattern Category</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {WIN_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className="py-2 rounded-xl font-bold text-xs transition"
                        style={selectedCategory.id === cat.id
                          ? { backgroundColor: '#1d4ed8', color: 'white' }
                          : { backgroundColor: '#eff6ff', color: '#1e3a8a' }
                        }
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  {phase === 'setup' && (
                    <p className="text-xs text-gray-400 mb-4">Win pattern is randomly picked when game starts.</p>
                  )}

                  {phase !== 'setup' && (
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auto-flip</p>
                      <button
                        onClick={() => setAutoFlip(a => !a)}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition ${autoFlip ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        Auto-flip: {autoFlip ? 'On (every 7s)' : 'Off'}
                      </button>
                    </div>
                  )}

                  {onDeckColorChange && (
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <DeckColorPicker selectedColor={currentDeckColor} onChange={onDeckColorChange} />
                    </div>
                  )}

                  {onDaubColorChange && (
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <DaubColorPicker selectedColor={currentDaubColor} onChange={onDaubColorChange} />
                    </div>
                  )}
                </div>
              )}
            </div>
            {phase === 'playing' && (
              <button
                onClick={handleResetGame}
                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition duration-200 shadow-lg"
                title="Reset Game"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <h1 className="text-white font-black text-xl tracking-tight">Card Bingo</h1>
            {bingoCount > 0 && (
              <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/40 rounded-full px-2.5 py-0.5">
                <Trophy size={11} className="text-amber-300" />
                <span className="text-amber-300 text-[11px] font-bold">{bingoCount} bingo{bingoCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowHowToPlay(v => !v)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition duration-200 flex items-center gap-1.5 text-sm"
            >
              <span className="hidden sm:inline">How to Play</span>
              <span className="sm:hidden">Rules</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showHowToPlay ? 'rotate-180' : ''}`} />
            </button>
            {showHowToPlay && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[92vw] bg-white rounded-lg shadow-xl border-2 border-blue-200 p-4 z-50">
                <h3 className="font-bold text-gray-800 mb-2">How to Play Card Bingo</h3>
                <ul className="text-sm text-gray-600 space-y-1.5">
                  <li><strong>Goal:</strong> Daub cards on your board to complete the win pattern.</li>
                  <li><strong>Cards:</strong> Flipped from a standard 52-card deck (4 suits).</li>
                  <li><strong>Flipping:</strong> Click Flip manually or use auto-flip every 7 seconds.</li>
                  <li><strong>Rounds:</strong> Hit bingo to end the round — play as many rounds as you like!</li>
                </ul>
              </div>
            )}
          </div>
        </header>

        {phase === 'setup' && (
          <SetupScreen
            numBoards={numBoards}
            setNumBoards={setNumBoards}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onStart={handleStartGame}
          />
        )}

        {phase === 'between_rounds' && (
          <BetweenRoundsScreen
            bingoCount={bingoCount}
            roundNumber={roundNumber}
            winCondition={winCondition}
            winningBoards={winningBoards}
            numBoards={numBoards}
            setNumBoards={setNumBoards}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onNextRound={handleNextRound}
            onReset={handleResetGame}
          />
        )}

        {phase === 'playing' && (
          <PlayScreen
            boards={boards}
            daubs={daubs}
            flippedCards={flippedCards}
            currentCard={currentCard}
            winCondition={winCondition}
            winningBoards={winningBoards}
            autoFlip={autoFlip}
            onDaub={handleDaub}
            onManualFlip={handleManualFlip}
            deckColor={deckColor}
            daubColor={daubColor}
            daubGhostColor={daubGhostColor}
          />
        )}
      </div>
    </div>
  );
}

interface SetupScreenProps {
  numBoards: number;
  setNumBoards: (n: number) => void;
  selectedCategory: WinCategory;
  setSelectedCategory: (c: WinCategory) => void;
  onStart: () => void;
}

function SetupScreen({ numBoards, setNumBoards, selectedCategory, setSelectedCategory, onStart }: SetupScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl p-5 sm:p-8 shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.97)' }}>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Solo Bingo</h2>
        <p className="text-sm text-gray-500 mb-7">Set up your boards and win pattern, then let the dealer flip!</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Number of Boards</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setNumBoards(n)}
                  className="py-3 rounded-xl font-black text-lg transition"
                  style={numBoards === n
                    ? { backgroundColor: '#1d4ed8', color: 'white' }
                    : { backgroundColor: '#eff6ff', color: '#1e3a8a' }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Win Pattern Category</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {WIN_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className="py-3 rounded-xl font-bold text-sm transition"
                  style={selectedCategory.id === cat.id
                    ? { backgroundColor: '#1d4ed8', color: 'white' }
                    : { backgroundColor: '#eff6ff', color: '#1e3a8a' }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Win patterns available:</p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {selectedCategory.conditions.filter((cond, idx, arr) => arr.findIndex(c => c.name === cond.name) === idx).map(cond => (
                  <div key={cond.id} className="flex items-center gap-2 rounded-lg p-2 bg-gray-50 border border-gray-100">
                    <WinPatternPreview condition={cond} size="sm" />
                    <span className="text-xs font-semibold text-gray-600 leading-tight">{cond.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Win pattern is randomly selected when game starts</p>
            </div>
          </div>

          <button
            onClick={onStart}
            className="w-full py-4 rounded-xl font-black text-lg text-white flex items-center justify-center gap-2 shadow-lg transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#1d4ed8' }}
          >
            <Play size={20} />
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

interface BetweenRoundsScreenProps {
  bingoCount: number;
  roundNumber: number;
  winCondition: WinCondition;
  winningBoards: number[];
  numBoards: number;
  setNumBoards: (n: number) => void;
  selectedCategory: WinCategory;
  setSelectedCategory: (c: WinCategory) => void;
  onNextRound: () => void;
  onReset: () => void;
}

function BetweenRoundsScreen({
  bingoCount, roundNumber, winCondition, winningBoards,
  numBoards, setNumBoards, selectedCategory, setSelectedCategory,
  onNextRound, onReset,
}: BetweenRoundsScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl p-5 sm:p-8 shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.97)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                <Trophy size={16} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">BINGO!</h2>
            </div>
            <p className="text-sm text-gray-500">
              Round {roundNumber} complete — Board{winningBoards.length > 1 ? 's' : ''} {winningBoards.map(b => b + 1).join(' & ')} hit <strong>{winCondition.name}</strong>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-blue-700">{bingoCount}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">bingo{bingoCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Boards Next Round</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setNumBoards(n)}
                  className="py-2.5 rounded-xl font-black text-base transition"
                  style={numBoards === n
                    ? { backgroundColor: '#1d4ed8', color: 'white' }
                    : { backgroundColor: '#eff6ff', color: '#1e3a8a' }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Win Pattern Category</label>
            <div className="grid grid-cols-2 gap-2">
              {WIN_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className="py-2.5 rounded-xl font-bold text-sm transition"
                  style={selectedCategory.id === cat.id
                    ? { backgroundColor: '#1d4ed8', color: 'white' }
                    : { backgroundColor: '#eff6ff', color: '#1e3a8a' }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Win pattern is randomly picked for each round</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onReset}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2 transition"
            >
              <RotateCcw size={15} />
              Reset
            </button>
            <button
              onClick={onNextRound}
              className="flex-2 flex-grow py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 shadow-lg transition hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#1d4ed8' }}
            >
              <Play size={16} />
              Next Round
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PlayScreenProps {
  boards: BingoBoard[];
  daubs: Record<number, number[]>;
  flippedCards: Card[];
  currentCard: Card | null;
  winCondition: WinCondition;
  winningBoards: number[];
  autoFlip: boolean;
  onDaub: (boardIndex: number, cellIndex: number) => void;
  onManualFlip: () => void;
  deckColor?: string;
  daubColor?: string;
  daubGhostColor?: string;
}

const SUIT_COLUMNS: Array<{
  suit: Card['suit'];
  label: string;
  symbol: string;
  bg: string;
  ballBg: string;
  ballText: string;
}> = [
  { suit: 'spades',   label: '♠', symbol: '♠', bg: '#1d4ed8', ballBg: '#1d4ed8', ballText: '#fff' },
  { suit: 'hearts',   label: '♥', symbol: '♥', bg: '#dc2626', ballBg: '#dc2626', ballText: '#fff' },
  { suit: 'diamonds', label: '♦', symbol: '♦', bg: '#d97706', ballBg: '#d97706', ballText: '#fff' },
  { suit: 'clubs',    label: '♣', symbol: '♣', bg: '#16a34a', ballBg: '#16a34a', ballText: '#fff' },
];

const ALL_RANKS: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function BingoFaceCard({ card, width = 64, height = 96 }: { card: Card; width?: number; height?: number }) {
  const col = SUIT_COLUMNS.find(c => c.suit === card.suit)!;
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isRed ? '#dc2626' : '#1e293b';
  return (
    <div
      className="rounded-xl border-2 border-gray-200 bg-white flex flex-col items-start justify-between p-1.5 select-none relative shadow-lg"
      style={{ width, height, animation: 'cardFlipIn 0.3s ease-out' }}
    >
      <div style={{ color, lineHeight: 1 }}>
        <div className="text-base font-black leading-none">{card.rank}</div>
        <div className="text-sm">{col.symbol}</div>
      </div>
      <div style={{ color }} className="self-end rotate-180 leading-none">
        <div className="text-base font-black leading-none">{card.rank}</div>
        <div className="text-sm">{col.symbol}</div>
      </div>
    </div>
  );
}

function StockDiscard({ flippedCards, currentCard, onManualFlip, disabled, deckColor = '#1a3bbf' }: {
  flippedCards: Card[];
  currentCard: Card | null;
  onManualFlip: () => void;
  disabled: boolean;
  deckColor?: string;
}) {
  const remaining = 52 - flippedCards.length;
  return (
    <div className="rounded-2xl shadow-xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: 'rgba(20,20,25,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-end gap-4 mb-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Stock</span>
            <button
              onClick={onManualFlip}
              disabled={disabled}
              className="relative transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Flip next card"
            >
              <CardBack width={72} height={100} color={deckColor} />
              {remaining > 0 && (
                <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center">
                  <span className="text-xs font-black text-white/90 tabular-nums">{remaining}</span>
                </div>
              )}
              {!disabled && (
                <div className="absolute inset-0 rounded-xl ring-2 ring-white/20 hover:ring-white/50 transition-all" />
              )}
            </button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Discard</span>
            {currentCard ? (
              <BingoFaceCard key={`${currentCard.rank}|${currentCard.suit}`} card={currentCard} width={72} height={100} />
            ) : (
              <div
                className="rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center"
                style={{ width: 72, height: 100 }}
              >
                <span className="text-[10px] text-white/30 font-bold">--</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-center text-[10px] text-white/40 font-medium border-t border-white/10 pt-1.5">
          {flippedCards.length} / 52 called
        </div>
      </div>
    </div>
  );
}

function CallHistoryGrid({ flippedCards }: { flippedCards: Card[] }) {
  const calledSet = new Set(flippedCards.map(c => `${c.rank}|${c.suit}`));
  return (
    <div className="rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col" style={{ backgroundColor: 'rgba(20,20,25,0.75)', backdropFilter: 'blur(8px)' }}>
      {SUIT_COLUMNS.map(col => (
        <div key={col.suit} className="flex flex-1">
          <div
            className="flex items-center justify-center font-black text-base flex-shrink-0"
            style={{ backgroundColor: col.bg, color: '#fff', width: 40 }}
          >
            {col.label}
          </div>
          <div className="flex flex-1">
            {ALL_RANKS.map(rank => {
              const called = calledSet.has(`${rank}|${col.suit}`);
              return (
                <div
                  key={rank}
                  className="flex-1 flex items-center justify-center"
                >
                  <div
                    className="flex items-center justify-center rounded-full transition-all duration-300"
                    style={{
                      width: 28,
                      height: 28,
                      background: called
                        ? `radial-gradient(circle at 35% 35%, ${col.ballBg}cc, ${col.ballBg}ff)`
                        : 'transparent',
                      border: called ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                      boxShadow: called ? `inset 0 1px 3px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)` : 'none',
                    }}
                  >
                    <span
                      className="font-black leading-none tabular-nums"
                      style={{
                        fontSize: rank === '10' ? '8px' : '10px',
                        color: called ? col.ballText : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {rank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayScreen({
  boards, daubs, flippedCards, currentCard, winCondition,
  winningBoards,
  onDaub, onManualFlip, deckColor = '#1a3bbf',
  daubColor = '#1e40af', daubGhostColor = 'rgba(30,64,175,0.18)',
}: PlayScreenProps) {
  const isDisabled = flippedCards.length >= 52;

  return (
    <div className="flex-1 flex flex-col gap-2 sm:gap-3 px-2 sm:px-4 md:px-6 pb-4 sm:pb-6">
      <div className="flex items-stretch gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
        <StockDiscard
          flippedCards={flippedCards}
          currentCard={currentCard}
          onManualFlip={onManualFlip}
          disabled={isDisabled}
          deckColor={deckColor}
        />
        <CallHistoryGrid flippedCards={flippedCards} />
        <div className="rounded-2xl shadow-xl flex-shrink-0 p-3 sm:p-4 flex flex-col justify-center gap-2" style={{ backgroundColor: 'rgba(20,20,25,0.75)', backdropFilter: 'blur(8px)', minWidth: 140, maxWidth: 200 }}>
          <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Win Condition</p>
          <div className="flex items-center gap-2 sm:gap-3">
            <WinPatternPreview condition={winCondition} size="md" />
            <div>
              <p className="font-bold text-white text-xs sm:text-sm leading-tight">{winCondition.name}</p>
              <p className="text-[10px] text-white/50 mt-0.5">Current pattern</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap justify-center gap-2 sm:gap-3`}>
        {boards.map((board, bi) => (
          <div
            key={bi}
            className="flex flex-col gap-1"
            style={{
              width: boards.length === 1 ? 'min(420px, 100%)' : boards.length === 2 ? 'calc(50% - 6px)' : 'calc(50% - 6px)',
              minWidth: boards.length >= 3 ? 'min(260px, 45vw)' : undefined,
            }}
          >
            <p className="text-white/70 text-xs font-bold uppercase tracking-wider text-center">Board {bi + 1}</p>
            <BingoBoardDisplay
              board={board}
              boardIndex={bi}
              daubs={daubs[bi] ?? []}
              flippedCards={flippedCards}
              winCondition={winCondition}
              onDaub={(cellIdx) => onDaub(bi, cellIdx)}
              isWinner={winningBoards.includes(bi)}
              compact={boards.length >= 3}
              daubColor={daubColor}
              daubGhostColor={daubGhostColor}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
