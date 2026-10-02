// ============================================================
// ConcordatLogo — custom SVG logo (gavel + scales of justice)
// ============================================================

interface ConcordatLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function ConcordatLogo({ size = 32, showText = true, className = '' }: ConcordatLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <circle cx="24" cy="24" r="24" fill="url(#logo-gradient)" />

        {/* Gavel head */}
        <rect
          x="10"
          y="12"
          width="18"
          height="8"
          rx="2"
          fill="white"
          fillOpacity="0.95"
        />
        {/* Gavel handle */}
        <rect
          x="24"
          y="16"
          width="14"
          height="3.5"
          rx="1.75"
          transform="rotate(45 24 16)"
          fill="white"
          fillOpacity="0.8"
        />

        {/* Scales beam */}
        <rect
          x="14"
          y="28"
          width="20"
          height="2"
          rx="1"
          fill="white"
          fillOpacity="0.9"
        />
        {/* Center post */}
        <rect
          x="23"
          y="22"
          width="2"
          height="8"
          rx="1"
          fill="white"
          fillOpacity="0.9"
        />

        {/* Left pan */}
        <path
          d="M14 30 L11 36 L17 36 Z"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeOpacity="0.9"
        />

        {/* Right pan */}
        <path
          d="M34 30 L31 36 L37 36 Z"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeOpacity="0.9"
        />

        {/* Left chain */}
        <line x1="14" y1="28" x2="14" y2="30" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
        {/* Right chain */}
        <line x1="34" y1="28" x2="34" y2="30" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6C47FF" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <span
          className="font-bold tracking-tight gradient-text"
          style={{ fontSize: size * 0.6, lineHeight: 1 }}
        >
          Concordat
        </span>
      )}
    </div>
  );
}
