import React from 'react';
import { Card } from '../lib/bingoLogic';
import { BingoBoard, FREE_CELL, BINGO_HEADER, cardKey } from '../lib/bingoLogic';
import { WinCondition } from '../lib/bingoLogic';
import CardView, { suitSymbol, suitColor } from './CardView';

interface BingoBoardDisplayProps {
  board: BingoBoard;
  boardIndex: number;
  daubs: number[];
  flippedCards: Card[];
  winCondition: WinCondition;
  onDaub?: (cellIndex: number) => void;
  isWinner?: boolean;
  compact?: boolean;
  tableUrl?: string;
  daubColor?: string;
  daubGhostColor?: string;
}

const HEADER_COLORS = [
  { bg: '#1d4ed8', text: '#fff' },
  { bg: '#dc2626', text: '#fff' },
  { bg: '#475569', text: '#fff' },
  { bg: '#d97706', text: '#fff' },
  { bg: '#16a34a', text: '#fff' },
];

export default function BingoBoardDisplay({
  board,
  boardIndex,
  daubs,
  flippedCards,
  winCondition,
  onDaub,
  isWinner = false,
  compact = false,
  daubColor = '#1e40af',
  daubGhostColor = 'rgba(30,64,175,0.18)',
}: BingoBoardDisplayProps) {
  const daubSet = new Set(daubs);

  const variants = winCondition.anyOf ?? [winCondition.cells];
  const [activeVariantIndex, setActiveVariantIndex] = React.useState(0);
  const [highlightFading, setHighlightFading] = React.useState(false);

  React.useEffect(() => {
    if (variants.length <= 1 || isWinner) return;
    const winning = winCondition.anyOf?.findIndex(group => group.every(c => daubSet.has(c))) ?? -1;
    if (winning !== -1) return;
    const interval = setInterval(() => {
      setHighlightFading(true);
      setTimeout(() => {
        setActiveVariantIndex(i => (i + 1) % variants.length);
        setHighlightFading(false);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, [variants.length, isWinner]);

  const winCellSet = (() => {
    if (winCondition.anyOf) {
      const winning = winCondition.anyOf.find(group => group.every(c => daubSet.has(c)));
      if (winning) return new Set(winning);
      return new Set(variants[activeVariantIndex]);
    }
    return new Set(winCondition.cells);
  })();

  function isCellFlipped(cell: Card | null): boolean {
    if (!cell) return true;
    return flippedCards.some(fc => fc.rank === cell.rank && fc.suit === cell.suit);
  }

  function handleCellClick(idx: number) {
    if (!onDaub) return;
    const cell = board.cells[idx];
    if (!isCellFlipped(cell)) return;
    if (daubSet.has(idx)) return;
    onDaub(idx);
  }

  const cellSize = 'flex-1';
  const cornerRankSize = compact ? 'text-[9px]' : 'text-[11px]';
  const cornerSuitSize = compact ? 'text-[7px]' : 'text-[9px]';
  const centerSuitSize = compact ? 'text-xl' : 'text-2xl';

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-xl border-2 ${isWinner ? 'border-yellow-400 shadow-yellow-200' : 'border-white/20'}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.97)' }}
    >
      {isWinner && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-yellow-400/90 text-yellow-900 font-black text-2xl px-6 py-2 rounded-xl shadow-lg rotate-[-5deg]">
            BINGO!
          </div>
        </div>
      )}

      <div className="grid grid-cols-5">
        {BINGO_HEADER.map((letter, col) => (
          <div
            key={letter}
            className="flex items-center justify-center font-black text-sm py-2"
            style={{
              backgroundColor: HEADER_COLORS[col].bg,
              color: HEADER_COLORS[col].text,
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 p-1.5 bg-gray-200">
        {Array.from({ length: 5 }, (_, row) => (
          <div key={row} className="flex gap-1.5">
        {Array.from({ length: 5 }, (_, col) => { const idx = row * 5 + col; const cell = board.cells[idx];
          const isDaubed = daubSet.has(idx);
          const flipped = isCellFlipped(cell);
          const isWinCell = winCellSet.has(idx);
          const canDaub = onDaub && flipped && !isDaubed;
          const missedFlip = flipped && !isDaubed;

          return (
            <button
              key={`${boardIndex}-${idx}`}
              onClick={() => handleCellClick(idx)}
              disabled={!canDaub}
              className={[
                `${cellSize} relative flex items-center justify-center transition-all duration-150 rounded-md border border-gray-300`,
                canDaub ? 'cursor-pointer hover:scale-95 active:scale-90' : 'cursor-default',
              ].join(' ')}
              style={{
                aspectRatio: '5/7',
                backgroundColor: isWinCell && !isDaubed ? `rgba(219,234,254,${highlightFading ? 0 : 1})` : '#fff',
                boxShadow: isWinCell ? `inset 0 0 0 2px rgba(59,130,246,${highlightFading ? 0 : 1})` : undefined,
                transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              {cell ? (
                <>
                  <span
                    className={`absolute top-0.5 left-1 ${cornerRankSize} font-black leading-none`}
                    style={{ color: suitColor(cell.suit) }}
                  >
                    {cell.rank}
                  </span>
                  <span
                    className={`absolute top-[14px] left-1 ${cornerSuitSize} leading-none`}
                    style={{ color: suitColor(cell.suit) }}
                  >
                    {suitSymbol(cell.suit)}
                  </span>

                  <span
                    className={`absolute bottom-0.5 right-1 ${cornerRankSize} font-black leading-none rotate-180`}
                    style={{ color: suitColor(cell.suit) }}
                  >
                    {cell.rank}
                  </span>
                  <span
                    className={`absolute bottom-[14px] right-1 ${cornerSuitSize} leading-none rotate-180`}
                    style={{ color: suitColor(cell.suit) }}
                  >
                    {suitSymbol(cell.suit)}
                  </span>

                  <span
                    className={`${centerSuitSize} leading-none`}
                    style={{ color: suitColor(cell.suit) }}
                  >
                    {suitSymbol(cell.suit)}
                  </span>

                  {isDaubed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="rounded-full opacity-85 transition-all"
                        style={{
                          width: compact ? '34px' : '42px',
                          height: compact ? '34px' : '42px',
                          backgroundColor: daubColor,
                          boxShadow: `0 2px 8px ${daubColor}99`,
                        }}
                      />
                    </div>
                  )}

                  {missedFlip && !isDaubed && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className="rounded-full"
                        style={{
                          width: compact ? '34px' : '42px',
                          height: compact ? '34px' : '42px',
                          backgroundColor: daubGhostColor,
                          border: `2px solid ${daubGhostColor}`,
                        }}
                      />
                    </div>
                  )}

                  {isWinCell && (
                    <div
                      className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#3b82f6', opacity: highlightFading ? 0 : 0.4, transition: 'opacity 0.3s ease' }}
                    />
                  )}
                </>
              ) : null}
            </button>
          );
        })}
          </div>
        ))}
      </div>

    </div>
  );
}

interface WinPatternPreviewProps {
  condition: WinCondition;
  size?: 'sm' | 'md';
}

export function WinPatternPreview({ condition, size = 'md' }: WinPatternPreviewProps) {
  const variants = condition.anyOf ?? [condition.cells];
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [fading, setFading] = React.useState(false);

  React.useEffect(() => {
    if (variants.length <= 1) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActiveIndex(i => (i + 1) % variants.length);
        setFading(false);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, [variants.length]);

  const cellSet = new Set(variants[activeIndex]);
  const cellSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div>
      <div className="grid grid-cols-5 gap-px" style={{ width: 'fit-content' }}>
        {Array.from({ length: 25 }, (_, i) => (
          <div
            key={i}
            className={`${cellSize} rounded-sm`}
            style={{
              backgroundColor: cellSet.has(i) ? '#1d4ed8' : '#e5e7eb',
              opacity: fading ? 0 : 1,
              transition: 'opacity 0.3s ease, background-color 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function FlippedCardDisplay({ card, isNew }: { card: Card; isNew?: boolean }) {
  return (
    <div className={`transition-all ${isNew ? 'scale-105' : ''}`}>
      <CardView card={card} size="xl" />
    </div>
  );
}

export { cardKey };
