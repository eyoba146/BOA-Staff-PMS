import type { Role } from '@/types';

/** Single source of truth for route paths. See docs/IMPLEMENTATION_PLAN.md §5. */
export const paths = {
  root: '/',
  login: '/login',
  register: '/register',
  accountStatus: '/account-status',
  forgotPassword: '/forgot-password',
  forbidden: '/forbidden',
  staff: {
    dashboard: '/staff/dashboard',
    kpiEntry: '/staff/kpi/entry',
    kpiHistory: '/staff/kpi/history',
    performance: '/staff/performance',
    feedback: '/staff/feedback',
    announcements: '/staff/announcements',
    chat: '/staff/chat',
    profile: '/staff/profile',
  },
  manager: {
    dashboard: '/manager/dashboard',
    staff: '/manager/staff',
    staffDetail: (id: string) => `/manager/staff/${id}`,
    kpis: '/manager/kpis',
    performance: '/manager/performance',
    reports: '/manager/reports',
    feedback: '/manager/feedback',
    announcements: '/manager/announcements',
    chat: '/manager/chat',
    settings: '/manager/settings',
  },
} as const;

export const homeFor = (role: Role) => (role === 'manager' ? paths.manager.dashboard : paths.staff.dashboard);
