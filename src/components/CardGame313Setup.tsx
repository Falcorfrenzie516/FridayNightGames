import { useState } from 'react';
import { ArrowLeft, Plus, Minus, PlayCircle } from 'lucide-react';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface Bot313Config {
  name: string;
  difficulty: BotDifficulty;
}

const BOT_NAMES = ['Ruby', 'Finn', 'Cleo'];
const DIFFICULTIES: BotDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

interface CardGame313SetupProps {
  onStart: (bots: Bot313Config[]) => void;
  onCancel: () => void;
  hasSavedGame?: boolean;
  onResume?: () => void;
}

export default function CardGame313Setup({ onStart, onCancel, hasSavedGame, onResume }: CardGame313SetupProps) {
  const [botCount, setBotCount] = useState(1);
  const [difficulties, setDifficulties] = useState<BotDifficulty[]>(['medium', 'medium', 'medium']);

  function setDifficulty(index: number, diff: BotDifficulty) {
    setDifficulties(prev => prev.map((d, i) => (i === index ? diff : d)));
  }

  function handleStart() {
    const bots: Bot313Config[] = Array.from({ length: botCount }, (_, i) => ({
      name: BOT_NAMES[i],
      difficulty: difficulties[i],
    }));
    onStart(bots);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm font-semibold mb-8 transition-colors hover:opacity-70"
          style={{ color: 'var(--color-primary-text)' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
            style={{ backgroundColor: '#0369a1' }}
          >
            3·13
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-heading)' }}>
            3-13
          </h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--color-body)' }}>
          11 rounds with changing wild cards — 3s up to Kings. Form melds, knock when you're out, keep your penalty low.
        </p>

        <div
          className="rounded-2xl border p-6 flex flex-col gap-6"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--color-heading)' }}>Bot Opponents</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setBotCount(c => Math.max(1, c - 1))}
                disabled={botCount <= 1}
                className="w-9 h-9 rounded-xl border-2 flex items-center justify-center font-bold transition-all hover:opacity-80 active:scale-95 disabled:opacity-30"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-heading)' }}
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-black w-8 text-center" style={{ color: 'var(--color-heading)' }}>
                {botCount}
              </span>
              <button
                onClick={() => setBotCount(c => Math.min(3, c + 1))}
                disabled={botCount >= 3}
                className="w-9 h-9 rounded-xl border-2 flex items-center justify-center font-bold transition-all hover:opacity-80 active:scale-95 disabled:opacity-30"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-heading)' }}
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-body)', opacity: 0.6 }}>
              {botCount + 1} players total
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {Array.from({ length: botCount }, (_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold w-16" style={{ color: 'var(--color-body)' }}>
                  {BOT_NAMES[i]}
                </span>
                <div className="flex gap-1.5">
                  {DIFFICULTIES.map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(i, diff)}
                      className={[
                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        difficulties[i] === diff
                          ? 'text-white shadow-sm'
                          : 'text-gray-500 bg-gray-100 hover:bg-gray-200',
                      ].join(' ')}
                      style={difficulties[i] === diff ? { backgroundColor: 'var(--color-primary)' } : {}}
                    >
                      {DIFFICULTY_LABELS[diff]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {hasSavedGame && onResume && (
            <button
              onClick={onResume}
              className="w-full py-3.5 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-95 shadow-sm flex items-center justify-center gap-2 border-2"
              style={{ borderColor: '#0369a1', color: '#0369a1', backgroundColor: 'var(--color-primary-light)' }}
            >
              <PlayCircle size={18} />
              Resume Saved Game
            </button>
          )}

          <button
            onClick={handleStart}
            className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95 shadow-sm"
            style={{ backgroundColor: '#0369a1' }}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
