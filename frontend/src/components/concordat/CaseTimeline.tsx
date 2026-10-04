// ============================================================
// CaseTimeline — visual lifecycle progression
// ============================================================

import { motion } from 'framer-motion';
import { FileText, Gavel, Scale, CheckCircle } from 'lucide-react';

type CaseStatusValue = 'open' | 'ruled' | 'under_appeal' | 'final';

interface CaseTimelineProps {
  currentStatus: CaseStatusValue;
  /**
   * Whether the case ever reached a first-instance ruling. A case that was
   * withdrawn or expired unruled goes from "open" straight to "final".
   */
  wasRuled?: boolean;
  /** Whether an appeal was ever filed (it stays true after an abandoned appeal). */
  wasAppealed?: boolean;
}

const STAGES = [
  {
    key: 'open' as CaseStatusValue,
    label: 'Open',
    description: 'Case filed, awaiting defense and ruling',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    activeBorder: 'border-blue-500',
  },
  {
    key: 'ruled' as CaseStatusValue,
    label: 'Ruled',
    description: 'AI consensus ruling has been issued',
    icon: Gavel,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    activeBorder: 'border-primary',
  },
  {
    key: 'under_appeal' as CaseStatusValue,
    label: 'Under Appeal',
    description: 'Ruling is being appealed by losing party',
    icon: Scale,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    activeBorder: 'border-orange-500',
  },
  {
    key: 'final' as CaseStatusValue,
    label: 'Final',
    description: 'Case is closed and outcome is recorded',
    icon: CheckCircle,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary/30',
    activeBorder: 'border-secondary',
  },
];

const STATUS_ORDER: CaseStatusValue[] = ['open', 'ruled', 'under_appeal', 'final'];

function getStageState(
  stageKey: CaseStatusValue,
  currentStatus: CaseStatusValue,
  wasRuled: boolean,
  wasAppealed: boolean,
) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stageIdx = STATUS_ORDER.indexOf(stageKey);

  // A stage the case never went through is "skipped", not "completed":
  // - no appeal was filed (still open/ruled, or finalized without an appeal)
  // - no ruling was issued (withdrawn or expired while open)
  if (stageKey === 'under_appeal' && currentStatus !== 'under_appeal' && !wasAppealed) {
    return 'skipped';
  }
  if (stageKey === 'ruled' && currentStatus === 'final' && !wasRuled) {
    return 'skipped';
  }

  if (stageIdx < currentIdx) return 'completed';
  if (stageIdx === currentIdx) return 'active';
  return 'pending';
}

export function CaseTimeline({ currentStatus, wasRuled = true, wasAppealed = false }: CaseTimelineProps) {
  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute top-6 left-6 right-6 h-0.5 bg-border hidden sm:block" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2 relative">
        {STAGES.map((stage, idx) => {
          const state = getStageState(stage.key, currentStatus, wasRuled, wasAppealed);
          const Icon = stage.icon;
          const isActive = state === 'active';
          const isCompleted = state === 'completed';

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.35 }}
              className="flex flex-col items-center text-center gap-2"
            >
              {/* Icon circle */}
              <div
                className={`
                  relative w-12 h-12 rounded-full border-2 flex items-center justify-center z-10
                  transition-all duration-500
                  ${isActive
                    ? `${stage.bg} ${stage.activeBorder} shadow-lg`
                    : isCompleted
                    ? 'bg-primary/10 border-primary'
                    : state === 'skipped'
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-border'
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    className={`absolute inset-0 rounded-full ${stage.bg} opacity-50`}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? stage.color
                      : isCompleted
                      ? 'text-primary'
                      : 'text-text-secondary/40'
                  }`}
                />
              </div>

              {/* Label */}
              <div>
                <p
                  className={`text-xs font-semibold ${
                    isActive ? stage.color : isCompleted ? 'text-primary' : 'text-text-secondary/50'
                  }`}
                >
                  {stage.label}
                </p>
                {isActive && (
                  <p className="text-xs text-text-secondary mt-0.5 leading-tight">
                    {stage.description}
                  </p>
                )}
                {state === 'skipped' && (
                  <p className="text-xs text-text-secondary/60 mt-0.5 leading-tight">
                    Skipped
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
