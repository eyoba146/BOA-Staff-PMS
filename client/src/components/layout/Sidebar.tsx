import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { NAVIGATION, ROLE_LABELS } from '@/config/navigation';
import { useCurrentUser, useAuth } from '@/context/AuthContext';
import type { NavCounts } from '@/hooks/useNavCounts';
import { cn } from '@/utils/cn';
import { Avatar, CountBadge } from '../ui';
import { BrandMark } from './BrandMark';

interface SidebarProps {
  counts: NavCounts;
  onNavigate?: () => void;
}

export function Sidebar({ counts, onNavigate }: SidebarProps) {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const groups = NAVIGATION[user.role];

  return (
    <div className="on-dark flex h-full flex-col bg-ink-950 text-ink-300">
      <div className="flex h-16 items-center border-b border-ink-800 px-6">
        <BrandMark />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3.5 py-4 scrollbar-dark">
        <p className="mb-3 px-3 text-[11px] font-semibold tracking-wider text-gold-300/90 uppercase">{ROLE_LABELS[user.role]}</p>
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">{group.label}</p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex h-9.5 items-center gap-3.5 rounded-lg px-3.5 text-[14px] font-medium transition-colors',
                        isActive ? 'bg-ink-800 text-white font-semibold' : 'text-ink-300 hover:bg-ink-900 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-gold-400" aria-hidden />}
                        <item.icon
                          className={cn('size-[19px] shrink-0', isActive ? 'text-gold-300' : 'text-ink-500 group-hover:text-ink-300')}
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.countKey && <CountBadge count={counts[item.countKey] ?? 0} />}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3.5 border-t border-ink-800 px-5 py-3.5">
        <Avatar name={user.fullName} src={user.avatarUrl} size="sm" className="bg-ink-700 text-white ring-1 ring-ink-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-white">{user.fullName}</p>
          <p className="truncate text-xs text-ink-400">{user.employeeId}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800 hover:text-white"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}
