import CardBack from './CardBack';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardData {
  suit: Suit;
  rank: Rank;
  isWild?: boolean;
}

export function suitSymbol(suit: Suit): string {
  return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit];
}

export function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : '#1e293b';
}

export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_STYLES: Record<CardSize, { width: number; height: number }> = {
  sm: { width: 36, height: 56 },
  md: { width: 48, height: 72 },
  lg: { width: 64, height: 96 },
  xl: { width: 90, height: 134 },
};

const CORNER_TEXT: Record<CardSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
};

const CORNER_SUIT_TEXT: Record<CardSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
  xl: 'text-lg',
};

const CENTER_SUIT_TEXT: Record<CardSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

const WILD_TEXT: Record<CardSize, string> = {
  sm: 'text-[8px]',
  md: 'text-[10px]',
  lg: 'text-[10px]',
  xl: 'text-xs',
};

interface CardViewProps {
  card: CardData;
  wildRank?: string;
  size?: CardSize;
  selected?: boolean;
  faceDown?: boolean;
}

export default function CardView({ card, wildRank, size = 'md', selected = false, faceDown = false }: CardViewProps) {
  const s = SIZE_STYLES[size];
  const isWild = (wildRank != null && card.rank === wildRank) || card.isWild === true;

  if (faceDown) {
    return <CardBack width={s.width} height={s.height} />;
  }

  const color = suitColor(card.suit);
  const sym = suitSymbol(card.suit);

  return (
    <div
      style={{ width: s.width, height: s.height }}
      className={`
        rounded-lg border-2 flex-shrink-0 flex flex-col items-start justify-between p-1 select-none relative
        transition-all duration-150
        ${selected ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-200'}
        ${isWild ? 'bg-gradient-to-br from-amber-50 to-yellow-100' : 'bg-white'}
      `}
    >
      {isWild && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-amber-400/60 pointer-events-none" />
      )}

      <div style={{ color, lineHeight: 1 }}>
        <div className={`font-black leading-none ${CORNER_TEXT[size]}`}>{card.rank}</div>
        <div className={CORNER_SUIT_TEXT[size]}>{sym}</div>
      </div>

      <div style={{ color }} className={`self-end rotate-180 leading-none ${CORNER_TEXT[size]}`}>
        <div className="font-black">{card.rank}</div>
        <div className={CORNER_SUIT_TEXT[size]}>{sym}</div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isWild ? (
          <span className={`${WILD_TEXT[size]} font-black text-amber-600/70 uppercase tracking-wider`}>wild</span>
        ) : (
          <span className={`leading-none select-none ${CENTER_SUIT_TEXT[size]}`} style={{ color, opacity: 0.85 }}>
            {sym}
          </span>
        )}
      </div>
    </div>
  );
}
