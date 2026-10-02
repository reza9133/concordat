// ============================================================
// LoadingSpinner — multiple variants and sizes
// ============================================================

interface LoadingSpinnerProps {
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'secondary';
  className?: string;
  width?: string;
  height?: string;
}

const SIZE_MAP = {
  sm: { spinner: 'w-4 h-4', dot: 'w-1.5 h-1.5', pulse: 'w-6 h-6' },
  md: { spinner: 'w-8 h-8', dot: 'w-2 h-2', pulse: 'w-10 h-10' },
  lg: { spinner: 'w-12 h-12', dot: 'w-3 h-3', pulse: 'w-16 h-16' },
};

const COLOR_MAP = {
  primary: { border: 'border-primary', bg: 'bg-primary/20', dot: 'bg-primary' },
  white: { border: 'border-white', bg: 'bg-white/20', dot: 'bg-white' },
  secondary: { border: 'border-secondary', bg: 'bg-secondary/20', dot: 'bg-secondary' },
};

export function LoadingSpinner({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  className = '',
  width,
  height,
}: LoadingSpinnerProps) {
  const sizes = SIZE_MAP[size];
  const colors = COLOR_MAP[color];

  if (variant === 'spinner') {
    return (
      <div
        className={`${sizes.spinner} border-2 ${colors.border} border-t-transparent rounded-full animate-spin ${className}`}
        role="status"
        aria-label="Loading"
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex items-center gap-1 ${className}`} role="status" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`${sizes.dot} ${colors.dot} rounded-full`}
            style={{
              animation: 'bounceDot 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={`${sizes.pulse} ${colors.bg} rounded-full animate-pulse ${className}`}
        role="status"
        aria-label="Loading"
      />
    );
  }

  // skeleton
  return (
    <div
      className={`skeleton rounded-lg ${className}`}
      style={{ width: width || '100%', height: height || '1rem' }}
      role="status"
      aria-label="Loading"
    />
  );
}

/** A full skeleton card placeholder */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-border ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <LoadingSpinner variant="skeleton" height="1.25rem" width="60%" />
        <LoadingSpinner variant="skeleton" height="1.5rem" width="5rem" />
      </div>
      <LoadingSpinner variant="skeleton" height="1rem" className="mb-2" />
      <LoadingSpinner variant="skeleton" height="1rem" width="80%" className="mb-4" />
      <LoadingSpinner variant="skeleton" height="2.25rem" />
    </div>
  );
}
