// ============================================================
// Toast — animated toast notifications with progress bar
// ============================================================

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast as ToastType } from '../../types';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const TOAST_STYLES = {
  success: {
    container: 'border-secondary/30 bg-white',
    icon: <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />,
    progress: 'bg-secondary',
    title: 'text-text-primary',
  },
  error: {
    container: 'border-danger/30 bg-white',
    icon: <XCircle className="w-5 h-5 text-danger flex-shrink-0" />,
    progress: 'bg-danger',
    title: 'text-text-primary',
  },
  warning: {
    container: 'border-accent/30 bg-white',
    icon: <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0" />,
    progress: 'bg-accent',
    title: 'text-text-primary',
  },
  info: {
    container: 'border-primary/30 bg-white',
    icon: <Info className="w-5 h-5 text-primary flex-shrink-0" />,
    progress: 'bg-primary',
    title: 'text-text-primary',
  },
};

function ToastItem({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const styles = TOAST_STYLES[toast.type];
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    if (duration <= 0) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        relative w-80 rounded-xl border shadow-card overflow-hidden
        ${styles.container}
      `}
    >
      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-border">
          <div
            className={`h-full transition-none ${styles.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3 p-4 pt-5">
        {styles.icon}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${styles.title}`}>{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-0.5 rounded hover:bg-background text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/** Toast container — renders all active toasts */
export function ToastContainer({ toasts, onDismiss }: { toasts: ToastType[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
