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
    instructions: '/staff/instructions',
    chat: '/staff/chat',
    profile: '/staff/profile',
  },
  manager: {
    dashboard: '/manager/dashboard',
    staff: '/manager/staff',
    staffDetail: (id: string) => `/manager/staff/${id}`,
    kpis: '/manager/kpis',
    campaigns: '/manager/campaigns',
    performance: '/manager/performance',
    reports: '/manager/reports',
    feedback: '/manager/feedback',
    announcements: '/manager/announcements',
    instructions: '/manager/instructions', 
    chat: '/manager/chat',   
    settings: '/manager/settings',
  },
  cem: {
    dashboard: '/cem/dashboard',
    staff: '/cem/staff',
    staffDetail: (id: string) => `/cem/staff/${id}`,
    feedback: '/cem/feedback',
    instructions: '/cem/instructions',
    chat: '/cem/chat',
    profile: '/cem/profile',
  },
} as const;

export const homeFor = (role: Role) => {
  if (role === 'manager') return paths.manager.dashboard;
  if (role === 'customer_experience_manager') return paths.cem.dashboard;
  return paths.staff.dashboard;
};
