import {
  ClipboardPenLine,
  FileBarChart,
  History,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  Settings,
  Target,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '@/routes/paths';
import type { Role } from '@/types';

/** Keys of counters shown as badges in navigation (see useNavCounts). */
export type NavCountKey = 'unreadFeedback' | 'unreadAnnouncements' | 'unreadChat' | 'pendingApprovals';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  countKey?: NavCountKey;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Role-based navigation — mirrors the Kickoff portal structure and SRS §10. */
export const NAVIGATION: Record<Role, NavGroup[]> = {
  staff: [
    { label: 'Overview', items: [{ label: 'Dashboard', to: paths.staff.dashboard, icon: LayoutDashboard }] },
    {
      label: 'My KPI',
      items: [
        { label: 'Daily KPI Entry', to: paths.staff.kpiEntry, icon: ClipboardPenLine },
        { label: 'KPI History', to: paths.staff.kpiHistory, icon: History },
        { label: 'Performance', to: paths.staff.performance, icon: TrendingUp },
      ],
    },
    {
      label: 'Communication',
      items: [
        { label: 'Feedback', to: paths.staff.feedback, icon: MessageSquareText, countKey: 'unreadFeedback' },
        { label: 'Announcements', to: paths.staff.announcements, icon: Megaphone, countKey: 'unreadAnnouncements' },
        { label: 'Chat', to: paths.staff.chat, icon: MessagesSquare, countKey: 'unreadChat' },
      ],
    },
    { label: 'Account', items: [{ label: 'Profile', to: paths.staff.profile, icon: UserRound }] },
  ],
  manager: [
    { label: 'Overview', items: [{ label: 'Dashboard', to: paths.manager.dashboard, icon: LayoutDashboard }] },
    {
      label: 'Management',
      items: [
        { label: 'Staff', to: paths.manager.staff, icon: Users, countKey: 'pendingApprovals' },
        { label: 'KPIs', to: paths.manager.kpis, icon: Target },
        { label: 'Performance', to: paths.manager.performance, icon: TrendingUp },
        { label: 'Reports', to: paths.manager.reports, icon: FileBarChart },
      ],
    },
    {
      label: 'Communication',
      items: [
        { label: 'Feedback', to: paths.manager.feedback, icon: MessageSquareText },
        { label: 'Announcements', to: paths.manager.announcements, icon: Megaphone },
        { label: 'Chat', to: paths.manager.chat, icon: MessagesSquare, countKey: 'unreadChat' },
      ],
    },
    { label: 'System', items: [{ label: 'Settings', to: paths.manager.settings, icon: Settings }] },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  staff: 'Staff portal',
  manager: 'Manager portal',
};
