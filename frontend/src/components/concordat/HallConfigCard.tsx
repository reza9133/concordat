// ============================================================
// HallConfigCard — displays ConcordatHall configuration
// ============================================================

import { Users, Crown, Clock, Shield, AlertTriangle, XOctagon, FileX } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { ContractAddress } from '../ui/ContractAddress';
import { formatSeconds, truncateAddress } from '../../lib/genlayer';
import type { HallConfig } from '../../types';

interface HallConfigCardProps {
  config: HallConfig;
}

function ConfigItem({
  icon: Icon,
  label,
  value,
  description,
  color = 'text-text-secondary',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  description?: string;
  color?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-text-secondary">{label}</span>
          <span className="text-sm font-semibold text-text-primary flex-shrink-0">{value}</span>
        </div>
        {description && (
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

export function HallConfigCard({ config }: HallConfigCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">{config.community}</h2>
            <p className="text-sm text-text-secondary">ConcordatHall</p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="divide-y-0">
          <ConfigItem
            icon={Crown}
            label="Owner / Admin"
            value={truncateAddress(config.owner, 5)}
            color="text-accent"
          />
          <ConfigItem
            icon={AlertTriangle}
            label="Probation Threshold"
            value={`${config.probation_points} pts`}
            description="Members exceeding this are placed on probation"
            color="text-amber-600"
          />
          <ConfigItem
            icon={XOctagon}
            label="Suspension Threshold"
            value={`${config.suspension_points} pts`}
            description="Members exceeding this are suspended"
            color="text-danger"
          />
          <ConfigItem
            icon={FileX}
            label="Max Dismissed Complaints"
            value={`${config.max_dismissed_complaints}`}
            description="Dismissed cases before complainant is penalized"
            color="text-text-secondary"
          />
          <ConfigItem
            icon={Clock}
            label="Defense Window"
            value={formatSeconds(config.defense_window_seconds)}
            description="Time given to accused to submit a defense"
            color="text-blue-500"
          />
          <ConfigItem
            icon={Shield}
            label="Appeal Window"
            value={formatSeconds(config.appeal_window_seconds)}
            description="Time given to appeal a ruling"
            color="text-primary"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <ContractAddress label="Contract:" address={config.owner} size="sm" />
        </div>
      </CardBody>
    </Card>
  );
}
