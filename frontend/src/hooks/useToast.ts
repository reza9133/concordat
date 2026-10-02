// ============================================================
// useToast hook — toast notification management
// ============================================================

import { useState, useCallback } from 'react';
import type { Toast, ToastType } from '../types';

interface UseToastReturn {
  toasts: Toast[];
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  dismiss: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, message?: string) => toast('success', title, message),
    [toast]
  );
  const error = useCallback(
    (title: string, message?: string) => toast('error', title, message),
    [toast]
  );
  const warning = useCallback(
    (title: string, message?: string) => toast('warning', title, message),
    [toast]
  );
  const info = useCallback(
    (title: string, message?: string) => toast('info', title, message),
    [toast]
  );

  return { toasts, toast, dismiss, success, error, warning, info };
}
