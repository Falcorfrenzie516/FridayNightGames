interface CardBackProps {
  width: number;
  height: number;
  className?: string;
  color?: string;
}

export const DECK_COLORS = [
  { id: 'blue',   name: 'Blue',   hex: '#1a3bbf' },
  { id: 'black',  name: 'Black',  hex: '#1a1a1a' },
  { id: 'red',    name: 'Red',    hex: '#b91c1c' },
  { id: 'green',  name: 'Green',  hex: '#15803d' },
  { id: 'purple', name: 'Purple', hex: '#7c3aed' },
  { id: 'cyan',   name: 'Cyan',   hex: '#0e7490' },
  { id: 'orange', name: 'Orange', hex: '#c2410c' },
  { id: 'pink',   name: 'Pink',   hex: '#be185d' },
  { id: 'yellow', name: 'Yellow', hex: '#a16207' },
  { id: 'teal',   name: 'Teal',   hex: '#0f766e' },
];

export const DEFAULT_DECK_COLOR = 'blue';

export function getDeckColor(id: string): string {
  return DECK_COLORS.find(c => c.id === id)?.hex ?? DECK_COLORS[0].hex;
}

export default function CardBack({ width, height, className = '', color = '#1a3bbf' }: CardBackProps) {
  const patternId = `cb-tile-${color.replace('#', '')}`;
  return (
    <div
      style={{ width, height, background: color }}
      className={`rounded-lg border-2 border-white/20 flex-shrink-0 overflow-hidden relative ${className}`}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 96" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={patternId} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill={color} />
            <circle cx="6" cy="6" r="1.2" fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.25" />
            <line x1="0" y1="6" x2="12" y2="6" stroke="#ffffff" strokeWidth="0.2" opacity="0.12" />
            <line x1="6" y1="0" x2="6" y2="12" stroke="#ffffff" strokeWidth="0.2" opacity="0.12" />
          </pattern>
        </defs>

        <rect width="64" height="96" fill={color} />
        <rect width="64" height="96" fill={`url(#${patternId})`} />

        <rect x="2.5" y="2.5" width="59" height="91" rx="2.5" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
        <rect x="4.5" y="4.5" width="55" height="87" rx="2" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" />

        <g opacity="0.85" fill="none" stroke="#ffffff" strokeWidth="0.7">
          <path d="M8,8 Q12,5 16,8 Q20,11 24,8 Q28,5 32,8 Q36,5 40,8 Q44,11 48,8 Q52,5 56,8" />
          <path d="M8,88 Q12,91 16,88 Q20,85 24,88 Q28,91 32,88 Q36,91 40,88 Q44,85 48,88 Q52,91 56,88" />
          <path d="M8,8 Q5,14 8,20 Q11,26 8,32 Q5,38 8,44 Q5,50 8,56 Q11,62 8,68 Q5,74 8,80 Q11,86 8,88" />
          <path d="M56,8 Q59,14 56,20 Q53,26 56,32 Q59,38 56,44 Q59,50 56,56 Q53,62 56,68 Q59,74 56,80 Q53,86 56,88" />
        </g>

        <g transform="translate(32,48)" opacity="0.9">
          <circle cx="0" cy="0" r="14" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="11" fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.6" />

          <g fill="#ffffff" opacity="0.85">
            <ellipse cx="0" cy="-9" rx="2.5" ry="4" />
            <ellipse cx="0" cy="9" rx="2.5" ry="4" />
            <ellipse cx="-9" cy="0" rx="4" ry="2.5" />
            <ellipse cx="9" cy="0" rx="4" ry="2.5" />
            <ellipse cx="-6.5" cy="-6.5" rx="1.8" ry="3" transform="rotate(-45 -6.5 -6.5)" />
            <ellipse cx="6.5" cy="-6.5" rx="1.8" ry="3" transform="rotate(45 6.5 -6.5)" />
            <ellipse cx="-6.5" cy="6.5" rx="1.8" ry="3" transform="rotate(45 -6.5 6.5)" />
            <ellipse cx="6.5" cy="6.5" rx="1.8" ry="3" transform="rotate(-45 6.5 6.5)" />
          </g>

          <rect x="-3" y="-3" width="6" height="6" rx="1" fill={color} stroke="#ffffff" strokeWidth="0.7" />
          <rect x="-1.5" y="-1.5" width="3" height="3" rx="0.5" fill="#ffffff" opacity="0.9" />
        </g>

        <g opacity="0.7" fill="#ffffff">
          <path d="M14,20 C14,17 11,15 11,18 C11,21 14,22 14,22 C14,22 17,21 17,18 C17,15 14,17 14,20Z" />
          <path d="M50,20 C50,17 47,15 47,18 C47,21 50,22 50,22 C50,22 53,21 53,18 C53,15 50,17 50,20Z" />
          <path d="M14,76 C14,73 11,71 11,74 C11,77 14,78 14,78 C14,78 17,77 17,74 C17,71 14,73 14,76Z" />
          <path d="M50,76 C50,73 47,71 47,74 C47,77 50,78 50,78 C50,78 53,77 53,74 C53,71 50,73 50,76Z" />
        </g>

        <g opacity="0.6" fill="none" stroke="#ffffff" strokeWidth="0.5">
          <path d="M8,30 Q14,26 20,30 Q26,34 32,30 Q38,26 44,30 Q50,34 56,30" />
          <path d="M8,66 Q14,62 20,66 Q26,70 32,66 Q38,62 44,66 Q50,70 56,66" />
          <path d="M22,8 Q26,15 22,22 Q18,29 22,36" />
          <path d="M42,8 Q38,15 42,22 Q46,29 42,36" />
          <path d="M22,60 Q26,67 22,74 Q18,81 22,88" />
          <path d="M42,60 Q38,67 42,74 Q46,81 42,88" />
        </g>

        <g opacity="0.5" fill="#ffffff">
          <circle cx="10" cy="48" r="1.2" />
          <circle cx="54" cy="48" r="1.2" />
          <circle cx="32" cy="10" r="1.2" />
          <circle cx="32" cy="86" r="1.2" />
          <circle cx="10" cy="28" r="0.8" />
          <circle cx="54" cy="28" r="0.8" />
          <circle cx="10" cy="68" r="0.8" />
          <circle cx="54" cy="68" r="0.8" />
        </g>
      </svg>
    </div>
  );
}
