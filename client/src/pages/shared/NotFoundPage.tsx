import {
  ArrowRight,
  Check,
  Compass,
  Copy,
  Home,
  IdCard,
  Lock,
  LogIn,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '@/components/layout/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { homeFor, paths } from '@/routes/paths';
import { cn } from '@/utils/cn';

/**
 * 404 — High-Impact Bank of Abyssinia Institutional Route Not Found Experience.
 * Provides atmospheric intranet aesthetics, dynamic routing intelligence,
 * diagnostics, and fast recovery navigation pathways.
 */
export function NotFoundPage() {
  useDocumentTitle('404 · Route Not Found');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [copied, setCopied] = useState(false);
  const homePath = user ? homeFor(user.role) : paths.login;
  const currentPath = location.pathname;

  const handleCopyPath = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(homePath);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-ink-950 text-white flex flex-col justify-between overflow-x-hidden selection:bg-gold-500 selection:text-ink-950">
      {/* Ambient Lighting & Luxury Gold Aura */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-gold-500/15 via-amber-500/5 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-gradient-to-t from-gold-600/10 via-amber-600/5 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle Intranet Grid Background Pattern */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Institutional Header */}
      <header className="relative z-10 w-full border-b border-white/10 bg-ink-950/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link to={homePath} className="group transition-transform active:scale-[0.98]">
            <BrandMark tone="dark" />
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3.5 py-1 text-xs font-semibold text-gold-300 shadow-xs">
            <ShieldCheck className="size-3.5 text-gold-400" />
            <span className="hidden sm:inline">Bank of Abyssinia · Finfine Main Branch</span>
            <span className="sm:hidden">BoA Intranet</span>
          </div>
        </div>
      </header>

      {/* Central 404 Hero Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="max-w-2xl w-full text-center space-y-7">
          {/* Luminous Typography 404 & Central Compass Emblem */}
          <div className="relative inline-block select-none">
            <span className="block font-mono text-8xl sm:text-9xl md:text-[11rem] font-black tracking-tight leading-none bg-gradient-to-b from-white via-gold-200 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_15px_35px_rgba(235,163,18,0.25)]">
              404
            </span>

            {/* Glowing Compass Badge centered */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <span className="relative flex size-14 sm:size-16 items-center justify-center rounded-2xl border border-gold-400/40 bg-ink-950/90 shadow-2xl backdrop-blur-md ring-4 ring-gold-500/20">
                <Compass className="size-7 sm:size-8 text-gold-400 animate-spin [animation-duration:12s]" />
              </span>
            </div>
          </div>

          {/* Institutional Status Tag */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gradient-to-r from-gold-500/15 via-amber-500/10 to-gold-500/15 px-3.5 py-1 text-[11.5px] font-mono font-bold tracking-wider text-gold-300 uppercase shadow-sm">
              <ShieldAlert className="size-3.5 text-gold-400" />
              HTTP 404 · Workstation Route Unreachable
            </span>
          </div>

          {/* Heading & Institutional Copy */}
          <div className="space-y-3 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Location Not Found on Branch Intranet
            </h1>
            <p className="max-w-lg mx-auto text-sm sm:text-base text-zinc-400 leading-relaxed">
              The requested screen or performance record does not exist on this workstation terminal, has been relocated, or requires elevated authorization.
            </p>
          </div>

          {/* Diagnostic Path Inspector Bar */}
          <div className="max-w-md mx-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-2.5 flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 truncate pl-1">
              <span className="text-gold-400 font-bold">URI:</span>
              <span className="truncate text-zinc-200">{currentPath}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyPath}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer shrink-0',
                copied
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/10 bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white',
              )}
              title="Copy URL"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-gold-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            {/* Card 1: Workspace Home */}
            <Link
              to={homePath}
              className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-all hover:border-gold-500/40 hover:-translate-y-0.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-gold-500/20 text-gold-400 group-hover:bg-gold-500 group-hover:text-ink-950 transition-colors">
                  {user ? <Home className="size-4.5" /> : <LogIn className="size-4.5" />}
                </span>
                <ArrowRight className="size-3.5 text-zinc-500 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-white group-hover:text-gold-300 transition-colors">
                {user ? (user.role === 'manager' ? 'Manager Dashboard' : 'Staff Dashboard') : 'Sign In to Portal'}
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-400 leading-snug">
                {user ? 'Return to your active performance workspace.' : 'Access your authorized branch account.'}
              </p>
            </Link>

            {/* Card 2: Track Status */}
            <Link
              to={paths.accountStatus}
              className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-all hover:border-gold-500/40 hover:-translate-y-0.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-ink-950 transition-colors">
                  <IdCard className="size-4.5" />
                </span>
                <ArrowRight className="size-3.5 text-zinc-500 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-white group-hover:text-gold-300 transition-colors">
                Track Registration
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-400 leading-snug">
                Look up approval status using your REG reference ID.
              </p>
            </Link>

            {/* Card 3: Register or Portal Support */}
            <Link
              to={user ? paths.staff.profile : paths.register}
              className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-all hover:border-gold-500/40 hover:-translate-y-0.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-ink-950 transition-colors">
                  {user ? <IdCard className="size-4.5" /> : <UserPlus className="size-4.5" />}
                </span>
                <ArrowRight className="size-3.5 text-zinc-500 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-white group-hover:text-gold-300 transition-colors">
                {user ? 'My Profile' : 'Request Account'}
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-400 leading-snug">
                {user ? 'View workstation settings and employee profile.' : 'Submit a new branch registration request.'}
              </p>
            </Link>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGoBack}
              className="w-full sm:w-auto h-12 px-6 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="size-4 text-zinc-400" />
              <span>Go Back</span>
            </button>

            <Link to={homePath} className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-500 hover:from-gold-400 hover:via-amber-300 hover:to-gold-400 text-ink-950 font-bold text-sm shadow-lg shadow-gold-500/25 transition-all flex items-center justify-center gap-2 border border-gold-400/40 cursor-pointer active:scale-95"
              >
                <span>{user ? 'Return to Dashboard' : 'Sign In to Portal'}</span>
                <ArrowRight className="size-4" />
              </button>
            </Link>
          </div>
        </div>
      </main>

      {/* Institutional Security Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-ink-950/80 backdrop-blur-md px-6 py-4 text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Lock className="size-3 text-gold-500/70" />
            <span>Bank of Abyssinia (BoA) · 256-bit TLS Protected Intranet</span>
          </div>
          <div>
            <span>Branch Performance Management System · Internal Use Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
