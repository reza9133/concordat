// ============================================================
// Badge — status badges for cases, standings, rules
// ============================================================

import { ReactNode } from 'react';

type BadgeVariant =
  | 'good'
  | 'probation'
  | 'suspended'
  | 'open'
  | 'ruled'
  | 'under_appeal'
  | 'final'
  | 'active'
  | 'retired'
  | 'info'
  | 'default';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  good: 'bg-secondary/10 text-secondary border-secondary/20',
  probation: 'bg-accent/10 text-amber-700 border-accent/20',
  suspended: 'bg-danger/10 text-danger border-danger/20',
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  ruled: 'bg-primary/10 text-primary border-primary/20',
  under_appeal: 'bg-orange-50 text-orange-700 border-orange-200',
  final: 'bg-gray-100 text-gray-600 border-gray-200',
  active: 'bg-secondary/10 text-secondary border-secondary/20',
  retired: 'bg-gray-100 text-gray-500 border-gray-200',
  info: 'bg-blue-50 text-blue-600 border-blue-200',
  default: 'bg-background text-text-secondary border-border',
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  good: 'bg-secondary',
  probation: 'bg-accent',
  suspended: 'bg-danger',
  open: 'bg-blue-500',
  ruled: 'bg-primary',
  under_appeal: 'bg-orange-500',
  final: 'bg-gray-400',
  active: 'bg-secondary',
  retired: 'bg-gray-400',
  info: 'bg-blue-500',
  default: 'bg-text-secondary',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
};

export function Badge({
  variant = 'default',
  size = 'sm',
  children,
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${VARIANT_STYLES[variant]}
        ${SIZE_STYLES[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_COLORS[variant]}`} />
      )}
      {children}
    </span>
  );
}

/** Map a case status string to a badge variant */
export function statusToBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'open': return 'open';
    case 'ruled': return 'ruled';
    case 'under_appeal': return 'under_appeal';
    case 'final': return 'final';
    case 'good': return 'good';
    case 'probation': return 'probation';
    case 'suspended': return 'suspended';
    case 'active': return 'active';
    case 'retired': return 'retired';
    default: return 'default';
  }
}

/** Format status string for display */
export function formatStatus(status: string): string {
  switch (status) {
    case 'open': return 'Open';
    case 'ruled': return 'Ruled';
    case 'under_appeal': return 'Under Appeal';
    case 'final': return 'Final';
    case 'good': return 'Good Standing';
    case 'probation': return 'Probation';
    case 'suspended': return 'Suspended';
    default: return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
