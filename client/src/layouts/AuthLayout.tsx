import { BarChart3, ClipboardCheck, MessageSquareText, ShieldCheck, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';

const CAPABILITIES = [
  { icon: ClipboardCheck, title: 'Daily KPI Recording', text: 'Record daily operational achievements against assigned branch targets' },
  { icon: BarChart3, title: 'Multi-Period Analytics', text: 'Review performance trends by day, week, month, and fiscal quarter' },
  { icon: MessageSquareText, title: 'Targeted Feedback & Comms', text: 'Receive coaching feedback, official notices, and branch-wide messaging' },
];

/** Thin-line geometric motif. Decorative only. */
function Pattern() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.11]" aria-hidden>
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
  title?: string;
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
      {/* Left Brand Panel (50% on desktop) */}
      <aside className="on-dark relative overflow-hidden bg-ink-950 bg-[radial-gradient(ellipse_90%_90%_at_20%_-10%,rgba(235,163,18,0.18),rgba(14,14,16,0))] border-b lg:border-b-0 lg:border-r border-ink-800 text-ink-300 lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <Pattern />

        {/* Mobile / Desktop Brand Header */}
        <div className="relative flex items-center justify-between px-5 py-4 lg:p-0">
          <BrandMark />
          <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-500/10 px-2.5 py-0.5 text-[11px] font-medium text-gold-300 lg:hidden">
            <Lock className="size-3 text-gold-400" />
            Branch Terminal
          </span>
        </div>

        {/* Desktop Hero Information */}
        <div className="relative hidden lg:block my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3.5 py-1 text-xs font-semibold text-gold-300 backdrop-blur-xs mb-6 shadow-xs">
            <ShieldCheck className="size-3.5 text-gold-400" />
            <span>Single Branch Operations Portal</span>
          </div>

          <h2 className="text-[32px] leading-tight font-bold tracking-tight text-white">
            Branch Staff Performance
            <br />
            <span className="text-gold-400">Management System</span>
          </h2>

          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-300">
            Official platform for branch personnel to record achievements, review operational KPIs, and maintain high banking standards.
          </p>

          <div className="mt-8 space-y-3">
            {CAPABILITIES.map(({ icon: Icon, title: capTitle, text }) => (
              <div
                key={capTitle}
                className="group flex items-start gap-3.5 rounded-xl border border-ink-800/90 bg-ink-900/60 p-4 backdrop-blur-xs transition-colors hover:border-gold-500/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-800 border border-gold-500/30 text-gold-400 shadow-xs">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-xs font-semibold text-white">{capTitle}</p>
                  <p className="mt-0.5 text-[12px] text-ink-400 leading-normal">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Institutional Disclaimer */}
        <div className="relative hidden lg:flex items-center justify-between border-t border-ink-800/80 pt-6 text-[11.5px] text-ink-500 max-w-lg">
          <span>Authorized branch personnel only</span>
          <span className="flex items-center gap-1 text-gold-400/80">
            <Lock className="size-3" />
            256-bit TLS Encrypted
          </span>
        </div>
      </aside>

      {/* Right Form Main Area (50% on desktop) */}
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-8 sm:py-12 lg:w-1/2 lg:flex-none lg:min-h-dvh bg-gradient-to-br from-zinc-50 via-canvas/60 to-zinc-100/80 relative">
        <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-[540px]'}>
          {/* Header (optional if page embeds its own header inside the card) */}
          {title && (
            <div className="mb-6 text-left">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">{title}</h1>
              {description && <p className="mt-2 text-[14.5px] text-zinc-600 leading-relaxed">{description}</p>}
            </div>
          )}

          {children}

          {footer && <div className="mt-6 text-center text-sm text-zinc-600">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

