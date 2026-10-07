import { Bell, Building2, ChevronDown, FlaskConical, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { env } from '@/config/env';
import { useAuth, useCurrentUser } from '@/context/AuthContext';
import type { NavCounts } from '@/hooks/useNavCounts';
import { paths } from '@/routes/paths';
import { formatDate, todayISO } from '@/utils/date';
import { Avatar, IconButton } from '../ui';

export function Topbar({ onOpenMenu, counts }: { onOpenMenu: () => void; counts: NavCounts }) {
  const user = useCurrentUser();
  const announcementsPath = user.role === 'manager' ? paths.manager.announcements : paths.staff.announcements;
  const unread = counts.unreadAnnouncements ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <IconButton label="Open navigation menu" onClick={onOpenMenu} className="-ml-2 lg:hidden">
        <Menu className="size-5" />
      </IconButton>

      <div className="hidden min-w-0 items-center gap-2 text-[13px] text-zinc-500 md:flex">
        <Building2 className="size-4 text-zinc-400" aria-hidden />
        <span className="truncate font-medium text-zinc-700">{user.branchName}</span>
        <span className="text-zinc-300" aria-hidden>
          /
        </span>
        <span className="truncate">{formatDate(todayISO(), 'long')}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {env.useMockApi && (
          <span
            className="hidden items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 sm:inline-flex"
            title="Mock API adapters are active (VITE_USE_MOCK_API=true). Data is stored in this browser only."
          >
            <FlaskConical className="size-3.5" aria-hidden />
            Demo data
          </span>
        )}
        <Link
          to={announcementsPath}
          className="relative inline-flex size-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label={unread ? `Announcements, ${unread} unread` : 'Announcements'}
        >
          <Bell className="size-[18px]" />
          {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-gold-500 ring-2 ring-white" aria-hidden />}
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const accountLink =
    user.role === 'manager'
      ? { to: paths.manager.settings, label: 'Settings', icon: Settings }
      : { to: paths.staff.profile, label: 'My profile', icon: UserRound };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 hover:bg-zinc-100"
      >
        <Avatar name={user.fullName} src={user.avatarUrl} size="sm" highlight />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-36 truncate text-[13px] font-medium text-zinc-900">{user.fullName}</span>
          <span className="block text-xs text-zinc-500 capitalize">{user.role}</span>
        </span>
        <ChevronDown className="hidden size-4 text-zinc-400 sm:block" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 animate-fade-in rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          <div className="border-b border-zinc-100 px-3.5 py-2.5">
            <p className="truncate text-sm font-medium text-zinc-900">{user.fullName}</p>
            <p className="truncate text-xs text-zinc-500">
              {user.employeeId} · {user.position}
            </p>
          </div>
          <Link
            role="menuitem"
            to={accountLink.to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <accountLink.icon className="size-4 text-zinc-500" aria-hidden />
            {accountLink.label}
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="size-4 text-zinc-500" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
