import { DECK_COLORS } from './CardBack';
import CardBack from './CardBack';

interface DeckColorPickerProps {
  selectedColor: string;
  onChange: (colorId: string) => void;
}

export default function DeckColorPicker({ selectedColor, onChange }: DeckColorPickerProps) {
  const selected = DECK_COLORS.find(c => c.id === selectedColor) ?? DECK_COLORS[0];

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deck Color</p>
      <div className="flex items-center gap-3 mb-2">
        <CardBack width={28} height={40} color={selected.hex} />
        <span className="text-sm font-semibold text-gray-700">{selected.name}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {DECK_COLORS.map(c => (
          <button
            key={c.id}
            title={c.name}
            onClick={() => onChange(c.id)}
            className="rounded-lg transition-all"
            style={{
              height: '28px',
              backgroundColor: c.hex,
              outline: selectedColor === c.id ? '2px solid #fff' : 'none',
              boxShadow: selectedColor === c.id ? `0 0 0 3px ${c.hex}` : '0 1px 3px rgba(0,0,0,0.3)',
              transform: selectedColor === c.id ? 'scale(1.1)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
