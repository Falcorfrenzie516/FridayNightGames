import { useState } from 'react';
import { Bot, ChevronLeft, Dice5, PlayCircle } from 'lucide-react';
import { BotConfig } from './DiceGame';

interface SoloSetupProps {
  onStart: (bots: BotConfig[]) => void;
  onCancel: () => void;
  hasSavedGame?: boolean;
  onResume?: () => void;
}

const BOT_NAMES = ['Rattlesnake', 'Tombstone', 'Coyote', 'Viper'];

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Banks early, busts often',
  medium: 'Balanced risk-taker',
  hard: 'Aggressive high scorer',
};

export default function SoloSetup({ onStart, onCancel, hasSavedGame, onResume }: SoloSetupProps) {
  const [numBots, setNumBots] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const bots: BotConfig[] = Array.from({ length: numBots }, (_, i) => ({
    name: BOT_NAMES[i] ?? `Bot ${i + 1}`,
    difficulty,
  }));

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        <div className="rounded-3xl shadow-2xl p-8" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onCancel}
              className="flex items-center gap-1 text-xs transition font-medium"
              style={{ color: 'var(--color-muted)' }}
            >
              <ChevronLeft size={14} />
              Games
            </button>
            <h1 className="text-5xl" style={{ fontFamily: "'Bone', sans-serif", letterSpacing: '0.05em', color: 'var(--color-heading)' }}>BONES</h1>
            <div className="w-16" />
          </div>

          <p className="text-center text-sm mb-8" style={{ color: 'var(--color-muted)' }}>Choose your game mode</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-body)' }}>Bot Opponents</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setNumBots(n)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm transition"
                    style={numBots === n ? { backgroundColor: 'var(--color-primary)', color: 'white' } : { backgroundColor: 'var(--color-primary-light)', color: 'var(--color-body)' }}
                  >
                    {n === 0 ? 'None' : n}
                  </button>
                ))}
              </div>
              {numBots === 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>Pure solo — just you vs. yourself</p>
              )}
              {numBots > 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                  {bots.map(b => b.name).join(', ')}
                </p>
              )}
            </div>

            {numBots > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-body)' }}>Bot Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                        difficulty === d
                          ? d === 'easy' ? 'bg-emerald-500 text-white shadow-md'
                            : d === 'hard' ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-amber-500 text-white shadow-md'
                          : ''
                      }`}
                      style={difficulty !== d ? { backgroundColor: 'var(--color-primary-light)', color: 'var(--color-body)' } : {}}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>{DIFFICULTY_LABELS[difficulty]}</p>
              </div>
            )}

            {hasSavedGame && onResume && (
              <button
                onClick={onResume}
                className="w-full py-4 font-bold rounded-xl transition text-lg shadow-lg flex items-center justify-center gap-3 border-2"
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)' }}
              >
                <PlayCircle className="w-5 h-5" />
                Resume Saved Game
              </button>
            )}

            <button
              onClick={() => onStart(bots)}
              className="w-full py-4 text-white font-bold rounded-xl transition text-lg shadow-lg flex items-center justify-center gap-3"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {numBots === 0 ? <Dice5 className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              {numBots === 0 ? 'New Game' : `New vs ${numBots} Bot${numBots > 1 ? 's' : ''}`}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
