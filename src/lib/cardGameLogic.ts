export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  isWild?: boolean;
}

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10,
};

export const RANK_ORDER: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
};

export function createDeck(numDecks: number): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardKey(card: Card): string {
  return `${card.rank}_${card.suit}`;
}

export function suitSymbol(suit: Suit): string {
  return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit];
}

export function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : '#1e293b';
}

export function rankLabel(rank: Rank): string {
  return rank;
}

export interface Round313 {
  roundNumber: number;
  cardsDealt: number;
  wildRank: Rank;
}

export const ROUNDS_313: Round313[] = [
  { roundNumber: 1, cardsDealt: 3, wildRank: '3' },
  { roundNumber: 2, cardsDealt: 4, wildRank: '4' },
  { roundNumber: 3, cardsDealt: 5, wildRank: '5' },
  { roundNumber: 4, cardsDealt: 6, wildRank: '6' },
  { roundNumber: 5, cardsDealt: 7, wildRank: '7' },
  { roundNumber: 6, cardsDealt: 8, wildRank: '8' },
  { roundNumber: 7, cardsDealt: 9, wildRank: '9' },
  { roundNumber: 8, cardsDealt: 10, wildRank: '10' },
  { roundNumber: 9, cardsDealt: 11, wildRank: 'J' },
  { roundNumber: 10, cardsDealt: 12, wildRank: 'Q' },
  { roundNumber: 11, cardsDealt: 13, wildRank: 'K' },
];

export function isWildCard(card: Card, wildRank: Rank): boolean {
  return card.rank === wildRank;
}

export function cardPenaltyValue(card: Card, wildRank: Rank): number {
  if (isWildCard(card, wildRank)) return RANK_VALUES[card.rank];
  return RANK_VALUES[card.rank];
}

export interface Meld {
  cards: Card[];
  type: 'set' | 'run';
}

export function isValidSet(cards: Card[], wildRank: Rank): boolean {
  if (cards.length < 3) return false;
  const naturals = cards.filter(c => !isWildCard(c, wildRank));
  if (naturals.length === 0) return false;
  const ranks = new Set(naturals.map(c => c.rank));
  return ranks.size === 1;
}

export function isValidRun(cards: Card[], wildRank: Rank): boolean {
  if (cards.length < 3) return false;
  const naturals = cards.filter(c => !isWildCard(c, wildRank));
  if (naturals.length === 0) return false;
  const suits = new Set(naturals.map(c => c.suit));
  if (suits.size !== 1) return false;

  const wilds = cards.filter(c => isWildCard(c, wildRank)).length;
  const naturalOrders = naturals.map(c => RANK_ORDER[c.rank]).sort((a, b) => a - b);

  const minOrder = naturalOrders[0];
  const maxOrder = naturalOrders[naturalOrders.length - 1];
  const span = maxOrder - minOrder;

  if (span >= cards.length) return false;

  const gapsNeeded = span - (naturals.length - 1);
  return gapsNeeded <= wilds;
}

export function isValidMeld(cards: Card[], wildRank: Rank): boolean {
  return isValidSet(cards, wildRank) || isValidRun(cards, wildRank);
}

export function calculateHandPenalty(hand: Card[], melds: Meld[], wildRank: Rank): number {
  const meldedCardKeys = new Set<string>();
  for (const meld of melds) {
    for (const card of meld.cards) {
      meldedCardKeys.add(cardKey(card));
    }
  }

  let penalty = 0;
  for (const card of hand) {
    if (!meldedCardKeys.has(cardKey(card))) {
      penalty += cardPenaltyValue(card, wildRank);
    }
  }
  return penalty;
}

export function canFullyMeld(hand: Card[], wildRank: Rank): boolean {
  if (hand.length === 0) return true;
  return tryMeld(hand, wildRank, new Set<number>());
}

function tryMeld(hand: Card[], wildRank: Rank, used: Set<number>): boolean {
  const remaining = hand.map((c, i) => i).filter(i => !used.has(i));
  if (remaining.length === 0) return true;

  const first = remaining[0];

  for (let len = remaining.length; len >= 3; len--) {
    for (const combo of combinations(remaining.slice(1), len - 1)) {
      const indices = [first, ...combo];
      const cards = indices.map(i => hand[i]);
      if (isValidSet(cards, wildRank) || isValidRun(cards, wildRank)) {
        const newUsed = new Set(used);
        indices.forEach(i => newUsed.add(i));
        if (tryMeld(hand, wildRank, newUsed)) return true;
      }
    }
  }

  return false;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

export function markWilds(cards: Card[], wildRank: Rank): Card[] {
  return cards.map(c => ({ ...c, isWild: isWildCard(c, wildRank) }));
}

export function createDeckFor313(playerCount: number): Card[] {
  // Round 11 deals 13 cards each. Max cards needed = 13 * playerCount + 1 (top discard).
  // 1 deck (52 cards) covers up to 3 players (39 + 1 = 40 <= 52).
  // 2 decks (104 cards) covers up to 7 players (91 + 1 = 92 <= 104).
  const numDecks = playerCount <= 3 ? 1 : playerCount <= 7 ? 2 : 3;
  return shuffleDeck(createDeck(numDecks));
}

export function dealHands(deck: Card[], playerCount: number, cardsEach: number): { hands: Card[][]; remaining: Card[] } {
  const deckCopy = [...deck];
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < cardsEach; i++) {
    for (let p = 0; p < playerCount; p++) {
      const card = deckCopy.pop();
      if (card) hands[p].push(card);
    }
  }
  return { hands, remaining: deckCopy };
}
