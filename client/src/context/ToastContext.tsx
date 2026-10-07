import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type ToastTone = 'success' | 'error' | 'info' | 'gold';
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface ToastOptions {
  tone?: 'success' | 'error' | 'info' | 'danger' | 'neutral' | 'gold' | 'brand';
  title: string;
  message?: string;
  description?: string;
}

export interface ToastContextValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  gold: (title: string, description?: string) => void;
  showToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, gold: CheckCircle2 };
const ICON_COLORS = {
  success: 'text-gold-400',
  error: 'text-red-400',
  info: 'text-gold-400',
  gold: 'text-gold-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const showToast = useCallback(
    (opts: ToastOptions) => {
      const tone: ToastTone =
        opts.tone === 'gold' || opts.tone === 'brand'
          ? 'gold'
          : opts.tone === 'danger' || opts.tone === 'error'
          ? 'error'
          : opts.tone === 'success'
          ? 'success'
          : 'info';
      push(tone, opts.title, opts.message ?? opts.description);
    },
    [push],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
      gold: (t, d) => push('gold', t, d),
      showToast,
    }),
    [push, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:items-end"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          const isError = t.tone === 'error';

          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl p-3.5 shadow-2xl backdrop-blur-md transition-all',
                isError
                  ? 'border border-red-500/50 bg-ink-950 ring-1 ring-red-500/25 text-white shadow-red-950/25'
                  : 'border border-gold-500/50 bg-ink-950 ring-1 ring-gold-500/25 text-white shadow-ink-950/60',
              )}
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', ICON_COLORS[t.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={cn('font-semibold text-sm tracking-tight', isError ? 'text-red-300' : 'text-gold-400')}>
                  {t.title}
                </p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className={cn(
                  'rounded-md p-0.5 transition-colors',
                  isError ? 'text-zinc-400 hover:text-red-300' : 'text-zinc-400 hover:text-gold-300',
                )}
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
