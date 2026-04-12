import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'error' | 'warning' | 'success';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  body?: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const borderColorMap: Record<ToastType, string> = {
  error: 'border-l-accent-danger',
  warning: 'border-l-accent-warn',
  success: 'border-l-accent-success',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`max-w-[360px] bg-bg-elevated border border-border-subtle border-l-[3px] ${borderColorMap[toast.type]} rounded-[8px] shadow-modal py-3 px-4 animate-toast-in`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm text-text-primary">{toast.title}</p>
          {toast.body && (
            <p className="font-body text-sm text-text-secondary mt-1">{toast.body}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
