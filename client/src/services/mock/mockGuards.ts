import type { User } from '@/types';
import { getDb, mockSession } from './mockDb';
import { mockError } from './mockUtils';
import type { MockUser } from './seed';

/** Mock equivalents of backend auth middleware. */

export function requireUser(): MockUser {
  const id = mockSession.get();
  const user = getDb().users.find((u) => u.id === id);
  if (!user || user.status !== 'active') {
    throw mockError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  }
  return user;
}

export function requireManager(): MockUser {
  const user = requireUser();
  if (user.role !== 'manager') throw mockError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
  return user;
}

/** Strip mock-only fields; mirrors a backend DTO. */
export function toPublicUser(u: MockUser): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, referenceId, ...rest } = u;
  const db = getDb();
  return {
    ...rest,
    assignedKpiCount: db.assignments.filter(
      (a) => a.staffId === u.id && db.kpis.find((k) => k.id === a.kpiId)?.isActive,
    ).length,
  };
}
