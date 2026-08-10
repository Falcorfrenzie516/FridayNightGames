import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { rollDice, calculatePoints, getScorableIndices, calculateSelectedPoints } from '../lib/diceGameLogic';
import { TABLES } from '../lib/tables';
import { Dices, Plus, RotateCcw, Lock, ChevronDown, ChevronLeft, ChevronRight, Settings, History, Bot } from 'lucide-react';

async function recordSoloResult(userId: string, result: 'win' | 'loss', score: number) {
  await supabase.from('player_records').insert({ user_id: userId, game_mode: 'solo', game_type: 'bones', result, score });
}

interface TurnHistory {
  turnNumber: number;
  trayDice: number[][];
  bustRoll: number[] | null;
  pointsScored: number;
  wasBanked: boolean;
  wasLost: boolean;
}

interface GameState {
  gameId: string | null;
  bankPoints: number;
  trayPoints: number;
  currentRoll: number[] | null;
  selectedDice: Set<number>;
  trayDice: number[][];
  trayCycles: number[][][];
  remainingDice: number;
  gameStatus: 'start' | 'rolling' | 'selecting' | 'decision' | 'lost' | 'over' | 'bones';
  message: string;
  isLoading: boolean;
  roundHistory: { roll: number[]; points: number }[];
  showHowToPlay: boolean;
  targetScore: number;
  showSettings: boolean;
  turnCount: number;
  isRolling: boolean;
  turnHistory: TurnHistory[];
  showTurnHistory: boolean;
  hasRolledThisTurn: boolean;
}

export interface BotConfig {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface BotPlayer {
  config: BotConfig;
  score: number;
  lastTurnPoints: number | null;
  won: boolean;
}

export interface BonesSavedState {
  gameState: Omit<GameState, 'selectedDice' | 'isLoading' | 'isRolling' | 'showHowToPlay' | 'showSettings' | 'showTurnHistory'> & { selectedDice: number[] };
  botPlayers: BotPlayer[];
  humanScore: number;
  humanWon: boolean;
  gameOver: boolean;
  overallWinner: string | null;
  bots: BotConfig[];
}

interface DiceGameProps {
  onBackToMenu?: () => void;
  userId?: string | null;
  tableUrl?: string;
  currentTable?: string;
  onTableChange?: (tableId: string) => void;
  bots?: BotConfig[];
  savedState?: BonesSavedState | null;
  onSave?: (state: BonesSavedState) => void;
  onClearSave?: () => void;
}

function simulateBotTurn(targetScore: number, bankPoints: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const bankThresholds = { easy: 350, medium: 600, hard: 900 };
  const threshold = bankThresholds[difficulty];
  let trayPoints = 0;
  let remaining = 5;

  while (true) {
    const roll = rollDice(remaining);
    const result = calculatePoints(roll);

    if (result.isBones) {
      return -1;
    }

    if (result.points === 0) {
      return 0;
    }

    const scorable = getScorableIndices(roll);
    const selected = roll.filter((_, i) => scorable.includes(i));
    const points = calculatePoints(selected).points;
    trayPoints += points;
    remaining -= selected.length;

    if (remaining === 0) {
      remaining = 5;
      continue;
    }

    const shouldBank =
      trayPoints >= threshold ||
      (bankPoints + trayPoints >= targetScore) ||
      (difficulty === 'easy' && Math.random() < 0.45) ||
      (difficulty === 'medium' && Math.random() < 0.25) ||
      (difficulty === 'hard' && Math.random() < 0.12);

    if (shouldBank) {
      return trayPoints;
    }
  }
}

export default function DiceGame({ onBackToMenu, userId, tableUrl, currentTable, onTableChange, bots = [], savedState, onSave, onClearSave }: DiceGameProps) {
  const [botPlayers, setBotPlayers] = useState<BotPlayer[]>(() =>
    savedState ? savedState.botPlayers : bots.map(b => ({ config: b, score: 0, lastTurnPoints: null, won: false }))
  );
  const [botThinking, setBotThinking] = useState(false);
  const [humanScore, setHumanScore] = useState(() => savedState?.humanScore ?? 0);
  const [humanWon, setHumanWon] = useState(() => savedState?.humanWon ?? false);
  const [gameOver, setGameOver] = useState(() => savedState?.gameOver ?? false);
  const [overallWinner, setOverallWinner] = useState<string | null>(() => savedState?.overallWinner ?? null);
  const botTurnRef = useRef(false);

  interface DiePos { x: number; y: number; rot: number; spinFrom: number; delay: number; }
  const [dicePositions, setDicePositions] = useState<DiePos[]>([]);
  const [landingKey, setLandingKey] = useState(0);

  function generateDicePositions(count: number): DiePos[] {
    const rows = count <= 3 ? 1 : 2;
    const cols = Math.ceil(count / rows);
    return Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const colCount = row === 0 ? cols : count - cols;
      const xStep = colCount > 1 ? 70 / (colCount - 1) : 0;
      const xBase = colCount > 1 ? 15 : 50;
      const xJitter = (Math.random() - 0.5) * Math.min(xStep * 0.3, 6);
      const yBase = rows === 1 ? 50 : (row === 0 ? 30 : 70);
      const yJitter = (Math.random() - 0.5) * 8;
      return {
        x: xBase + col * xStep + xJitter,
        y: yBase + yJitter,
        rot: (Math.random() - 0.5) * 22,
        spinFrom: (Math.random() - 0.5) * 360,
        delay: Math.random() * 0.18,
      };
    });
  }

  const [gameState, setGameState] = useState<GameState>(() => {
    if (savedState) {
      return {
        ...savedState.gameState,
        selectedDice: new Set(savedState.gameState.selectedDice),
        isLoading: false,
        isRolling: false,
        showHowToPlay: false,
        showSettings: false,
        showTurnHistory: false,
      };
    }
    return {
      gameId: null,
      bankPoints: 0,
      trayPoints: 0,
      currentRoll: null,
      selectedDice: new Set(),
      trayDice: [],
      trayCycles: [],
      remainingDice: 5,
      gameStatus: 'start',
      message: 'Ready to play!',
      isLoading: true,
      roundHistory: [],
      showHowToPlay: false,
      targetScore: 10000,
      showSettings: false,
      turnCount: 1,
      isRolling: false,
      turnHistory: [],
      showTurnHistory: false,
      hasRolledThisTurn: false,
    };
  });

  useEffect(() => {
    if (!savedState) initializeGame();
  }, []);

  useEffect(() => {
    if (!onSave || !userId) return;
    if (gameOver || gameState.gameStatus === 'over' || gameState.gameStatus === 'bones') return;
    if (gameState.gameStatus !== 'start') return;
    const snapshot: BonesSavedState = {
      gameState: { ...gameState, selectedDice: Array.from(gameState.selectedDice) },
      botPlayers,
      humanScore,
      humanWon,
      gameOver,
      overallWinner,
      bots,
    };
    onSave(snapshot);
  }, [gameState.gameStatus, gameState.bankPoints, gameState.turnCount]);

  async function initializeGame() {
    try {
      await supabase.auth.getUser();
      setGameState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error initializing:', error);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }

  function handleRoll() {
    const dicesToRoll = gameState.remainingDice;
    if (dicesToRoll <= 0) return;

    const isFullTrayCycle = dicesToRoll === 5 && gameState.trayDice.length > 0;
    setGameState(prev => ({
      ...prev,
      isRolling: true,
      hasRolledThisTurn: true,
      ...(isFullTrayCycle ? {
        trayDice: [],
        trayCycles: [...prev.trayCycles, prev.trayDice],
      } : {}),
    }));

    setTimeout(() => {
      const newRoll = rollDice(dicesToRoll);
      const result = calculatePoints(newRoll);

      setDicePositions(generateDicePositions(newRoll.length));
      setLandingKey(k => k + 1);

      if (result.isBones) {
        setGameState(prev => {
          if (userId) recordSoloResult(userId, 'win', prev.bankPoints + prev.trayPoints);
          onClearSave?.();
          const finalScore = prev.bankPoints + prev.trayPoints;
          setHumanScore(finalScore);
          setHumanWon(true);
          setGameOver(true);
          setOverallWinner('You');
          const newTurn: TurnHistory = {
            turnNumber: prev.turnCount,
            trayDice: [...prev.trayDice],
            bustRoll: null,
            pointsScored: prev.trayPoints,
            wasBanked: true,
            wasLost: false,
          };
          return {
            ...prev,
            gameStatus: 'over',
            message: 'BONES! Five of a kind — INSTANT WIN!',
            currentRoll: newRoll,
            selectedDice: new Set(),
            isRolling: false,
            turnHistory: [...prev.turnHistory, newTurn],
          };
        });
      } else if (result.points === 0) {
        setGameState(prev => {
          let updatedHistory = [...prev.turnHistory];

          {
            const lostTurn: TurnHistory = {
              turnNumber: prev.turnCount,
              trayDice: [...prev.trayDice],
              bustRoll: newRoll,
              pointsScored: 0,
              wasBanked: false,
              wasLost: true,
            };
            updatedHistory = [...prev.turnHistory, lostTurn];
          }

          return {
            ...prev,
            gameStatus: 'lost',
            message: 'You lost your tray. No points this round.',
            currentRoll: newRoll,
            selectedDice: new Set(),
            trayPoints: 0,
            trayDice: [],
            trayCycles: [],
            roundHistory: [...prev.roundHistory, { roll: newRoll, points: 0 }],
            isRolling: false,
            turnHistory: updatedHistory,
          };
        });
      } else {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'selecting',
          message: `You got some points on the table — what are you going to add to the tray?`,
          currentRoll: newRoll,
          selectedDice: new Set(),
          isRolling: false,
        }));
      }
    }, 500);
  }

  function toggleDieSelection(index: number) {
    if (gameState.gameStatus !== 'selecting') return;

    const newSelected = new Set(gameState.selectedDice);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setGameState(prev => ({ ...prev, selectedDice: newSelected }));
  }

  function handleAddToTray() {
    if (gameState.selectedDice.size === 0 || !gameState.currentRoll) return;

    const selectedIndices = Array.from(gameState.selectedDice);
    const pointsFromSelection = calculateSelectedPoints(gameState.currentRoll, selectedIndices);

    if (pointsFromSelection === 0) return;

    const selectedDiceValues = selectedIndices.map(i => gameState.currentRoll![i]);
    const newTrayDice = [...gameState.trayDice, selectedDiceValues];

    const totalDiceInTray = newTrayDice.flat().length;
    const newRemainingDice = 5 - totalDiceInTray;
    const newTrayPoints = gameState.trayPoints + pointsFromSelection;

    if (newRemainingDice === 0) {
      setGameState(prev => ({
        ...prev,
        trayDice: newTrayDice,
        trayCycles: prev.trayCycles,
        trayPoints: newTrayPoints,
        remainingDice: 5,
        currentRoll: null,
        selectedDice: new Set(),
        gameStatus: 'decision',
        message: `Tray full! ${newTrayPoints} pts. Bank now or roll all 5 again for more!`,
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        trayDice: newTrayDice,
        trayPoints: newTrayPoints,
        remainingDice: newRemainingDice,
        currentRoll: null,
        selectedDice: new Set(),
        gameStatus: 'decision',
        message: `${pointsFromSelection} points added. Total: ${newTrayPoints}. Bank or roll?`,
      }));
    }
  }

  function runBotTurns(currentHumanScore: number, targetScore: number) {
    if (bots.length === 0 || botTurnRef.current) return;
    botTurnRef.current = true;
    setBotThinking(true);

    let delay = 0;
    bots.forEach((bot, i) => {
      delay += 900;
      setTimeout(() => {
        setBotPlayers(prev => {
          const updated = [...prev];
          const botScore = updated[i].score;
          const result = simulateBotTurn(targetScore, botScore, bot.difficulty);
          let gained = 0;
          if (result === -1) {
            gained = 0;
          } else {
            gained = result;
          }
          const newScore = botScore + gained;
          const won = newScore >= targetScore;
          updated[i] = { ...updated[i], score: newScore, lastTurnPoints: result === 0 ? 0 : gained, won };

          if (won && !gameOver) {
            setGameOver(true);
            setOverallWinner(bot.name);
          }

          return updated;
        });

        if (i === bots.length - 1) {
          setBotThinking(false);
          botTurnRef.current = false;
          setGameState(prev => ({
            ...prev,
            gameStatus: gameOver ? prev.gameStatus : 'start',
            message: gameOver ? prev.message : "Your turn — roll the dice!",
            hasRolledThisTurn: false,
          }));
        }
      }, delay);
    });
  }

  function handleBank() {
    const bankedPoints = gameState.bankPoints + gameState.trayPoints;

    const newTurn: TurnHistory = {
      turnNumber: gameState.turnCount,
      trayDice: [...gameState.trayDice],
      bustRoll: null,
      pointsScored: gameState.trayPoints,
      wasBanked: true,
      wasLost: false,
    };

    if (bankedPoints >= gameState.targetScore) {
      if (userId) recordSoloResult(userId, 'win', bankedPoints);
      onClearSave?.();
      setHumanScore(bankedPoints);
      setHumanWon(true);
      setGameOver(true);
      setOverallWinner('You');
      setGameState(prev => ({
        ...prev,
        bankPoints: bankedPoints,
        trayPoints: 0,
        trayDice: [],
        trayCycles: [],
        remainingDice: 5,
        currentRoll: null,
        selectedDice: new Set(),
        gameStatus: 'over',
        message: `You Win! Final score: ${bankedPoints.toLocaleString()}`,
        roundHistory: [],
        turnHistory: [...prev.turnHistory, newTurn],
      }));
    } else {
      const newScore = bankedPoints;
      setHumanScore(newScore);
      setGameState(prev => ({
        ...prev,
        bankPoints: bankedPoints,
        trayPoints: 0,
        trayDice: [],
        trayCycles: [],
        remainingDice: 5,
        currentRoll: null,
        selectedDice: new Set(),
        gameStatus: bots.length > 0 ? 'rolling' : 'start',
        message: bots.length > 0 ? 'Points banked! Bots are taking their turns...' : 'Points banked! Play next turn.',
        roundHistory: [],
        turnCount: prev.turnCount + 1,
        turnHistory: [...prev.turnHistory, newTurn],
        hasRolledThisTurn: false,
      }));
      if (bots.length > 0) runBotTurns(newScore, gameState.targetScore);
    }
  }

  function handlePassTurn() {
    const targetScore = gameState.targetScore;
    setGameState(prev => {
      const shouldRecord = prev.trayPoints > 0 || prev.trayDice.length > 0;
      const newTurn: TurnHistory = {
        turnNumber: prev.turnCount,
        trayDice: [...prev.trayDice],
        bustRoll: null,
        pointsScored: prev.trayPoints,
        wasBanked: false,
        wasLost: false,
      };
      return {
        ...prev,
        trayPoints: 0,
        trayDice: [],
        trayCycles: [],
        remainingDice: 5,
        currentRoll: null,
        selectedDice: new Set(),
        gameStatus: bots.length > 0 ? 'rolling' : 'start',
        message: bots.length > 0 ? 'Bots are taking their turns...' : 'Turn passed. Play next turn!',
        roundHistory: [],
        turnCount: prev.turnCount + 1,
        turnHistory: shouldRecord ? [...prev.turnHistory, newTurn] : prev.turnHistory,
        hasRolledThisTurn: false,
      };
    });
    if (bots.length > 0) runBotTurns(humanScore, targetScore);
  }

  function handleNewGame() {
    onClearSave?.();
    setBotPlayers(bots.map(b => ({ config: b, score: 0, lastTurnPoints: null, won: false })));
    setBotThinking(false);
    setHumanScore(0);
    setHumanWon(false);
    setGameOver(false);
    setOverallWinner(null);
    botTurnRef.current = false;
    setGameState(prev => ({
      ...prev,
      bankPoints: 0,
      trayPoints: 0,
      currentRoll: null,
      selectedDice: new Set(),
      trayDice: [],
      trayCycles: [],
      remainingDice: 5,
      gameStatus: 'start',
      message: 'Ready to play!',
      roundHistory: [],
      showSettings: false,
      turnCount: 1,
      turnHistory: [],
    }));
  }

  function toggleSettings() {
    setGameState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  }

  function updateTargetScore(score: number) {
    setGameState(prev => ({ ...prev, targetScore: score }));
  }

  function handleTableNav(direction: 'prev' | 'next') {
    if (!onTableChange || !currentTable) return;
    const idx = TABLES.findIndex(t => t.id === currentTable);
    const nextIdx = direction === 'next'
      ? (idx + 1) % TABLES.length
      : (idx - 1 + TABLES.length) % TABLES.length;
    const nextTable = TABLES[nextIdx];
    onTableChange(nextTable.id);
    if (userId) {
      supabase.from('profiles').upsert({ id: userId, table_id: nextTable.id, updated_at: new Date().toISOString() });
    }
  }

  function handlePlayAgain() {
    setGameState(prev => ({
      ...prev,
      currentRoll: null,
      selectedDice: new Set(),
      trayDice: [],
      trayPoints: 0,
      remainingDice: 5,
      gameStatus: 'rolling',
      message: 'Roll the dice!',
      roundHistory: [],
    }));
  }

  function toggleHowToPlay() {
    setGameState(prev => ({ ...prev, showHowToPlay: !prev.showHowToPlay }));
  }

  function toggleTurnHistory() {
    setGameState(prev => ({ ...prev, showTurnHistory: !prev.showTurnHistory }));
  }

  if (gameState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-lg" style={{ color: 'var(--color-body)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
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
          {onBackToMenu && (
            <button
              onClick={onBackToMenu}
              className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-full transition duration-200 shadow-lg whitespace-nowrap"
            >
              ← Menu
            </button>
          )}
          <button
            onClick={gameState.gameStatus === 'lost' || gameState.gameStatus === 'bones' ? handlePlayAgain : handleNewGame}
            className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition duration-200 shadow-lg"
            title={gameState.gameStatus === 'lost' || gameState.gameStatus === 'bones' ? 'Play Again' : 'New Game'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleSettings}
            className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition duration-200 shadow-lg"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <h1 className="text-3xl sm:text-4xl" style={{ fontFamily: "'Bone', sans-serif", letterSpacing: '0.05em', color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>BONES</h1>

        <div className="relative">
          <button
            onClick={toggleHowToPlay}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition duration-200 flex items-center gap-1.5 text-sm"
          >
            <span className="hidden sm:inline">How to Play</span>
            <span className="sm:hidden">Rules</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${gameState.showHowToPlay ? 'rotate-180' : ''}`} />
          </button>
          {gameState.showHowToPlay && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[90vw] bg-white rounded-lg shadow-xl border-2 border-blue-200 p-4 z-10">
              <h3 className="font-bold text-gray-800 mb-2 text-lg">Bones Scoring:</h3>
              <p className="text-sm text-gray-600 mb-4 italic leading-relaxed">
                Risk your points or bank two-fitty! Roll a scoring set to keep going — but do you risk that 250 to roll again? Play it safe if you dare.
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between"><span className="font-semibold">Straight (1-2-3-4-5):</span><span>1500 pts</span></div>
                <div className="flex justify-between"><span className="font-semibold">Three 1s:</span><span>1000 pts</span></div>
                <div className="flex justify-between"><span className="font-semibold">Three 2s:</span><span>200 pts</span></div>
                <div className="flex justify-between"><span className="font-semibold">Three 3s:</span><span>300 pts</span></div>
                <div className="flex justify-between"><span className="font-semibold">Three 4s:</span><span>400 pts</span></div>
                <div className="flex justify-between"><span className="font-semibold">Three 5s:</span><span>500 pts</span></div>
                <div className="flex justify-between"><span className="font-semibold">Three 6s:</span><span>600 pts</span></div>
                <div className="flex justify-between"><span className="font-semibold">Single 1:</span><span>100 pts each</span></div>
                <div className="flex justify-between"><span className="font-semibold">Single 5:</span><span>50 pts each</span></div>
                <div className="flex justify-between"><span className="font-semibold">Four of a kind:</span><span>3× three of a kind</span></div>
                <div className="flex justify-between"><span className="font-semibold">Five of a kind:</span><span>4× three of a kind</span></div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Settings panel */}
      {gameState.showSettings && (
        <div className="absolute top-16 left-2 sm:left-4 rounded-xl shadow-2xl p-3 sm:p-4 z-30 w-64 sm:w-72 max-w-[92vw] bg-white border border-gray-200">
          <h3 className="font-bold mb-4 text-base text-gray-800">Game Settings</h3>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">Target Score</p>
          <div className="grid grid-cols-5 gap-1 mb-1">
            {[10000, 20000, 30000, 40000, 50000].map(score => (
              <button
                key={score}
                onClick={() => updateTargetScore(score)}
                disabled={gameState.gameStatus !== 'start'}
                className="py-1.5 px-1 rounded-lg text-xs font-semibold transition"
                style={gameState.targetScore === score ? { backgroundColor: 'var(--color-primary)', color: 'white' } : gameState.gameStatus !== 'start' ? { backgroundColor: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' } : { backgroundColor: '#f1f5f9', color: '#334155' }}
              >
                {(score / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
          {gameState.gameStatus !== 'start' && (
            <p className="text-xs mb-4 text-gray-400">Target score locked once game starts.</p>
          )}
          {gameState.gameStatus === 'start' && <div className="mb-4" />}
          {onTableChange && currentTable && (() => {
            const tableIdx = TABLES.findIndex(t => t.id === currentTable);
            const table = TABLES[tableIdx];
            const isLegendary = table?.tier === 'legendary';
            return (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Table</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTableNav('prev')} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 h-16 rounded-xl overflow-hidden relative border-2 transition" style={{ backgroundImage: `url(${table?.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: table?.previewColor, borderColor: isLegendary ? (table?.glowColor ?? '#f5d060') : '#e5e7eb', boxShadow: isLegendary ? `0 0 10px 2px ${table?.glowColor ?? '#f5d060'}40` : 'none' }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1">
                      {isLegendary && <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: table?.glowColor ?? '#f5d060', textShadow: `0 0 6px ${table?.glowColor ?? '#f5d060'}` }}>✦</span>}
                      <span className="text-white text-xs font-bold drop-shadow-lg">{table?.name}</span>
                    </div>
                    <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                      {TABLES.map((_, i) => <div key={i} className="w-1 h-1 rounded-full transition" style={{ backgroundColor: i === tableIdx ? 'white' : 'rgba(255,255,255,0.35)' }} />)}
                    </div>
                  </div>
                  <button onClick={() => handleTableNav('next')} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Player score pills */}
      <div className="flex items-center justify-center gap-2 px-2 sm:px-4 pt-3 sm:pt-4 pb-2 flex-wrap">
        <div className="flex items-center gap-2 bg-black/65 backdrop-blur-sm rounded-full px-3 py-1.5">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">Y</div>
          <span className="text-white font-semibold text-sm">You</span>
          <span className="text-white/70 text-sm">{humanScore.toLocaleString()} pts</span>
          <span className="text-white/50 text-xs">/ {gameState.targetScore.toLocaleString()}</span>
        </div>
        {botPlayers.map((bot, i) => (
          <div key={i} className={`flex items-center gap-2 bg-black/65 backdrop-blur-sm rounded-full px-3 py-1.5 ${botThinking ? 'ring-2 ring-amber-400' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${['bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500'][i % 4]}`}>
              B
            </div>
            <span className="text-white font-semibold text-sm">{bot.config.name}</span>
            <span className="text-white/70 text-sm">{bot.score.toLocaleString()} pts</span>
            {bot.lastTurnPoints !== null && !botThinking && (
              <span className={`text-xs font-semibold ${bot.lastTurnPoints === 0 ? 'text-red-400' : 'text-green-400'}`}>
                {bot.lastTurnPoints === 0 ? 'bust' : `+${bot.lastTurnPoints.toLocaleString()}`}
              </span>
            )}
            {botThinking && <span className="text-xs text-amber-300 animate-pulse">thinking...</span>}
          </div>
        ))}
      </div>

      {/* Status message */}
      <div className="px-2 sm:px-4 pb-2 sm:pb-3">
        <div className="max-w-lg mx-auto bg-black/65 backdrop-blur-sm rounded-full px-4 py-2 text-center">
          <p className="text-white/90 text-sm font-medium">{gameState.message}</p>
        </div>
      </div>

      {/* Game over banner */}
      {(gameState.gameStatus === 'over' || (gameOver && bots.length > 0)) && (
        <div className="px-4 pb-3">
          <div className={`max-w-lg mx-auto rounded-xl p-5 text-center border-4 ${
            gameState.message.includes('BONES')
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-300'
              : overallWinner === 'You' || bots.length === 0
              ? 'bg-gradient-to-br from-green-400 to-emerald-600 border-green-300'
              : 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-500'
          }`}>
            <p className="text-white font-black text-3xl tracking-wide drop-shadow-lg">
              {gameState.message.includes('BONES') ? 'BONES!' : overallWinner === 'You' || bots.length === 0 ? 'YOU WIN!' : `${overallWinner} WINS`}
            </p>
            {gameState.message.includes('BONES') && <p className="text-yellow-100 font-bold text-lg mt-1">Five of a kind — INSTANT WIN!</p>}
            {bots.length > 0 && overallWinner !== 'You' && <p className="text-white/80 text-sm mt-1">Better luck next time!</p>}
            <p className="text-white/90 font-semibold text-sm mt-2">Your Score: {gameState.bankPoints.toLocaleString()}</p>
            <button onClick={handleNewGame} className="mt-4 bg-white text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-100 transition">Play Again</button>
          </div>
        </div>
      )}

      {/* Score bar */}
      <div className="px-2 sm:px-4 pb-2 sm:pb-3">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-black/65 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-0.5">Banked</p>
            <p className="text-2xl font-black text-green-400">{gameState.bankPoints.toLocaleString()}</p>
          </div>
          <div className="bg-black/65 backdrop-blur-sm rounded-xl p-3 text-center relative">
            <span className="absolute top-2 right-2 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Turn {gameState.turnCount}</span>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-0.5">Tray</p>
            <p className="text-2xl font-black text-white">{gameState.trayPoints.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Dice rolling area */}
      <div className="flex-1 flex flex-col items-center px-2 sm:px-4 pb-3">
        <div className="w-full max-w-lg flex flex-col flex-1">
          {/* Dice scatter zone */}
          <div className="relative w-full flex-1" style={{ minHeight: 80 }}>
            {gameState.isRolling ? (
              Array.from({ length: gameState.remainingDice }).map((_, idx) => {
                const count = gameState.remainingDice;
                const spacingPct = Math.min(18, 80 / count);
                const totalPct = spacingPct * (count - 1);
                const leftPct = (100 - totalPct) / 2 + idx * spacingPct;
                return (
                  <div
                    key={idx}
                    className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/80 font-black text-2xl text-gray-400 flex items-center justify-center shadow-2xl dice-rolling"
                    style={{ left: `${leftPct}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    ?
                  </div>
                );
              })
            ) : gameState.currentRoll ? (
              gameState.currentRoll.map((value, idx) => {
                const pos = dicePositions[idx];
                const isSelected = gameState.selectedDice.has(idx);
                const txPct = pos ? `${Math.min(92, Math.max(8, pos.x))}%` : '50%';
                const tyPct = pos ? `${Math.min(88, Math.max(12, pos.y))}%` : '50%';
                const rot = isSelected ? 0 : (pos?.rot ?? 0);
                return (
                  <button
                    key={`${landingKey}-${idx}`}
                    onClick={() => toggleDieSelection(idx)}
                    className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-xl cursor-pointer flex items-center justify-center dice-land"
                    style={{
                      left: txPct,
                      top: tyPct,
                      transform: `translate(-50%, -50%) rotate(${rot}deg) ${isSelected ? 'scale(1.18)' : 'scale(1)'}`,
                      backgroundColor: isSelected ? '#1e293b' : 'white',
                      boxShadow: isSelected
                        ? '0 16px 32px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4)'
                        : '0 8px 20px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'background-color 0.15s, box-shadow 0.15s, transform 0.15s',
                      zIndex: isSelected ? 10 : 1,
                      ['--spin-from' as string]: `${pos?.spinFrom ?? 0}deg`,
                      ['--spin-to' as string]: `${rot}deg`,
                      animationDelay: `${pos?.delay ?? 0}s`,
                    }}
                  >
                    <span className="text-xl sm:text-2xl font-black select-none" style={{ color: isSelected ? 'white' : '#1e293b' }}>{value}</span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-sm" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/30 text-sm font-medium tracking-wide">Roll to throw the dice</p>
              </div>
            )}
          </div>

          {/* Tray */}
          <div className="bg-black/65 backdrop-blur-sm rounded-xl p-3 sm:p-4 mt-2">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              In Tray ({gameState.trayCycles.reduce((acc, c) => acc + c.flat().length, 0) + gameState.trayDice.flat().length}/5)
            </p>
            <div className="min-h-[56px] flex items-center">
              {gameState.trayCycles.length > 0 || gameState.trayDice.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {gameState.trayCycles.map((cycle, cycleIdx) => (
                    <>
                      {cycle.map((group, groupIdx) => (
                        <>
                          {group.map((die, dieIdx) => (
                            <div key={`c${cycleIdx}-g${groupIdx}-d${dieIdx}`} className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-md">
                              <span className="text-lg font-black text-slate-800 select-none">{die}</span>
                            </div>
                          ))}
                          {groupIdx < cycle.length - 1 && <div className="w-px h-11 bg-white/30 mx-1" />}
                        </>
                      ))}
                      <div className="w-px h-11 mx-2" style={{ borderLeft: '2px dashed rgba(255,255,255,0.3)' }} />
                    </>
                  ))}
                  {gameState.trayDice.slice().reverse().map((group, groupIdx) => (
                    <>
                      {group.map((die, dieIdx) => (
                        <div key={`cur-g${gameState.trayDice.length - 1 - groupIdx}-d${dieIdx}`} className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-md">
                          <span className="text-lg font-black text-slate-800 select-none">{die}</span>
                        </div>
                      ))}
                      {groupIdx < gameState.trayDice.length - 1 && <div className="w-px h-11 bg-white/30 mx-1" />}
                    </>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm italic">No dice in tray</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              onClick={handleRoll}
              disabled={botThinking || gameOver || (gameState.gameStatus !== 'rolling' && gameState.gameStatus !== 'decision' && gameState.gameStatus !== 'start')}
              className="py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={!botThinking && !gameOver && (gameState.gameStatus === 'rolling' || gameState.gameStatus === 'decision' || gameState.gameStatus === 'start') ? { backgroundColor: 'var(--color-primary)', color: 'white' } : { backgroundColor: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed' }}
            >
              <Dices className="w-4 h-4" />
              {gameState.gameStatus === 'decision' ? 'Risk & Roll' : `Roll (${gameState.remainingDice})`}
            </button>
            <button
              onClick={handleAddToTray}
              disabled={gameState.gameStatus !== 'selecting' || gameState.selectedDice.size === 0 || (gameState.currentRoll !== null && calculateSelectedPoints(gameState.currentRoll, Array.from(gameState.selectedDice)) === 0)}
              className="py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={gameState.gameStatus === 'selecting' && gameState.selectedDice.size > 0 && gameState.currentRoll !== null && calculateSelectedPoints(gameState.currentRoll, Array.from(gameState.selectedDice)) > 0 ? { backgroundColor: '#22c55e', color: 'white' } : { backgroundColor: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed' }}
            >
              <Plus className="w-4 h-4" />
              + Add to Tray
            </button>
            <button
              onClick={handleBank}
              disabled={gameState.gameStatus !== 'decision' || gameState.trayPoints === 0}
              className="py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={gameState.gameStatus === 'decision' && gameState.trayPoints > 0 ? { backgroundColor: '#22c55e', color: 'white' } : { backgroundColor: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed' }}
            >
              <Lock className="w-4 h-4" />
              Bank Points
            </button>
            <button
              onClick={() => {
                if (gameState.gameStatus !== 'lost') {
                  setGameState(prev => ({ ...prev, message: 'You must roll — then bank or bust before passing!' }));
                  return;
                }
                handlePassTurn();
              }}
              disabled={gameState.gameStatus === 'over'}
              className="py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={gameState.gameStatus === 'lost' ? { backgroundColor: '#f59e0b', color: 'white' } : { backgroundColor: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed' }}
            >
              Pass Turn
            </button>
          </div>

          {/* Turn history */}
          {gameState.turnHistory.length > 0 && (
            <div className="mt-3">
              <button
                onClick={toggleTurnHistory}
                className="w-full font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-between bg-black/60 backdrop-blur-sm text-white/80 hover:bg-black/70"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Turn History ({gameState.turnHistory.length})
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${gameState.showTurnHistory ? 'rotate-180' : ''}`} />
              </button>
              {gameState.showTurnHistory && (
                <div className="mt-2 max-h-80 overflow-y-auto rounded-xl p-3 space-y-2 bg-black/60 backdrop-blur-sm">
                  {gameState.turnHistory.slice().reverse().map((turn, idx) => (
                    <div key={gameState.turnHistory.length - 1 - idx} className={`p-3 rounded-lg border ${turn.wasLost ? 'border-red-500/50 bg-red-900/30' : turn.wasBanked ? 'border-green-500/50 bg-green-900/30' : 'border-white/10 bg-white/5'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white/80 text-sm">Turn {turn.turnNumber}</span>
                        <span className={`font-bold text-sm ${turn.wasLost ? 'text-red-400' : 'text-green-400'}`}>{turn.wasLost ? 'LOST' : `+${turn.pointsScored}`}</span>
                      </div>
                      {turn.trayDice.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {turn.trayDice.map((group, groupIdx) => (
                            <>
                              {group.map((die, dieIdx) => (
                                <div key={`${groupIdx}-${dieIdx}`} className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-md ${turn.wasLost ? 'bg-red-600' : 'bg-green-600'}`}>
                                  <span className="text-sm font-black text-white select-none">{die}</span>
                                </div>
                              ))}
                              {groupIdx < turn.trayDice.length - 1 && <div className="w-px h-9 bg-white/20 mx-0.5" />}
                            </>
                          ))}
                        </div>
                      )}
                      {turn.wasLost && turn.bustRoll && (
                        <div className="mt-1.5">
                          {turn.trayDice.length > 0 && <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide mb-1">Bust roll</p>}
                          <div className="flex items-center gap-1 flex-wrap">
                            {turn.bustRoll.map((die, dieIdx) => (
                              <div key={dieIdx} className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center shadow-md opacity-60">
                                <span className="text-sm font-black text-white select-none">{die}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {turn.wasLost && turn.trayDice.length === 0 && !turn.bustRoll && <p className="text-xs text-red-400 italic">Lost all points</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
