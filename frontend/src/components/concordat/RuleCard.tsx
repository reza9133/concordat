// ============================================================
// RuleCard — displays a rule from the rulebook
// ============================================================

import { motion } from 'framer-motion';
import { Hash, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Rule } from '../../types';

interface RuleCardProps {
  rule: Rule;
  index?: number;
  isOwner?: boolean;
  onRetire?: (ruleNumber: number) => void;
  isRetiring?: boolean;
}

export function RuleCard({
  rule,
  index = 0,
  isOwner = false,
  onRetire,
  isRetiring = false,
}: RuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={`bg-white rounded-2xl border p-5 transition-all duration-200 ${
        rule.active
          ? 'border-border hover:border-primary/30 hover:shadow-card'
          : 'border-border opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
            rule.active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
          }`}>
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-text-secondary">Rule {rule.number}</span>
              <Badge variant={rule.active ? 'active' : 'retired'} size="sm">
                {rule.active ? 'Active' : 'Retired'}
              </Badge>
            </div>
            <h3 className="text-base font-semibold text-text-primary leading-tight mt-0.5">
              {rule.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Rule text */}
      <p className="text-sm text-text-secondary leading-relaxed pl-11">
        {rule.text}
      </p>

      {/* Owner actions */}
      {isOwner && rule.active && onRetire && (
        <div className="mt-4 pl-11">
          <Button
            variant="ghost"
            size="sm"
            isLoading={isRetiring}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => onRetire(rule.number)}
            className="text-danger hover:text-danger hover:bg-danger/5"
          >
            Retire Rule
          </Button>
        </div>
      )}
    </motion.div>
  );
}
