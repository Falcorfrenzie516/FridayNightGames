export interface Domino {
  id: string;
  high: number;
  low: number;
}

export interface Train {
  ownerId: string;
  tiles: Domino[];
  openEnd: number;
  isPublic: boolean;
  hasMarker: boolean;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  hand: Domino[];
  score: number;
  roundScore: number;
}

export interface PendingDouble {
  trainId: string;
  domino: Domino;
  playedByPlayerId: string;
}

export interface GameState {
  round: number;
  maxRound: number;
  engineValue: number;
  boneyard: Domino[];
  players: Player[];
  trains: Record<string, Train>;
  mexicanTrain: Train;
  currentPlayerIndex: number;
  pendingDouble: PendingDouble | null;
  phase: 'initial-placement' | 'playing' | 'round-over' | 'game-over';
  initialPlacementDone: Set<string>;
  initialDrawDone: Set<string>;
  message: string;
  drewFromBoneyard: boolean;
  winner: string | null;
  bonusTilePending: boolean;
}

export const DOUBLE_SET = 12;

export function createDominoSet(maxPip: number): Domino[] {
  const tiles: Domino[] = [];
  for (let high = 0; high <= maxPip; high++) {
    for (let low = 0; low <= high; low++) {
      tiles.push({ id: `${high}-${low}`, high, low });
    }
  }
  return tiles;
}

export function shuffleDominoes(tiles: Domino[]): Domino[] {
  const arr = [...tiles];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dominoPipCount(d: Domino): number {
  return d.high + d.low;
}

export function handScore(hand: Domino[]): number {
  return hand.reduce((sum, d) => sum + dominoPipCount(d), 0);
}

export function canPlay(domino: Domino, openEnd: number): boolean {
  return domino.high === openEnd || domino.low === openEnd;
}

export function orientDomino(domino: Domino, openEnd: number): { leading: number; trailing: number } {
  if (domino.high === openEnd) {
    return { leading: domino.high, trailing: domino.low };
  }
  return { leading: domino.low, trailing: domino.high };
}

export function getPlayableTiles(hand: Domino[], openEnd: number): Domino[] {
  return hand.filter(d => canPlay(d, openEnd));
}

export function isDouble(d: Domino): boolean {
  return d.high === d.low;
}

export function findHighestDouble(hand: Domino[]): Domino | null {
  const doubles = hand.filter(isDouble).sort((a, b) => b.high - a.high);
  return doubles[0] ?? null;
}

export function tilesPerPlayer(numPlayers: number): number {
  if (numPlayers <= 6) return 12;
  if (numPlayers <= 8) return 10;
  return 8;
}

export function dealHands(boneyard: Domino[], players: Player[], count: number): { hands: Domino[][]; remaining: Domino[] } {
  const remaining = [...boneyard];
  const hands: Domino[][] = players.map(() => []);
  for (let i = 0; i < count; i++) {
    for (let p = 0; p < players.length; p++) {
      if (remaining.length > 0) {
        hands[p].push(remaining.shift()!);
      }
    }
  }
  return { hands, remaining };
}

export function playDominoOnTrain(train: Train, domino: Domino): Train {
  const { trailing } = orientDomino(domino, train.openEnd);
  return {
    ...train,
    tiles: [...train.tiles, domino],
    openEnd: trailing,
  };
}

export function drawFromBoneyard(boneyard: Domino[], count = 1): { drawn: Domino[]; remaining: Domino[] } {
  const remaining = [...boneyard];
  const drawn: Domino[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    drawn.push(remaining.shift()!);
  }
  return { drawn, remaining };
}

export function getPlayableTrains(
  playerId: string,
  trains: Record<string, Train>,
  mexicanTrain: Train,
  pendingDouble: PendingDouble | null
): string[] {
  if (pendingDouble) {
    return [pendingDouble.trainId];
  }
  const result: string[] = [];
  const playerTrain = trains[playerId];
  if (playerTrain) result.push(playerId);
  result.push('mexican');
  Object.entries(trains).forEach(([id, train]) => {
    if (id !== playerId && train.hasMarker) {
      result.push(id);
    }
  });
  return result;
}

export function botChooseMove(
  hand: Domino[],
  playableTrainIds: string[],
  trains: Record<string, Train>,
  mexicanTrain: Train,
  difficulty: 'easy' | 'medium' | 'hard',
  pendingDouble: PendingDouble | null
): { domino: Domino; trainId: string } | null {
  const getOpenEnd = (trainId: string) =>
    trainId === 'mexican' ? mexicanTrain.openEnd : trains[trainId]?.openEnd ?? -1;

  if (pendingDouble) {
    const openEnd = getOpenEnd(pendingDouble.trainId);
    const playable = getPlayableTiles(hand, openEnd);
    if (playable.length === 0) return null;
    const chosen = difficulty === 'hard'
      ? playable.reduce((best, d) => dominoPipCount(d) > dominoPipCount(best) ? d : best, playable[0])
      : playable[Math.floor(Math.random() * playable.length)];
    return { domino: chosen, trainId: pendingDouble.trainId };
  }

  interface Candidate { domino: Domino; trainId: string; score: number }
  const candidates: Candidate[] = [];
  for (const trainId of playableTrainIds) {
    const openEnd = getOpenEnd(trainId);
    if (openEnd === -1) continue;
    const playable = getPlayableTiles(hand, openEnd);
    for (const d of playable) {
      let score = dominoPipCount(d);
      if (difficulty === 'hard' && isDouble(d)) score += 5;
      candidates.push({ domino: d, trainId, score });
    }
  }
  if (candidates.length === 0) return null;
  if (difficulty === 'easy') {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

export function checkRoundOver(players: Player[]): string | null {
  for (const p of players) {
    if (p.hand.length === 0) return p.id;
  }
  return null;
}

export function allPlayersStuck(
  players: Player[],
  trains: Record<string, Train>,
  mexicanTrain: Train,
  boneyard: Domino[],
  pendingDouble: PendingDouble | null
): boolean {
  if (boneyard.length > 0) return false;
  for (const p of players) {
    const playable = getPlayableTrains(p.id, trains, mexicanTrain, pendingDouble);
    for (const tid of playable) {
      const openEnd = tid === 'mexican' ? mexicanTrain.openEnd : trains[tid]?.openEnd ?? -1;
      if (getPlayableTiles(p.hand, openEnd).length > 0) return false;
    }
  }
  return true;
}
