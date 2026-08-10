import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, RotateCcw, Settings, X, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Card, Meld, ROUNDS_313, Round313,
  isWildCard, suitSymbol, RANK_VALUES,
  createDeckFor313, dealHands, markWilds,
  isValidSet, isValidRun, calculateHandPenalty, canFullyMeld,
} from '../lib/cardGameLogic';
import CardView from './CardView313';
import CardBack from './CardBack';
import DeckColorPicker from './DeckColorPicker';
import { TABLES } from '../lib/tables';
import type { Bot313Config } from './CardGame313Setup';

type GamePhase = 'draw' | 'discard' | 'scoring' | 'round_end' | 'game_over';
type DrawSource = 'stock' | 'discard';
type DeckSize = 'regular' | 'large';

interface BotPlayer {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hand: Card[];
  totalScore: number;
  hasKnocked: boolean;
}

interface SoloGameState {
  round: Round313;
  stock: Card[];
  discardPile: Card[];
  playerHand: Card[];
  bots: BotPlayer[];
  phase: GamePhase;
  dealerIndex: number;
  currentActor: 'player' | number;
  knockerIndex: number | null;
  turnsAfterKnock: number;
  playerTotalScore: number;
  roundScores: Array<{ name: string; penalty: number; wentOut: boolean }>;
  allRoundScores: Array<Array<{ name: string; penalty: number; wentOut: boolean }>>;
  selectedCards: number[];
  melds: Meld[];
  drawnCard: Card | null;
  message: string;
}

export interface Game313SavedState {
  roundIndex: number;
  state: SoloGameState;
  allRoundScores: Array<Array<{ name: string; penalty: number; wentOut: boolean }>>;
  botConfigs: Bot313Config[];
}

interface CardGame313Props {
  onBackToMenu: () => void;
  userId: string | null;
  botConfigs: Bot313Config[];
  tableUrl: string;
  currentTable: string;
  onTableChange: (tableId: string) => void;
  deckSize: DeckSize;
  onDeckSizeChange: (size: DeckSize) => void;
  deckColor?: string;
  currentDeckColor?: string;
  onDeckColorChange?: (colorId: string) => void;
  savedState?: Game313SavedState | null;
  onSave?: (s: Game313SavedState) => void;
  onClearSave?: () => void;
}

const PLAYER_COLORS = ['bg-teal-500', 'bg-amber-500', 'bg-rose-500'];


function autoBotMelds(hand: Card[], wildRank: string): Meld[] {
  const melds: Meld[] = [];
  const used = new Set<number>();

  const ranks = new Map<string, number[]>();
  hand.forEach((c, i) => {
    if (!isWildCard(c, wildRank as Card['rank'])) {
      const arr = ranks.get(c.rank) ?? [];
      arr.push(i);
      ranks.set(c.rank, arr);
    }
  });

  for (const [, indices] of ranks) {
    if (indices.length >= 3) {
      const meldCards = indices.slice(0, indices.length).map(i => hand[i]);
      if (isValidSet(meldCards, wildRank as Card['rank'])) {
        indices.forEach(i => used.add(i));
        melds.push({ cards: meldCards, type: 'set' });
      }
    }
  }

  const suits = new Map<string, number[]>();
  hand.forEach((c, i) => {
    if (!used.has(i) && !isWildCard(c, wildRank as Card['rank'])) {
      const arr = suits.get(c.suit) ?? [];
      arr.push(i);
      suits.set(c.suit, arr);
    }
  });

  for (const [, indices] of suits) {
    if (indices.length >= 2) {
      const sorted = indices.sort((a, b) => RANK_VALUES[hand[a].rank] - RANK_VALUES[hand[b].rank]);
      let runStart = 0;
      while (runStart < sorted.length) {
        let runEnd = runStart + 1;
        while (
          runEnd < sorted.length &&
          RANK_VALUES[hand[sorted[runEnd]].rank] === RANK_VALUES[hand[sorted[runEnd - 1]].rank] + 1
        ) runEnd++;
        if (runEnd - runStart >= 3) {
          const meldCards = sorted.slice(runStart, runEnd).map(i => hand[i]);
          sorted.slice(runStart, runEnd).forEach(i => used.add(i));
          melds.push({ cards: meldCards, type: 'run' });
        }
        runStart = runEnd;
      }
    }
  }

  return melds;
}

function botShouldKnock(hand: Card[], wildRank: string, difficulty: 'easy' | 'medium' | 'hard'): boolean {
  const melds = autoBotMelds(hand, wildRank);
  const penalty = calculateHandPenalty(hand, melds, wildRank as Card['rank']);
  const threshold = difficulty === 'easy' ? 0 : difficulty === 'medium' ? 5 : 10;
  return penalty <= threshold;
}

function botChooseDiscard(hand: Card[], wildRank: string, difficulty: 'easy' | 'medium' | 'hard'): number {
  if (difficulty === 'easy') {
    const nonWild = hand.map((c, i) => ({ c, i })).filter(({ c }) => !c.isWild);
    if (nonWild.length === 0) return 0;
    const idx = Math.floor(Math.random() * nonWild.length);
    return nonWild[idx].i;
  }
  const melds = autoBotMelds(hand, wildRank);
  const usedKeys = new Set(melds.flatMap(m => m.cards.map(c => `${c.rank}_${c.suit}`)));
  const deadwood = hand.map((c, i) => ({ c, i })).filter(({ c }) => !usedKeys.has(`${c.rank}_${c.suit}`));
  if (deadwood.length === 0) return 0;
  deadwood.sort((a, b) => RANK_VALUES[b.c.rank] - RANK_VALUES[a.c.rank]);
  if (difficulty === 'medium' && Math.random() < 0.25 && deadwood.length > 1) {
    return deadwood[Math.floor(Math.random() * deadwood.length)].i;
  }
  return deadwood[0].i;
}

function initRound(
  roundIdx: number,
  botConfigs: Bot313Config[],
  playerTotalScore: number,
  botTotals: number[],
  dealerIndex: number,
): SoloGameState {
  const numBots = botConfigs.length;
  const round = ROUNDS_313[roundIdx];
  const numPlayers = 1 + numBots;
  const deck = createDeckFor313(numPlayers);
  const { hands, remaining } = dealHands(deck, numPlayers, round.cardsDealt);

  const topDiscard = remaining.pop()!;

  const firstToPlay = (dealerIndex + 1) % numPlayers;

  return {
    round,
    stock: remaining,
    discardPile: [topDiscard],
    playerHand: markWilds(hands[0], round.wildRank),
    bots: botConfigs.map((cfg, i) => ({
      name: cfg.name,
      difficulty: cfg.difficulty,
      hand: markWilds(hands[i + 1], round.wildRank),
      totalScore: botTotals[i] ?? 0,
      hasKnocked: false,
    })),
    phase: 'draw',
    dealerIndex,
    currentActor: firstToPlay === 0 ? 'player' : firstToPlay - 1,
    knockerIndex: null,
    turnsAfterKnock: 0,
    playerTotalScore,
    roundScores: [],
    allRoundScores: [],
    selectedCards: [],
    melds: [],
    drawnCard: null,
    message: `Round ${round.roundNumber} — ${round.wildRank}s are wild. Draw a card to begin.`,
  };
}

export default function CardGame313({ onBackToMenu, userId, botConfigs, tableUrl, currentTable, onTableChange, deckSize, onDeckSizeChange, deckColor = '#1a3bbf', currentDeckColor = 'blue', onDeckColorChange, savedState, onSave, onClearSave }: CardGame313Props) {
  const [roundIndex, setRoundIndex] = useState(() => savedState?.roundIndex ?? 0);
  const [state, setState] = useState<SoloGameState>(() =>
    savedState ? savedState.state : initRound(0, botConfigs, 0, Array(botConfigs.length).fill(0), 0)
  );
  const [allRoundScores, setAllRoundScores] = useState<Array<Array<{ name: string; penalty: number; wentOut: boolean }>>>(() => savedState?.allRoundScores ?? []);
  const [meldRowIndices, setMeldRowIndices] = useState<number[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Drag state stored in refs to avoid re-renders
  const dragSrcHandIdx = useRef<number | null>(null);
  const dragSrcZone = useRef<'hand' | 'meld' | null>(null);
  const dragOverMeldPos = useRef<number | null>(null);

  useEffect(() => {
    if (!onSave || !userId) return;
    if (state.phase === 'game_over') return;
    if (state.phase !== 'draw' && state.phase !== 'discard') return;
    onSave({ roundIndex, state, allRoundScores, botConfigs });
  }, [roundIndex, state.phase, state.currentActor]);

  const advanceBot = useCallback((gs: SoloGameState): SoloGameState => {
    const botIdx = gs.currentActor as number;
    const bot = gs.bots[botIdx];
    const wildRank = gs.round.wildRank;

    if (gs.phase === 'draw') {
      const topDiscard = gs.discardPile[gs.discardPile.length - 1];
      let newHand: Card[];
      let newStock = [...gs.stock];
      let newDiscard = [...gs.discardPile];
      let drawn: Card;

      const discardThreshold = bot.difficulty === 'hard' ? 7 : bot.difficulty === 'medium' ? 5 : 3;
      const shouldTakeDiscard = topDiscard && !isWildCard(topDiscard, wildRank) && RANK_VALUES[topDiscard.rank] <= discardThreshold && (bot.difficulty !== 'easy' || Math.random() > 0.4);
      if (shouldTakeDiscard) {
        drawn = newDiscard.pop()!;
        newHand = [...bot.hand, { ...drawn, isWild: isWildCard(drawn, wildRank) }];
      } else {
        if (newStock.length === 0) return { ...gs, phase: 'scoring', message: 'Stock is empty! Scoring...' };
        drawn = newStock.pop()!;
        newHand = [...bot.hand, { ...drawn, isWild: isWildCard(drawn, wildRank) }];
      }

      const newBots = gs.bots.map((b, i) => i === botIdx ? { ...b, hand: newHand } : b);
      return { ...gs, bots: newBots, stock: newStock, discardPile: newDiscard, phase: 'discard', drawnCard: drawn };
    }

    if (gs.phase === 'discard') {
      const shouldKnock = botShouldKnock(bot.hand, wildRank, bot.difficulty);
      const discardIdx = botChooseDiscard(bot.hand, wildRank, bot.difficulty);
      const discarded = bot.hand[discardIdx];
      const newHand = bot.hand.filter((_, i) => i !== discardIdx);
      const newDiscard = [...gs.discardPile, discarded];
      const newBots = gs.bots.map((b, i) => i === botIdx ? { ...b, hand: newHand, hasKnocked: shouldKnock } : b);

      const numPlayers = 1 + gs.bots.length;
      const nextActor = botIdx + 1 >= gs.bots.length ? 'player' : (botIdx + 1) as 'player' | number;

      const knockerSet = shouldKnock && gs.knockerIndex === null;
      const newKnocker = knockerSet ? botIdx : gs.knockerIndex;
      const newTurns = gs.knockerIndex !== null ? gs.turnsAfterKnock + 1 : 0;

      const endRound = gs.knockerIndex !== null && newTurns >= numPlayers - 1;

      return {
        ...gs,
        bots: newBots,
        discardPile: newDiscard,
        phase: endRound ? 'scoring' : 'draw',
        currentActor: endRound ? 'player' : nextActor,
        knockerIndex: newKnocker,
        turnsAfterKnock: newTurns,
        drawnCard: null,
        message: shouldKnock
          ? `${bot.name} knocked!`
          : endRound
          ? 'Round over! Scoring...'
          : `${bot.name} discarded a ${discarded.rank}`,
      };
    }

    return gs;
  }, []);

  useEffect(() => {
    if (state.currentActor === 'player') return;
    if (state.phase !== 'draw' && state.phase !== 'discard') return;

    const timer = setTimeout(() => {
      setState(prev => {
        let next = advanceBot(prev);
        while (next.currentActor !== 'player' && (next.phase === 'draw' || next.phase === 'discard')) {
          next = advanceBot(next);
        }
        return next;
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [state.currentActor, state.phase, advanceBot]);

  function handleDraw(source: DrawSource) {
    if (state.phase !== 'draw' || state.currentActor !== 'player') return;
    const wildRank = state.round.wildRank;

    if (source === 'discard' && state.discardPile.length === 0) return;
    if (source === 'stock' && state.stock.length === 0) {
      setState(prev => ({ ...prev, phase: 'scoring', message: 'Stock empty! Scoring...' }));
      return;
    }

    let drawn: Card;
    let newStock = [...state.stock];
    let newDiscard = [...state.discardPile];

    if (source === 'discard') {
      drawn = newDiscard.pop()!;
    } else {
      drawn = newStock.pop()!;
    }

    const markedDrawn = { ...drawn, isWild: isWildCard(drawn, wildRank) };
    const newHand = [...state.playerHand, markedDrawn];

    setState(prev => ({
      ...prev,
      playerHand: newHand,
      stock: newStock,
      discardPile: newDiscard,
      phase: 'discard',
      drawnCard: markedDrawn,
      message: `You drew the ${drawn.rank}${suitSymbol(drawn.suit)}. Select a card to discard.`,
    }));
  }

  function handleSelectCard(idx: number) {
    if (state.phase !== 'discard' || state.currentActor !== 'player') return;
    setState(prev => ({
      ...prev,
      selectedCards: prev.selectedCards.includes(idx)
        ? prev.selectedCards.filter(i => i !== idx)
        : [idx],
    }));
  }

  function handleDiscard() {
    if (state.selectedCards.length !== 1 || state.phase !== 'discard' || state.currentActor !== 'player') return;
    const discardIdx = state.selectedCards[0];
    const discarded = state.playerHand[discardIdx];
    const newHand = state.playerHand.filter((_, i) => i !== discardIdx);
    const newDiscard = [...state.discardPile, discarded];

    const numPlayers = 1 + state.bots.length;
    const nextActor: 'player' | number = state.bots.length > 0 ? 0 : 'player';
    const newTurns = state.knockerIndex !== null ? state.turnsAfterKnock + 1 : 0;
    const endRound = state.knockerIndex !== null && newTurns >= numPlayers - 1;

    setState(prev => ({
      ...prev,
      playerHand: newHand,
      discardPile: newDiscard,
      selectedCards: [],
      drawnCard: null,
      phase: endRound ? 'scoring' : 'draw',
      currentActor: endRound ? 'player' : nextActor,
      turnsAfterKnock: newTurns,
      message: endRound ? 'Round over! Show your melds.' : `You discarded ${discarded.rank}${suitSymbol(discarded.suit)}.`,
    }));
  }

  function handleKnock() {
    if (state.phase !== 'discard' || state.currentActor !== 'player') return;
    if (state.selectedCards.length !== 1) return;

    const discardIdx = state.selectedCards[0];
    const discarded = state.playerHand[discardIdx];
    const newHand = state.playerHand.filter((_, i) => i !== discardIdx);
    const newDiscard = [...state.discardPile, discarded];
    const nextActor: 'player' | number = state.bots.length > 0 ? 0 : 'player';

    setState(prev => ({
      ...prev,
      playerHand: newHand,
      discardPile: newDiscard,
      selectedCards: [],
      drawnCard: null,
      phase: 'draw',
      currentActor: nextActor,
      knockerIndex: -1,
      turnsAfterKnock: 0,
      message: 'You knocked! Others get one more turn.',
    }));
  }

  function toggleMeldCard(handIdx: number) {
    setState(prev => {
      const sel = prev.selectedCards.includes(handIdx)
        ? prev.selectedCards.filter(i => i !== handIdx)
        : [...prev.selectedCards, handIdx];
      return { ...prev, selectedCards: sel };
    });
  }

  function addMeld(type: 'set' | 'run') {
    const wildRank = state.round.wildRank;
    const cards = state.selectedCards.map(i => state.playerHand[i]);
    const valid = type === 'set' ? isValidSet(cards, wildRank) : isValidRun(cards, wildRank);
    if (!valid) {
      setState(prev => ({ ...prev, message: `Invalid ${type}! Check your selection.` }));
      return;
    }
    setState(prev => ({
      ...prev,
      melds: [...prev.melds, { cards, type }],
      selectedCards: [],
      message: `${type === 'set' ? 'Set' : 'Run'} added!`,
    }));
  }

  function clearMelds() {
    setState(prev => ({ ...prev, melds: [], selectedCards: [], message: 'Melds cleared.' }));
  }

  function submitScore() {
    const wildRank = state.round.wildRank;
    const playerPenalty = calculateHandPenalty(state.playerHand, state.melds, wildRank);
    const wentOut = state.knockerIndex === -1;

    const botScores = state.bots.map(b => {
      const bMelds = autoBotMelds(b.hand, wildRank);
      return {
        name: b.name,
        penalty: calculateHandPenalty(b.hand, bMelds, wildRank),
        wentOut: false,
      };
    });

    const roundScores = [
      { name: 'You', penalty: wentOut ? 0 : playerPenalty, wentOut },
      ...botScores,
    ];

    const newAllRoundScores = [...allRoundScores, roundScores];
    setAllRoundScores(newAllRoundScores);

    const newPlayerTotal = state.playerTotalScore + (wentOut ? 0 : playerPenalty);
    const newBotTotals = state.bots.map((b, i) => b.totalScore + botScores[i].penalty);

    const isLastRound = roundIndex >= ROUNDS_313.length - 1;

    if (isLastRound && userId) {
      const allFinalScores = [
        { name: 'You', total: newPlayerTotal },
        ...state.bots.map((b, i) => ({ name: b.name, total: newBotTotals[i] })),
      ].sort((a, b) => a.total - b.total);
      const playerWon = allFinalScores[0].name === 'You';
      supabase.from('player_records').insert({
        user_id: userId,
        game_mode: 'solo',
        game_type: '3-13',
        result: playerWon ? 'win' : 'loss',
        score: newPlayerTotal,
      });
      onClearSave?.();
    }

    setState(prev => ({
      ...prev,
      playerTotalScore: newPlayerTotal,
      bots: prev.bots.map((b, i) => ({ ...b, totalScore: newBotTotals[i] })),
      roundScores,
      allRoundScores: newAllRoundScores,
      phase: isLastRound ? 'game_over' : 'round_end',
      message: isLastRound ? 'Game over!' : `Round ${prev.round.roundNumber} complete!`,
    }));
  }

  function startNextRound() {
    const nextIdx = roundIndex + 1;
    const nextDealer = (state.dealerIndex + 1) % (1 + state.bots.length);
    const botTotals = state.bots.map(b => b.totalScore);
    setRoundIndex(nextIdx);
    setMeldRowIndices([]);
    setState(prev => ({
      ...initRound(nextIdx, prev.bots.map(b => ({ name: b.name, difficulty: b.difficulty })), prev.playerTotalScore, botTotals, nextDealer),
      allRoundScores: prev.allRoundScores,
    }));
  }

  function restartGame() {
    onClearSave?.();
    setRoundIndex(0);
    setAllRoundScores([]);
    setMeldRowIndices([]);
    setState(initRound(0, botConfigs, 0, Array(botConfigs.length).fill(0), 0));
  }

  // --- Drag handlers ---
  function onHandDragStart(handIdx: number) {
    dragSrcHandIdx.current = handIdx;
    dragSrcZone.current = 'hand';
  }

  function onMeldDragStart(handIdx: number) {
    dragSrcHandIdx.current = handIdx;
    dragSrcZone.current = 'meld';
  }

  function onMeldCardDragOver(e: React.DragEvent, meldPos: number) {
    e.preventDefault();
    e.stopPropagation();
    dragOverMeldPos.current = meldPos;
  }

  function onMeldCardDrop(e: React.DragEvent, targetMeldPos: number) {
    e.preventDefault();
    e.stopPropagation();
    const fromHandIdx = dragSrcHandIdx.current;
    const zone = dragSrcZone.current;
    if (fromHandIdx === null || zone === null) return;

    if (zone === 'meld') {
      // Reorder within meld row
      setMeldRowIndices(prev => {
        const arr = [...prev];
        const fromPos = arr.indexOf(fromHandIdx);
        if (fromPos === -1 || fromPos === targetMeldPos) return prev;
        arr.splice(fromPos, 1);
        arr.splice(targetMeldPos, 0, fromHandIdx);
        return arr;
      });
    } else {
      // Insert from hand into meld row at target position
      setMeldRowIndices(prev => {
        if (prev.includes(fromHandIdx)) return prev;
        const arr = [...prev];
        arr.splice(targetMeldPos, 0, fromHandIdx);
        return arr;
      });
    }

    dragSrcHandIdx.current = null;
    dragSrcZone.current = null;
    dragOverMeldPos.current = null;
  }

  function onMeldRowDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function onMeldRowDrop(e: React.DragEvent) {
    e.preventDefault();
    const fromHandIdx = dragSrcHandIdx.current;
    const zone = dragSrcZone.current;
    if (fromHandIdx === null || zone === null) return;

    if (zone === 'hand') {
      setMeldRowIndices(prev => prev.includes(fromHandIdx) ? prev : [...prev, fromHandIdx]);
    }

    dragSrcHandIdx.current = null;
    dragSrcZone.current = null;
    dragOverMeldPos.current = null;
  }

  function onHandAreaDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function onHandAreaDrop(e: React.DragEvent) {
    e.preventDefault();
    const fromHandIdx = dragSrcHandIdx.current;
    const zone = dragSrcZone.current;
    if (fromHandIdx === null || zone === null) return;

    if (zone === 'meld') {
      setMeldRowIndices(prev => prev.filter(idx => idx !== fromHandIdx));
    }

    dragSrcHandIdx.current = null;
    dragSrcZone.current = null;
  }

  function onHandCardDrop(e: React.DragEvent, targetHandIdx: number) {
    e.preventDefault();
    e.stopPropagation();
    const fromHandIdx = dragSrcHandIdx.current;
    const zone = dragSrcZone.current;
    if (fromHandIdx === null || zone === null || fromHandIdx === targetHandIdx) return;

    if (zone === 'hand') {
      setState(prev => {
        const hand = [...prev.playerHand];
        const [moved] = hand.splice(fromHandIdx, 1);
        hand.splice(targetHandIdx, 0, moved);
        const newSelected = prev.selectedCards.map(idx => {
          if (idx === fromHandIdx) return targetHandIdx;
          if (fromHandIdx < targetHandIdx && idx > fromHandIdx && idx <= targetHandIdx) return idx - 1;
          if (fromHandIdx > targetHandIdx && idx >= targetHandIdx && idx < fromHandIdx) return idx + 1;
          return idx;
        });
        setMeldRowIndices(prevMeld => prevMeld.map(idx => {
          if (idx === fromHandIdx) return targetHandIdx;
          if (fromHandIdx < targetHandIdx && idx > fromHandIdx && idx <= targetHandIdx) return idx - 1;
          if (fromHandIdx > targetHandIdx && idx >= targetHandIdx && idx < fromHandIdx) return idx + 1;
          return idx;
        }));
        return { ...prev, playerHand: hand, selectedCards: newSelected, drawnCard: null };
      });
    } else if (zone === 'meld') {
      setMeldRowIndices(prev => prev.filter(idx => idx !== fromHandIdx));
    }

    dragSrcHandIdx.current = null;
    dragSrcZone.current = null;
  }

  // --- Computed ---
  const wildRank = state.round.wildRank;
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const isMyTurn = state.currentActor === 'player';
  const canKnock = (() => {
    if (state.phase !== 'discard' || !isMyTurn || state.knockerIndex !== null) return false;
    if (state.selectedCards.length !== 1) return false;
    const discardIdx = state.selectedCards[0];
    const handAfterDiscard = state.playerHand.filter((_, i) => i !== discardIdx);
    return canFullyMeld(handAfterDiscard, wildRank);
  })();

  const allScores = [
    { name: 'You', total: state.playerTotalScore },
    ...state.bots.map(b => ({ name: b.name, total: b.totalScore })),
  ].sort((a, b) => a.total - b.total);

  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const cardSizePx = deckSize === 'large'
    ? { width: isMobileScreen ? 64 : 90, height: isMobileScreen ? 95 : 134 }
    : { width: isMobileScreen ? 50 : 64, height: isMobileScreen ? 74 : 96 };
  const cardSizeKey: 'sm' | 'md' | 'lg' = deckSize === 'large' ? (isMobileScreen ? 'md' : 'lg') : (isMobileScreen ? 'sm' : 'md');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: tableUrl ? `url(${tableUrl})` : undefined,
        backgroundColor: tableUrl ? undefined : '#1a4d3e',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="min-h-screen flex flex-col bg-black/40 backdrop-blur-[1px]">
        <header className="flex items-center justify-between px-4 py-3 bg-black/30">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToMenu}
              className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-full transition duration-200 shadow-lg whitespace-nowrap"
            >
              ← Menu
            </button>
            <button
              onClick={() => setShowSettings(v => !v)}
              className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition duration-200 shadow-lg"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={restartGame}
              className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition duration-200 shadow-lg"
              title="New Game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <span className="text-white font-bold text-lg tracking-wide">3-13</span>

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
                <h3 className="font-bold text-gray-800 mb-2">How to Play 3-13</h3>
                <ul className="text-sm text-gray-600 space-y-1.5">
                  <li><strong>Goal:</strong> Meld all your cards each round to score 0 penalty points.</li>
                  <li><strong>Rounds:</strong> 11 rounds — Round 1 starts with 3 cards, Round 11 ends with 13.</li>
                  <li><strong>Wild cards:</strong> Each round's number is wild (e.g., round 3 → 3s are wild).</li>
                  <li><strong>Draw:</strong> Draw from the deck or the discard pile each turn.</li>
                  <li><strong>Knock:</strong> When you can meld your whole hand, knock to end the round.</li>
                  <li><strong>Scoring:</strong> Unmelded cards count against you. Lowest total wins!</li>
                </ul>
              </div>
            )}
          </div>
        </header>

        {showSettings && (
          <div className="bg-black/70 backdrop-blur-sm border-b border-white/10">
            <div className="max-w-2xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-semibold text-sm uppercase tracking-wider">Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-white/60 hover:text-white transition">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Table</p>
                  <div className="grid grid-cols-3 gap-2">
                    {TABLES.slice(0, 6).map(t => (
                      <button
                        key={t.id}
                        onClick={() => onTableChange(t.id)}
                        className={`relative h-12 rounded-lg overflow-hidden border-2 transition ${currentTable === t.id ? 'border-white' : 'border-white/20 hover:border-white/50'}`}
                      >
                        <img src={t.url} alt={t.name} className="w-full h-full object-cover" />
                        {currentTable === t.id && (
                          <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {TABLES.slice(6).map(t => (
                      <button
                        key={t.id}
                        onClick={() => onTableChange(t.id)}
                        className={`relative h-12 rounded-lg overflow-hidden border-2 transition ${currentTable === t.id ? 'border-white' : 'border-white/20 hover:border-white/50'}`}
                      >
                        <img src={t.url} alt={t.name} className="w-full h-full object-cover" />
                        {currentTable === t.id && (
                          <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Deck Size</p>
                  <div className="flex flex-col gap-2">
                    {(['regular', 'large'] as DeckSize[]).map(sz => (
                      <button
                        key={sz}
                        onClick={() => onDeckSizeChange(sz)}
                        className={`px-4 py-2.5 rounded-xl border-2 text-sm font-semibold text-left transition ${deckSize === sz ? 'border-white bg-white/20 text-white' : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'}`}
                      >
                        {sz === 'regular' ? 'Regular' : 'Large (+40%)'}
                      </button>
                    ))}
                  </div>
                </div>
                {onDeckColorChange && (
                  <div className="bg-white/10 rounded-2xl p-4">
                    <DeckColorPicker selectedColor={currentDeckColor} onChange={onDeckColorChange} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-2 sm:px-4 py-2 sm:py-4 gap-2 sm:gap-4">
          <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
            {[{ name: 'You', total: state.playerTotalScore }, ...state.bots.map(b => ({ name: b.name, total: b.totalScore }))].map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 bg-black/40 rounded-xl px-3 py-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${PLAYER_COLORS[i % PLAYER_COLORS.length]}`}>
                  {p.name.charAt(0)}
                </div>
                <span className="text-white text-sm font-semibold">{p.name}</span>
                <span className="text-white/70 text-xs">{p.total} pts</span>
              </div>
            ))}
          </div>

          <div className="text-center text-white/80 text-sm bg-black/30 rounded-xl px-4 py-2">
            {state.phase === 'discard' && isMyTurn
              ? `Select a card to discard${canKnock ? ' or knock' : ''}`
              : !isMyTurn && (state.phase === 'draw' || state.phase === 'discard')
              ? `${state.bots[(state.currentActor as number)].name}'s turn...`
              : state.message}
          </div>

          <div className="flex gap-4 sm:gap-6 justify-center items-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/60 text-xs uppercase tracking-wider">Stock</span>
              <button
                onClick={() => handleDraw('stock')}
                disabled={state.phase !== 'draw' || !isMyTurn || state.stock.length === 0}
                className={`relative transition ${state.phase === 'draw' && isMyTurn ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-60'}`}
              >
                <CardBack width={cardSizePx.width} height={cardSizePx.height} color={deckColor} />
                <span className="absolute inset-0 flex items-end justify-center pb-2 text-sm font-bold text-white/90 drop-shadow">{state.stock.length}</span>
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-white/60 text-xs uppercase tracking-wider">Discard</span>
              {topDiscard ? (
                <button
                  onClick={() => handleDraw('discard')}
                  disabled={state.phase !== 'draw' || !isMyTurn}
                  className={`transition ${state.phase === 'draw' && isMyTurn ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`}
                >
                  <CardView card={topDiscard} wildRank={wildRank} size={cardSizeKey} />
                </button>
              ) : (
                <div style={{ width: cardSizePx.width, height: cardSizePx.height }} className="rounded-xl border-2 border-white/20 border-dashed" />
              )}
            </div>
          </div>

          {(state.phase === 'draw' || state.phase === 'discard') && (
            <div className="bg-black/30 rounded-2xl p-2 sm:p-4 space-y-2 sm:space-y-3">

              {/* Meld staging row */}
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2 text-center">Meld Row — drag cards here to organize</p>
                <div
                  className={`min-h-[80px] sm:min-h-[116px] rounded-xl border-2 border-dashed flex flex-wrap gap-2 items-center justify-center px-3 py-2 transition-colors ${meldRowIndices.length === 0 ? 'border-white/10' : 'border-white/20 bg-white/5'}`}
                  onDragOver={onMeldRowDragOver}
                  onDrop={onMeldRowDrop}
                >
                  {meldRowIndices.length === 0 && (
                    <span className="text-white/20 text-xs select-none">drag cards here</span>
                  )}
                  {meldRowIndices.map((handIdx, meldPos) => {
                    const card = state.playerHand[handIdx];
                    if (!card) return null;
                    const isSelected = state.selectedCards.includes(handIdx);
                    const isNew = state.drawnCard && handIdx === state.playerHand.length - 1;
                    return (
                      <div
                        key={`meld_${handIdx}_${card.rank}_${card.suit}`}
                        draggable
                        onDragStart={() => onMeldDragStart(handIdx)}
                        onDragOver={e => onMeldCardDragOver(e, meldPos)}
                        onDrop={e => onMeldCardDrop(e, meldPos)}
                        onClick={() => isMyTurn && state.phase === 'discard' ? handleSelectCard(handIdx) : undefined}
                        className={`transition-transform select-none ${isSelected ? '-translate-y-3' : ''} ${isNew ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent rounded-lg' : ''} ${isMyTurn && state.phase === 'discard' ? 'cursor-pointer hover:-translate-y-1' : 'cursor-grab'}`}
                      >
                        <CardView card={card} wildRank={wildRank} size={cardSizeKey} selected={isSelected} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main hand */}
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wider mb-2 text-center">Your Hand ({state.playerHand.length} cards)</p>
                <div
                  className="min-h-[80px] sm:min-h-[116px] flex flex-wrap gap-2 justify-center items-center"
                  onDragOver={onHandAreaDragOver}
                  onDrop={onHandAreaDrop}
                >
                  {state.playerHand.every((_, i) => meldRowIndices.includes(i)) && state.phase === 'discard' && isMyTurn && (
                    <p className="text-white/30 text-xs text-center px-4">All cards are in the meld row — click one above to select it for discard, then knock.</p>
                  )}
                  {state.playerHand.map((card, i) => {
                    if (meldRowIndices.includes(i)) return null;
                    const isSelected = state.selectedCards.includes(i);
                    const isNew = state.drawnCard && i === state.playerHand.length - 1;
                    return (
                      <div
                        key={`${card.rank}_${card.suit}_${i}`}
                        draggable
                        onDragStart={() => onHandDragStart(i)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => onHandCardDrop(e, i)}
                        onClick={() => isMyTurn && state.phase === 'discard' ? handleSelectCard(i) : undefined}
                        className={`transition-transform select-none ${isSelected ? '-translate-y-3' : ''} ${isNew ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent rounded-lg' : ''} ${isMyTurn && state.phase === 'discard' ? 'cursor-pointer hover:-translate-y-1' : 'cursor-grab'}`}
                      >
                        <CardView card={card} wildRank={wildRank} size={cardSizeKey} selected={isSelected} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {state.phase === 'discard' && isMyTurn && (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleDiscard}
                    disabled={state.selectedCards.length !== 1}
                    className="px-5 py-2.5 bg-white/90 text-gray-900 font-bold rounded-xl transition hover:bg-white disabled:opacity-40 text-sm"
                  >
                    Discard
                  </button>
                  {canKnock && (
                    <button
                      onClick={handleKnock}
                      className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl transition hover:bg-amber-400 text-sm"
                    >
                      Knock!
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {state.phase === 'scoring' && (
            <div className="bg-black/50 rounded-2xl p-3 sm:p-6 text-white">
              <h3 className="text-lg font-bold mb-4 text-center">Show your melds</h3>
              <p className="text-white/60 text-xs text-center mb-4">Select cards and add melds. Unmelded cards count as penalty points.</p>

              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {state.playerHand.map((card, i) => {
                  const inMeld = state.melds.some(m => m.cards.some(c => c.rank === card.rank && c.suit === card.suit));
                  const isSelected = state.selectedCards.includes(i);
                  return (
                    <button
                      key={`${card.rank}_${card.suit}_${i}`}
                      onClick={() => !inMeld && toggleMeldCard(i)}
                      className={`transition ${isSelected ? '-translate-y-3' : ''} ${inMeld ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}`}
                    >
                      <CardView card={card} wildRank={wildRank} size={cardSizeKey} selected={isSelected} />
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 justify-center mb-4 flex-wrap">
                <button
                  onClick={() => addMeld('set')}
                  disabled={state.selectedCards.length < 3}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-40"
                >
                  Add Set
                </button>
                <button
                  onClick={() => addMeld('run')}
                  disabled={state.selectedCards.length < 3}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-40"
                >
                  Add Run
                </button>
                {state.melds.length > 0 && (
                  <button onClick={clearMelds} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-bold transition">
                    Clear
                  </button>
                )}
              </div>

              {state.melds.length > 0 && (
                <div className="mb-4 space-y-2">
                  {state.melds.map((m, i) => (
                    <div key={i} className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-white/60 w-8">{m.type === 'set' ? 'Set' : 'Run'}:</span>
                      {m.cards.map((c, j) => (
                        <CardView key={j} card={c} wildRank={wildRank} size={deckSize === 'large' ? 'md' : 'sm'} />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center text-white/80 text-sm mb-4">
                Penalty: {calculateHandPenalty(state.playerHand, state.melds, wildRank)} pts
              </div>

              <button
                onClick={submitScore}
                className="w-full py-3 bg-white text-gray-900 font-bold rounded-xl transition hover:bg-white/90"
              >
                Confirm
              </button>
            </div>
          )}

          {(state.phase === 'round_end' || state.phase === 'game_over') && (
            <div className="bg-black/50 rounded-2xl p-6 text-white">
              <h3 className="text-xl font-bold mb-1 text-center">
                {state.phase === 'game_over' ? 'Game Over!' : `Round ${state.round.roundNumber} Results`}
              </h3>

              <div className="space-y-2 mb-6">
                {state.roundScores.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.name}</span>
                      {s.wentOut && <span className="text-xs bg-amber-500/80 px-2 py-0.5 rounded-full font-bold">Knocked!</span>}
                    </div>
                    <span className="font-bold text-lg">{s.wentOut ? '0' : `+${s.penalty}`}</span>
                  </div>
                ))}
              </div>

              {state.phase === 'game_over' && (
                <div className="mb-6">
                  <h4 className="text-center font-bold mb-3 text-white/80">Final Scores</h4>
                  <div className="space-y-2">
                    {allScores.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span className="text-yellow-400 font-bold">1st</span>}
                          <span className="font-semibold">{p.name}</span>
                        </div>
                        <span className="font-bold text-lg">{p.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {state.phase === 'round_end' && (
                  <button
                    onClick={startNextRound}
                    className="flex-1 py-3 bg-white text-gray-900 font-bold rounded-xl transition hover:bg-white/90"
                  >
                    Next Round
                  </button>
                )}
                <button
                  onClick={restartGame}
                  className="flex-1 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  {state.phase === 'game_over' ? 'Play Again' : 'Restart'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
