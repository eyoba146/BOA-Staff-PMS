import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useNavCounts } from '@/hooks/useNavCounts';

/**
 * Authenticated application shell.
 * ≥ lg: fixed 256px sidebar. < lg: sidebar inside a native <dialog> drawer (focus trap + Esc).
 */
export function AppLayout() {
  const counts = useNavCounts();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    if (drawerOpen && !el.open) el.showModal();
    if (!drawerOpen && el.open) el.close();
  }, [drawerOpen]);

  // Close the drawer if the viewport grows past the breakpoint, and on navigation.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setDrawerOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-dvh lg:pl-72 print:pl-0 print:min-h-0">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-ink-900 px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 print:hidden"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block print:hidden">
        <Sidebar counts={counts} />
      </aside>

      <dialog
        ref={drawerRef}
        aria-label="Navigation menu"
        className="drawer m-0 h-dvh max-h-none w-80 max-w-[85vw] bg-ink-950 p-0 print:hidden"
        onCancel={(e) => {
          e.preventDefault();
          setDrawerOpen(false);
        }}
        onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
      >
        <Sidebar counts={counts} onNavigate={() => setDrawerOpen(false)} />
      </dialog>

      <div className="flex min-h-dvh flex-col print:min-h-0 print:block">
        <div className="print:hidden">
          <Topbar onOpenMenu={() => setDrawerOpen(true)} counts={counts} />
        </div>
        <main id="main" tabIndex={-1} className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 outline-none print:p-0 print:overflow-visible">
          <div className="mx-auto w-full max-w-[1440px] print:max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
