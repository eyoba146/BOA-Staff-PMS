import { BarChart3, ClipboardCheck, MessageSquareText } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';

const CAPABILITIES = [
  { icon: ClipboardCheck, text: 'Record daily KPI achievements against assigned targets' },
  { icon: BarChart3, text: 'Review performance by day, week, month and quarter' },
  { icon: MessageSquareText, text: 'Receive feedback, announcements and branch messages' },
];

/** Thin-line geometric motif. Decorative only. */
function Pattern() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
      <defs>
        <pattern id="auth-diamonds" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M28 2 54 28 28 54 2 28Z" fill="none" stroke="#F5B82A" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-diamonds)" />
    </svg>
  );
}

interface AuthLayoutProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider form area (e.g. registration). */
  wide?: boolean;
}

/** Split-screen authentication layout. Brand panel collapses to a header strip below lg. */
export function AuthLayout({ title, description, children, footer, wide }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
      <aside className="on-dark relative overflow-hidden bg-ink-950 text-ink-300 lg:flex lg:w-[42%] lg:max-w-xl lg:flex-col lg:justify-between lg:p-12">
        <Pattern />
        <div className="relative flex items-center justify-between px-5 py-4 lg:p-0">
          <BrandMark />
          <span className="text-xs text-ink-500 lg:hidden">Internal use only</span>
        </div>

        <div className="relative hidden lg:block">
          <span className="mb-5 block h-0.5 w-10 bg-gold-400" aria-hidden />
          <p className="text-[28px] leading-tight font-semibold tracking-tight text-white">
            Branch Staff Performance
            <br />
            Management System
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-400">
            A single place for the branch to record, monitor and communicate staff performance.
          </p>
          <ul className="mt-10 space-y-4">
            {CAPABILITIES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-ink-300">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ink-800 ring-1 ring-ink-700">
                  <Icon className="size-4 text-gold-300" aria-hidden />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden text-xs text-ink-500 lg:block">
          Internal system · Authorized branch personnel only
        </p>
      </aside>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12">
        <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-[420px]'}>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
            {description && <p className="mt-1.5 text-[15px] text-zinc-600">{description}</p>}
          </div>
          {children}
          {footer && <div className="mt-6 text-center text-sm text-zinc-600">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
