'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Default 4000 ms. Pasar 0 = persistente hasta click. */
  duration?: number;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op silencioso para usos fuera del provider; mejor que crashear.
    return {
      push: (_k, msg) => console.warn('[toast no-provider]', msg),
      success: (msg) => console.info('[toast]', msg),
      error: (msg) => console.error('[toast]', msg),
      info: (msg) => console.info('[toast]', msg),
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, kind, message, duration }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  const value: ToastContextValue = {
    push,
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const styles: Record<ToastKind, { bg: string; border: string; text: string; Icon: typeof CheckCircle }> = {
    success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  Icon: CheckCircle },
    error:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    Icon: AlertCircle },
    info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   Icon: Info },
  };
  const s = styles[toast.kind];

  return (
    <div
      role="status"
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-200 ${s.bg} ${s.border} ${s.text} ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <s.Icon size={18} className="mt-0.5 flex-shrink-0" />
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="p-1 rounded hover:bg-black/10 flex-shrink-0"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
