// ============================================================
// StandingBadge — visual standing indicator with icon
// ============================================================

import { ShieldCheck, AlertTriangle, XOctagon } from 'lucide-react';
import type { Standing } from '../../types';

interface StandingBadgeProps {
  standing: Standing;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
}

const STANDING_CONFIG = {
  good: {
    icon: ShieldCheck,
    label: 'Good Standing',
    bg: 'bg-secondary/10',
    border: 'border-secondary/30',
    text: 'text-secondary',
    bar: 'bg-secondary',
    description: 'This member is in good standing with the community.',
  },
  probation: {
    icon: AlertTriangle,
    label: 'Probation',
    bg: 'bg-accent/10',
    border: 'border-accent/30',
    text: 'text-amber-700',
    bar: 'bg-accent',
    description: 'This member is on probation. Further violations may result in suspension.',
  },
  suspended: {
    icon: XOctagon,
    label: 'Suspended',
    bg: 'bg-danger/10',
    border: 'border-danger/30',
    text: 'text-danger',
    bar: 'bg-danger',
    description: 'This member has been suspended from the community.',
  },
};

const SIZE_CONFIG = {
  sm: { icon: 'w-4 h-4', text: 'text-sm', container: 'px-3 py-1.5 gap-1.5' },
  md: { icon: 'w-5 h-5', text: 'text-base', container: 'px-4 py-2 gap-2' },
  lg: { icon: 'w-6 h-6', text: 'text-lg', container: 'px-5 py-2.5 gap-2.5' },
};

export function StandingBadge({
  standing,
  size = 'md',
  showPoints = false,
}: StandingBadgeProps) {
  const config = STANDING_CONFIG[standing.status] ?? STANDING_CONFIG.good;
  const sizeConf = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <div
        className={`
          inline-flex items-center rounded-2xl border font-semibold
          ${config.bg} ${config.border} ${config.text}
          ${sizeConf.container} ${sizeConf.text}
        `}
      >
        <Icon className={`${sizeConf.icon} flex-shrink-0`} />
        <span>{config.label}</span>
        {showPoints && (
          <span className="ml-1 opacity-70 font-normal text-sm">
            ({standing.points} pts)
          </span>
        )}
      </div>

      {showPoints && (
        <p className="text-sm text-text-secondary">{config.description}</p>
      )}
    </div>
  );
}

/** Points meter with progress bar */
export function PointsMeter({
  points,
  probationThreshold,
  suspensionThreshold,
}: {
  points: number;
  probationThreshold: number;
  suspensionThreshold: number;
}) {
  const percentage = Math.min(100, (points / suspensionThreshold) * 100);
  const probationPercentage = (probationThreshold / suspensionThreshold) * 100;

  let barColor = 'bg-secondary';
  if (points >= suspensionThreshold) barColor = 'bg-danger';
  else if (points >= probationThreshold) barColor = 'bg-accent';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary font-medium">Penalty Points</span>
        <span className="font-bold text-text-primary">{points}</span>
      </div>
      <div className="relative h-3 bg-background rounded-full overflow-hidden border border-border">
        {/* Probation threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-accent/60 z-10"
          style={{ left: `${probationPercentage}%` }}
          title={`Probation at ${probationThreshold} pts`}
        />
        {/* Progress bar */}
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-secondary">
        <span>0</span>
        <span title="Probation threshold">⚠ {probationThreshold}</span>
        <span title="Suspension threshold">⛔ {suspensionThreshold}</span>
      </div>
    </div>
  );
}
