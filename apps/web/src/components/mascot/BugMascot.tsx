import React from 'react';

export type BugMascotState =
  | 'idle'
  | 'happy'
  | 'thinking'
  | 'sleeping'
  | 'confused'
  | 'working'
  | 'error'
  | 'party';

interface BugMascotProps {
  state?: BugMascotState;
  size?: number;
  className?: string;
  interactive?: boolean;
}

export const BugMascot: React.FC<BugMascotProps> = ({
  state = 'idle',
  size = 36,
  className = '',
  interactive = false,
}) => {
  // Bug Mascot Vector Illustration
  return (
    <div
      className={`inline-flex items-center justify-center select-none ${interactive ? 'hover:scale-110 active:scale-95 transition-transform duration-200 cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
      title={`ForgeTrack Bug (${state})`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Antennae */}
        <path
          d={state === 'thinking' ? 'M35 32 Q25 15 15 22' : 'M35 30 Q28 12 20 18'}
          stroke="#1c1917"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx={state === 'thinking' ? '15' : '20'} cy={state === 'thinking' ? '22' : '18'} r="4" fill="#ff6b57" />

        <path
          d={state === 'confused' ? 'M65 32 Q75 18 85 24' : 'M65 30 Q72 12 80 18'}
          stroke="#1c1917"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx={state === 'confused' ? '85' : '80'} cy={state === 'confused' ? '24' : '18'} r="4" fill="#ccee22" />

        {/* Legs */}
        <path d="M22 45 Q10 45 6 52" stroke="#1c1917" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 60 Q8 62 4 72" stroke="#1c1917" strokeWidth="4" strokeLinecap="round" />
        <path d="M78 45 Q90 45 94 52" stroke="#1c1917" strokeWidth="4" strokeLinecap="round" />
        <path d="M80 60 Q92 62 96 72" stroke="#1c1917" strokeWidth="4" strokeLinecap="round" />

        {/* Body Shell */}
        <ellipse
          cx="50"
          cy="58"
          rx="32"
          ry="30"
          fill={state === 'error' ? '#ff6b57' : state === 'party' ? '#8b5cf6' : '#ff7a38'}
          stroke="#1c1917"
          strokeWidth="4"
        />

        {/* Wing Line & Dots */}
        <line x1="50" y1="36" x2="50" y2="86" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="34" cy="56" r="4.5" fill="#1c1917" />
        <circle cx="66" cy="56" r="4.5" fill="#1c1917" />
        <circle cx="38" cy="74" r="3.5" fill="#1c1917" />
        <circle cx="62" cy="74" r="3.5" fill="#1c1917" />

        {/* Head */}
        <ellipse cx="50" cy="34" rx="20" ry="16" fill="#ff7a38" stroke="#1c1917" strokeWidth="4" />

        {/* Eyes based on state */}
        {state === 'sleeping' ? (
          <>
            <path d="M38 34 Q43 38 48 34" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
            <path d="M52 34 Q57 38 62 34" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
            <text x="70" y="24" fontSize="12" fill="#8b5cf6" fontWeight="bold">zZ</text>
          </>
        ) : state === 'happy' || state === 'party' ? (
          <>
            <path d="M38 34 Q43 28 48 34" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M52 34 Q57 28 62 34" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="50" cy="40" rx="4" ry="3" fill="#1c1917" />
          </>
        ) : state === 'confused' ? (
          <>
            <circle cx="43" cy="33" r="4" fill="#1c1917" />
            <circle cx="58" cy="31" r="5" fill="#1c1917" />
            <path d="M44 42 Q50 38 56 42" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : state === 'error' ? (
          <>
            <path d="M40 30 L46 36 M46 30 L40 36" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
            <path d="M54 30 L60 36 M60 30 L54 36" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
            <path d="M43 43 Q50 38 57 43" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="42" cy="33" r="4" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
            <circle cx="43" cy="33" r="2" fill="#1c1917" />
            <circle cx="58" cy="33" r="4" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
            <circle cx="59" cy="33" r="2" fill="#1c1917" />
            <ellipse cx="50" cy="41" rx="3" ry="1.5" fill="#1c1917" />
          </>
        )}

        {/* Cheeks */}
        <ellipse cx="33" cy="38" rx="2.5" ry="1.5" fill="#ff4d6d" opacity="0.6" />
        <ellipse cx="67" cy="38" rx="2.5" ry="1.5" fill="#ff4d6d" opacity="0.6" />
      </svg>
    </div>
  );
};
