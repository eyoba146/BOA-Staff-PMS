import { prisma } from '../config/database.js';
import { userRepository } from '../repositories/user.repository.js';

export interface ManagerScopeData {
  scopeType: 'branch' | 'positions' | 'staff';
  allowedPositions: string[];
  allowedStaffIds: string[];
}

/**
 * Returns whether targetStaffId is within manager's permitted scope.
 * - Manager (administrator): returns true for all staff in branch.
 * - Customer Experience Manager: evaluated against their ManagerScope.
 * - Ordinary staff: returns true only for themselves.
 */
export async function isStaffInScope(
  managerUser: { id?: string; userId?: string; role: string },
  targetStaffId: string,
): Promise<boolean> {
  const mId = managerUser.id || managerUser.userId || '';
  if (managerUser.role === 'manager') return true;
  if (mId === targetStaffId) return true;
  if (managerUser.role !== 'customer_experience_manager') return false;

  // Verify manager is still active CEM in DB (immediate revocation guarantee)
  const currentDbUser = await userRepository.findById(mId);
  if (!currentDbUser || currentDbUser.role !== 'customer_experience_manager' || currentDbUser.status !== 'active') {
    return false;
  }

  const scope = await prisma.managerScope.findUnique({
    where: { userId: mId },
  });

  // Default to branch-wide if no explicit restriction configured
  if (!scope || scope.scopeType === 'branch') {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetStaffId },
      select: { id: true, status: true },
    });
    return !!targetUser && targetUser.status === 'active';
  }

  if (scope.scopeType === 'staff') {
    return scope.allowedStaffIds.includes(targetStaffId);
  }

  if (scope.scopeType === 'positions') {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetStaffId },
      select: { positionTitle: true, positionId: true, status: true },
    });
    if (!targetUser || targetUser.status !== 'active') return false;
    return (
      scope.allowedPositions.includes(targetUser.positionTitle) ||
      (targetUser.positionId ? scope.allowedPositions.includes(targetUser.positionId) : false)
    );
  }

  return false;
}

/**
 * Returns all active staff user IDs in the manager's permitted scope.
 */
export async function getStaffIdsInScope(
  managerUser: { id?: string; userId?: string; role: string },
): Promise<string[]> {
  const mId = managerUser.id || managerUser.userId || '';
  if (managerUser.role === 'manager') {
    const all = await prisma.user.findMany({
      where: { role: { in: ['staff', 'customer_experience_manager'] }, status: 'active' },
      select: { id: true },
    });
    return all.map((u: any) => u.id);
  }

  if (managerUser.role !== 'customer_experience_manager') {
    return [mId];
  }

  // Live DB check
  const currentDbUser = await userRepository.findById(mId);
  if (!currentDbUser || currentDbUser.role !== 'customer_experience_manager' || currentDbUser.status !== 'active') {
    return [mId];
  }

  const scope = await prisma.managerScope.findUnique({
    where: { userId: mId },
  });

  if (!scope || scope.scopeType === 'branch') {
    const all = await prisma.user.findMany({
      where: { role: { in: ['staff', 'customer_experience_manager'] }, status: 'active' },
      select: { id: true },
    });
    return all.map((u: any) => u.id);
  }

  if (scope.scopeType === 'staff') {
    return scope.allowedStaffIds;
  }

  if (scope.scopeType === 'positions') {
    const matched = await prisma.user.findMany({
      where: {
        role: { in: ['staff', 'customer_experience_manager'] },
        status: 'active',
        OR: [
          { positionTitle: { in: scope.allowedPositions } },
          { positionId: { in: scope.allowedPositions } },
        ],
      },
      select: { id: true },
    });
    return matched.map((u: any) => u.id);
  }

  return [];
}
