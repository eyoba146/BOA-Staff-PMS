import { Routes, Route } from 'react-router-dom';
import { paths } from './paths';
import { RequireAuth, RequireRole, RedirectIfAuthenticated, RootRedirect } from './guards';
import { AppLayout } from '@/layouts/AppLayout';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AccountStatusPage } from '@/pages/auth/AccountStatusPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

// Shared pages
import { ForbiddenPage } from '@/pages/shared/ForbiddenPage';
import { NotFoundPage } from '@/pages/shared/NotFoundPage';
import { AnnouncementsPage } from '@/pages/shared/AnnouncementsPage';
import { ChatPage } from '@/pages/shared/ChatPage';

// Staff pages
import { StaffDashboardPage } from '@/pages/staff/StaffDashboardPage';
import { DailyKpiEntryPage } from '@/pages/staff/DailyKpiEntryPage';
import { KpiHistoryPage } from '@/pages/staff/KpiHistoryPage';
import { StaffPerformancePage } from '@/pages/staff/StaffPerformancePage';
import { StaffFeedbackPage } from '@/pages/staff/StaffFeedbackPage';
import { ProfilePage } from '@/pages/staff/ProfilePage';

// Manager pages
import { ManagerDashboardPage } from '@/pages/manager/ManagerDashboardPage';
import { StaffListPage } from '@/pages/manager/StaffListPage';
import { StaffDetailPage } from '@/pages/manager/StaffDetailPage';
import { KpiManagementPage } from '@/pages/manager/KpiManagementPage';
import { PerformanceMonitoringPage } from '@/pages/manager/PerformanceMonitoringPage';
import { ReportsPage } from '@/pages/manager/ReportsPage';
import { ManagerFeedbackPage } from '@/pages/manager/ManagerFeedbackPage';
import { ManagerAnnouncementsPage } from '@/pages/manager/ManagerAnnouncementsPage';
import { SettingsPage } from '@/pages/manager/SettingsPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path={paths.root} element={<RootRedirect />} />

      {/* Public / Auth routes (redirect to home if already authenticated) */}
      <Route element={<RedirectIfAuthenticated />}>
        <Route path={paths.login} element={<LoginPage />} />
        <Route path={paths.register} element={<RegisterPage />} />
        <Route path={paths.accountStatus} element={<AccountStatusPage />} />
        <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
      </Route>

      {/* Access forbidden page */}
      <Route path={paths.forbidden} element={<ForbiddenPage />} />

      {/* Protected routes requiring session */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* Staff Portal */}
          <Route element={<RequireRole role="staff" />}>
            <Route path={paths.staff.dashboard} element={<StaffDashboardPage />} />
            <Route path={paths.staff.kpiEntry} element={<DailyKpiEntryPage />} />
            <Route path={paths.staff.kpiHistory} element={<KpiHistoryPage />} />
            <Route path={paths.staff.performance} element={<StaffPerformancePage />} />
            <Route path={paths.staff.feedback} element={<StaffFeedbackPage />} />
            <Route path={paths.staff.announcements} element={<AnnouncementsPage />} />
            <Route path={paths.staff.chat} element={<ChatPage />} />
            <Route path={paths.staff.profile} element={<ProfilePage />} />
          </Route>

          {/* Manager Portal */}
          <Route element={<RequireRole role="manager" />}>
            <Route path={paths.manager.dashboard} element={<ManagerDashboardPage />} />
            <Route path={paths.manager.staff} element={<StaffListPage />} />
            <Route path="/manager/staff/:staffId" element={<StaffDetailPage />} />
            <Route path={paths.manager.kpis} element={<KpiManagementPage />} />
            <Route path={paths.manager.performance} element={<PerformanceMonitoringPage />} />
            <Route path={paths.manager.reports} element={<ReportsPage />} />
            <Route path={paths.manager.feedback} element={<ManagerFeedbackPage />} />
            <Route path={paths.manager.announcements} element={<ManagerAnnouncementsPage />} />
            <Route path={paths.manager.chat} element={<ChatPage />} />
            <Route path={paths.manager.settings} element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
