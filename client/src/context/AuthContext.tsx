import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { authEvents, SESSION_EXPIRED_EVENT } from '@/services/http/apiClient';
import type { LoginRequest, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  /** True while restoring the session on first load. */
  initializing: boolean;
  /** Set when the session ended unexpectedly (shown on login page). */
  sessionNotice: string | null;
  login: (req: LoginRequest) => Promise<User>;
  logout: () => Promise<void>;
  /** Replace the cached user after profile edits. */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authService
      .getCurrentUser()
      .then((u) => active && setUser(u))
      .finally(() => active && setInitializing(false));

    const onExpired = () => {
      setUser(null);
      setSessionNotice('Your session has expired. Please sign in again.');
    };
    authEvents.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      active = false;
      authEvents.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const login = useCallback(async (req: LoginRequest) => {
    const u = await authService.login(req);
    setSessionNotice(null);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, sessionNotice, login, logout, updateUser: setUser }),
    [user, initializing, sessionNotice, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Use inside authenticated routes only. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser called without an authenticated user');
  return user;
}
