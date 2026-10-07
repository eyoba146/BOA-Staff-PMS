import { X } from 'lucide-react';
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /**
   * `any`: Esc + backdrop click close (informational dialogs).
   * `closerequest`: Esc only — protects form input from accidental backdrop clicks.
   */
  closedBy?: 'any' | 'closerequest';
  /** Prevent closing while an action is in progress. */
  busy?: boolean;
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/**
 * Modal built on native <dialog> + showModal(): top layer, focus trap and Esc handling come from
 * the platform. Backdrop light-dismiss is implemented in JS (the `closedby` attribute is not yet
 * supported in Safari, and React state must stay the source of truth).
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', closedBy = 'closerequest', busy }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const requestClose = () => {
    if (!busy) onClose();
  };

  const onBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (closedBy !== 'any' || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    const inside = r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right;
    if (!inside) requestClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={onBackdropClick}
      className={cn(
        'w-full max-w-none overflow-hidden border border-zinc-200 bg-white p-0 shadow-xl',
        'max-sm:mt-auto max-sm:mb-0 max-sm:max-h-[92dvh] max-sm:rounded-t-xl',
        'sm:m-auto sm:max-h-[88dvh] sm:rounded-lg',
        SIZES[size],
      )}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold text-zinc-900">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-[13px] text-zinc-500">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={busy}
              className="-mt-1 -mr-1 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
