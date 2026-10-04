// ============================================================
// CaseCard — card in the case list view
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, Clock, ArrowRight } from 'lucide-react';
import { Badge, statusToBadgeVariant, formatStatus } from '../ui/Badge';
import { truncateAddress, readCaseStatus } from '../../lib/genlayer';
import type { CaseStatus } from '../../types';

interface CaseCardProps {
  address: string;
  index?: number;
}

export function CaseCard({ address, index = 0 }: CaseCardProps) {
  const navigate = useNavigate();
  const [info, setInfo] = useState<CaseStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    readCaseStatus(address as `0x${string}`)
      .then((s) => { if (!cancelled) setInfo(s); })
      .catch(() => { /* keep the placeholder; the detail page reports errors */ });
    return () => { cancelled = true; };
  }, [address]);

  const badgeLabel = info
    ? info.decided_by === 'withdrawn' ? 'Withdrawn'
      : info.decided_by === 'expired_unruled' ? 'Expired'
      : formatStatus(info.status)
    : '…';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={() => navigate(`/cases/${address}`)}
      className="bg-white rounded-2xl border border-border p-5 cursor-pointer hover:border-primary/40 hover:shadow-card-hover transition-all duration-300 group"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Scale className="w-4.5 h-4.5 text-primary w-[18px] h-[18px]" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium">Case</p>
            <p className="text-sm font-mono font-medium text-text-primary">
              {truncateAddress(address, 5)}
            </p>
          </div>
        </div>
        <Badge variant={info ? statusToBadgeVariant(info.status) : 'default'} dot>
          {badgeLabel}
        </Badge>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Clock className="w-3.5 h-3.5" />
          <span>{info && info.opened_at > 0 ? `Filed ${new Date(info.opened_at * 1000).toLocaleDateString()}` : 'Loading…'}</span>
        </div>
        <p className="text-xs font-mono text-text-secondary truncate">
          {address}
        </p>
      </div>

      <div className="flex items-center justify-end">
        <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
          View Case
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.div>
  );
}
