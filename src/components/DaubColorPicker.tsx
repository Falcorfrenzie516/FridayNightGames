export interface DaubColor {
  id: string;
  name: string;
  hex: string;
  ghostHex: string;
}

export const DAUB_COLORS: DaubColor[] = [
  { id: 'blue',   name: 'Blue',   hex: '#1e40af', ghostHex: 'rgba(30,64,175,0.18)' },
  { id: 'red',    name: 'Red',    hex: '#b91c1c', ghostHex: 'rgba(185,28,28,0.18)' },
  { id: 'green',  name: 'Green',  hex: '#15803d', ghostHex: 'rgba(21,128,61,0.18)' },
  { id: 'orange', name: 'Orange', hex: '#c2410c', ghostHex: 'rgba(194,65,12,0.18)' },
  { id: 'pink',   name: 'Pink',   hex: '#be185d', ghostHex: 'rgba(190,24,93,0.18)' },
  { id: 'purple', name: 'Purple', hex: '#7c3aed', ghostHex: 'rgba(124,58,237,0.18)' },
  { id: 'cyan',   name: 'Cyan',   hex: '#0e7490', ghostHex: 'rgba(14,116,144,0.18)' },
  { id: 'yellow', name: 'Yellow', hex: '#a16207', ghostHex: 'rgba(161,98,7,0.18)' },
  { id: 'teal',   name: 'Teal',   hex: '#0f766e', ghostHex: 'rgba(15,118,110,0.18)' },
  { id: 'black',  name: 'Black',  hex: '#1a1a1a', ghostHex: 'rgba(26,26,26,0.18)' },
];

export const DEFAULT_DAUB_COLOR = 'blue';

export function getDaubColor(id: string): DaubColor {
  return DAUB_COLORS.find(c => c.id === id) ?? DAUB_COLORS[0];
}

interface DaubColorPickerProps {
  selectedColor: string;
  onChange: (colorId: string) => void;
}

export default function DaubColorPicker({ selectedColor, onChange }: DaubColorPickerProps) {
  const selected = getDaubColor(selectedColor);

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Daub Color</p>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="rounded-full flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            backgroundColor: selected.hex,
            boxShadow: `0 2px 8px ${selected.hex}99`,
          }}
        />
        <span className="text-sm font-semibold text-gray-700">{selected.name}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {DAUB_COLORS.map(c => (
          <button
            key={c.id}
            title={c.name}
            onClick={() => onChange(c.id)}
            className="rounded-full transition-all"
            style={{
              height: '28px',
              width: '28px',
              backgroundColor: c.hex,
              outline: selectedColor === c.id ? '2px solid #fff' : 'none',
              boxShadow: selectedColor === c.id ? `0 0 0 3px ${c.hex}` : '0 1px 3px rgba(0,0,0,0.3)',
              transform: selectedColor === c.id ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
