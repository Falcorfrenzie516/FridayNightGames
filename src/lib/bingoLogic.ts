export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

function createDeck(numDecks: number): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface BingoBoard {
  cells: (Card | null)[];
}

export interface WinCondition {
  id: string;
  name: string;
  cells: number[];
  anyOf?: number[][];
}

export interface WinCategory {
  id: string;
  name: string;
  conditions: WinCondition[];
}

const BOARD_SIZE = 25;
const FREE_CELL = 12;

export const WIN_CATEGORIES: WinCategory[] = [
  {
    id: 'basic',
    name: 'Basic Bingo',
    conditions: [
      {
        id: 'any_horizontal',
        name: 'Any Horizontal',
        cells: [0, 1, 2, 3, 4],
        anyOf: [
          [0, 1, 2, 3, 4],
          [5, 6, 7, 8, 9],
          [10, 11, 12, 13, 14],
          [15, 16, 17, 18, 19],
          [20, 21, 22, 23, 24],
        ],
      },
      {
        id: 'any_vertical',
        name: 'Any Vertical',
        cells: [0, 5, 10, 15, 20],
        anyOf: [
          [0, 5, 10, 15, 20],
          [1, 6, 11, 16, 21],
          [2, 7, 12, 17, 22],
          [3, 8, 13, 18, 23],
          [4, 9, 14, 19, 24],
        ],
      },
      {
        id: 'either_diagonal',
        name: 'Either Diagonal',
        cells: [0, 6, 12, 18, 24],
        anyOf: [
          [0, 6, 12, 18, 24],
          [4, 8, 12, 16, 20],
        ],
      },
      {
        id: 'letter_x',
        name: 'Letter X',
        cells: [0, 4, 6, 8, 12, 16, 18, 20, 24],
      },
      {
        id: 'small_plus',
        name: 'Small Plus Sign',
        cells: [7, 11, 12, 13, 17],
        anyOf: (() => {
          const variants: number[][] = [];
          for (let r = 1; r <= 3; r++) {
            for (let c = 1; c <= 3; c++) {
              const center = r * 5 + c;
              variants.push([center - 5, center - 1, center, center + 1, center + 5]);
            }
          }
          return variants;
        })(),
      },
      {
        id: 'small_frame',
        name: 'Small Frame',
        cells: [6, 7, 8, 11, 13, 16, 17, 18],
        anyOf: (() => {
          const variants: number[][] = [];
          for (let r = 0; r <= 2; r++) {
            for (let c = 0; c <= 2; c++) {
              const tl = r * 5 + c;
              variants.push([tl, tl + 1, tl + 2, tl + 5, tl + 7, tl + 10, tl + 11, tl + 12]);
            }
          }
          return variants;
        })(),
      },
      {
        id: 'four_corners',
        name: '4 Corners',
        cells: [0, 4, 20, 24],
      },
      {
        id: 'large_plus',
        name: 'Large Plus Sign',
        cells: [2, 7, 10, 11, 12, 13, 14, 17, 22],
      },
      {
        id: 'large_frame',
        name: 'Large Frame',
        cells: [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24],
      },
      {
        id: 'full_board',
        name: 'Full Board',
        cells: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
      },
      {
        id: 'postage_stamp',
        name: 'Postage Stamp',
        cells: [0, 1, 5, 6],
        anyOf: (() => {
          const blocks: number[][] = [];
          for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
              blocks.push([r * 5 + c, r * 5 + c + 1, (r + 1) * 5 + c, (r + 1) * 5 + c + 1]);
            }
          }
          return blocks;
        })(),
      },
      {
        id: 'best_n_only',
        name: "Best'N'Only",
        cells: [0, 5, 10, 15, 20, 2, 7, 12, 17, 22, 4, 9, 14, 19, 24],
      },
    ],
  },
  {
    id: 'spring',
    name: 'Spring Bingo',
    conditions: [
      {
        id: 'spring_tulip',
        name: 'Tulip',
        cells: [0, 2, 4, 5, 6, 8, 9, 10, 14, 15, 19, 21, 22, 23],
      },
      {
        id: 'spring_sunshine',
        name: 'Sunshine',
        cells: [0, 2, 4, 6, 7, 8, 10, 11, 13, 14, 16, 17, 18, 20, 22, 24],
      },
      {
        id: 'spring_rake',
        name: 'Rake',
        cells: [0, 2, 4, 5, 6, 7, 8, 9, 12, 17, 22],
        anyOf: [
          [0, 2, 4, 5, 6, 7, 8, 9, 12, 17, 22],
          [2, 7, 12, 15, 16, 17, 18, 19, 20, 22, 24],
        ],
      },
      {
        id: 'spring_flower_pot',
        name: 'Flower Pot',
        cells: [0, 1, 2, 3, 4, 5, 9, 11, 12, 13, 16, 18, 21, 22, 23],
      },
      {
        id: 'spring_rain_drop',
        name: 'Rain Drop',
        anyOf: [
          [0, 6, 7, 8, 11, 14, 16, 19, 22, 23],
          [4, 6, 7, 8, 10, 13, 15, 18, 21, 22],
        ],
        cells: [0, 6, 7, 8, 11, 14, 16, 19, 22, 23],
      },
      {
        id: 'spring_basket',
        name: 'Basket',
        cells: [1, 2, 3, 5, 9, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
      },
      {
        id: 'spring_clover',
        name: 'Clover',
        cells: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
      },
      {
        id: 'spring_leaf',
        name: 'Leaf',
        cells: [0, 6, 7, 8, 11, 12, 14, 16, 19, 22, 23, 24],
        anyOf: [
          [0, 6, 7, 8, 11, 12, 14, 16, 19, 22, 23, 24],
          [4, 6, 7, 8, 10, 12, 13, 15, 18, 20, 21, 22],
        ],
      },
      {
        id: 'spring_umbrella',
        name: 'Umbrella',
        cells: [1, 2, 3, 5, 9, 11, 12, 13, 17, 21, 22],
        anyOf: [
          [1, 2, 3, 5, 9, 11, 12, 13, 17, 21, 22],
          [1, 2, 3, 5, 9, 11, 12, 13, 17, 22, 23],
        ],
      },
      {
        id: 'spring_tree',
        name: 'Tree',
        cells: [2, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22],
      },
      {
        id: 'spring_picnic_table',
        name: 'Picnic Table',
        cells: [0, 1, 2, 3, 4, 6, 8, 12, 16, 18, 20, 24],
      },
      {
        id: 'spring_mushroom',
        name: 'Mushroom',
        cells: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 22],
      },
    ],
  },
  {
    id: 'math',
    name: 'Math Bingo',
    conditions: [
      {
        id: 'math_zero',
        name: 'Zero',
        cells: [1, 2, 3, 5, 9, 10, 14, 15, 19, 21, 22, 23],
      },
      {
        id: 'math_one',
        name: 'Number 1',
        cells: [2, 6, 7, 12, 17, 20, 21, 22, 23, 24],
      },
      {
        id: 'math_two',
        name: 'Number 2',
        cells: [0, 1, 2, 3, 9, 11, 12, 13, 15, 20, 21, 22, 23, 24],
      },
      {
        id: 'math_three',
        name: 'Number 3',
        cells: [0, 1, 2, 3, 9, 11, 12, 13, 14, 19, 20, 21, 22, 23],
      },
      {
        id: 'math_four',
        name: 'Number 4',
        cells: [0, 4, 5, 9, 11, 12, 13, 14, 19, 24],
      },
      {
        id: 'math_five',
        name: 'Number 5',
        cells: [0, 1, 2, 3, 4, 5, 11, 12, 13, 19, 20, 21, 22, 23],
      },
      {
        id: 'math_six',
        name: 'Number 6',
        cells: [1, 2, 3, 4, 5, 10, 11, 12, 13, 15, 19, 21, 22, 23],
      },
      {
        id: 'math_seven',
        name: 'Number 7',
        cells: [0, 1, 2, 3, 4, 8, 12, 16, 20],
      },
      {
        id: 'math_eight',
        name: 'Number 8',
        cells: [1, 2, 3, 5, 9, 11, 12, 13, 15, 19, 21, 22, 23],
      },
      {
        id: 'math_nine',
        name: 'Number 9',
        cells: [1, 2, 3, 5, 9, 11, 12, 13, 14, 19, 20, 21, 22, 23],
      },
      {
        id: 'math_plus',
        name: 'Plus',
        cells: [2, 7, 10, 11, 12, 13, 14, 17, 22],
      },
      {
        id: 'math_minus',
        name: 'Minus',
        cells: [10, 11, 12, 13, 14],
      },
      {
        id: 'math_divide',
        name: 'Divide',
        cells: [2, 10, 11, 12, 13, 14, 22],
      },
      {
        id: 'math_multiply',
        name: 'Multiply',
        cells: [0, 4, 6, 8, 12, 16, 18, 20, 24],
      },
      {
        id: 'math_equals',
        name: 'Equals',
        cells: [5, 6, 7, 8, 9, 15, 16, 17, 18, 19],
      },
      {
        id: 'math_greater_than',
        name: 'Greater Than',
        cells: [0, 6, 7, 13, 14, 16, 17, 20],
      },
      {
        id: 'math_less_than',
        name: 'Less Than',
        cells: [4, 7, 8, 10, 11, 17, 18, 24],
      },
      {
        id: 'math_absolute',
        name: 'Absolute',
        cells: [0, 4, 5, 9, 10, 14, 15, 19, 20, 24],
      },
      {
        id: 'math_angle',
        name: 'Angle',
        anyOf: [
          [4, 8, 12, 16, 20, 21, 22, 23, 24],
          [0, 6, 12, 18, 20, 21, 22, 23, 24],
        ],
        cells: [4, 8, 12, 16, 20, 21, 22, 23, 24],
      },
      {
        id: 'math_right_angle',
        name: 'Right Angle',
        anyOf: [
          [0, 5, 10, 15, 20, 21, 22, 23, 24],
          [4, 9, 14, 19, 20, 21, 22, 23, 24],
        ],
        cells: [0, 5, 10, 15, 20, 21, 22, 23, 24],
      },
      {
        id: 'math_brackets',
        name: 'Brackets',
        cells: [0, 1, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 23, 24],
      },
      {
        id: 'math_parentheses',
        name: 'Parentheses',
        cells: [1, 3, 5, 9, 10, 14, 15, 19, 21, 23],
      },
      {
        id: 'math_parallel',
        name: 'Parallel',
        anyOf: [
          [0, 2, 5, 7, 10, 12, 15, 17, 20, 22],
          [1, 3, 6, 8, 11, 13, 16, 18, 21, 23],
          [2, 4, 7, 9, 12, 14, 17, 19, 22, 24],
        ],
        cells: [0, 2, 5, 7, 10, 12, 15, 17, 20, 22],
      },
    ],
  },
];

export function getCategoryById(id: string): WinCategory | undefined {
  return WIN_CATEGORIES.find(c => c.id === id);
}

export function getRandomWinCondition(categoryId: string): WinCondition {
  const cat = getCategoryById(categoryId);
  if (!cat || cat.conditions.length === 0) return WIN_CATEGORIES[0].conditions[0];
  return cat.conditions[Math.floor(Math.random() * cat.conditions.length)];
}

export function generateBingoBoard(): BingoBoard {
  const deck = shuffleDeck(createDeck(1));
  const cells: (Card | null)[] = [];

  for (let i = 0; i < BOARD_SIZE; i++) {
    cells.push(deck.pop() ?? null);
  }

  return { cells };
}

export function generateBoards(count: number): BingoBoard[] {
  const boards: BingoBoard[] = [];
  for (let i = 0; i < count; i++) {
    boards.push(generateBingoBoard());
  }
  return boards;
}

export function cardMatchesFlipped(cell: Card | null, flippedCards: Card[]): boolean {
  if (!cell) return false;
  return flippedCards.some(fc => fc.rank === cell.rank && fc.suit === cell.suit);
}

export function checkWin(
  daubs: number[],
  winCondition: WinCondition
): boolean {
  const daubSet = new Set(daubs);
  if (winCondition.anyOf) {
    return winCondition.anyOf.some(group => group.every(c => daubSet.has(c)));
  }
  return winCondition.cells.every(c => daubSet.has(c));
}

export function checkBoardForWin(
  daubed: number[],
  winCondition: WinCondition
): boolean {
  return checkWin(daubed, winCondition);
}

export function suitSymbol(suit: Suit): string {
  return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit];
}

export function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : '#1e293b';
}

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function createFlipDeck(): Card[] {
  return shuffleDeck(createDeck(1));
}

export const BINGO_HEADER = ['♠', '♥', '★', '♦', '♣'];
export { FREE_CELL, BOARD_SIZE };
