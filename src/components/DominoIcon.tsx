import React from 'react';

interface DominoIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export default function DominoIcon({ size = 24, className = '', strokeWidth = 1.5, style }: DominoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <rect x="3" y="2" width="18" height="20" rx="2.5" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="8" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
