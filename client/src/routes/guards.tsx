import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types';
import { homeFor, paths } from './paths';
import BankLoader from '@/BankLoader';

function FullPageLoader() {
  return <BankLoader />;
}

/** Requires an authenticated session. UX only — the backend must enforce authorization (SRS FR-18). */
export function RequireAuth() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageLoader />;
  if (!user) return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireRole({ role, roles }: { role?: Role; roles?: Role[] }) {
  const { user } = useAuth();
  const allowed = roles ?? (role ? [role] : []);
  if (user && !allowed.includes(user.role)) return <Navigate to={paths.forbidden} replace />;
  return <Outlet />;
}

/** Public-only routes (login/register): signed-in users go to their home. */
export function RedirectIfAuthenticated() {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

export function RootRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  return <Navigate to={user ? homeFor(user.role) : paths.login} replace />;
}
