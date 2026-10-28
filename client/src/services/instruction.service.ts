import type {
  DailyInstruction,
  DailyInstructionInput,
  Role,
} from '@/types';
import { commit, getDb } from './mock/mockDb';
import { requireUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';
import type { StoredInstruction } from './mock/seed';
import { authService } from './auth.service';
import { staffService } from './staff.service';

function toDto(instruction: StoredInstruction): DailyInstruction {
  return {
    ...instruction,
    targetStaffIds: [...(instruction.targetStaffIds || [])],
  };
}

async function resolveCurrentUser(): Promise<{ id: string; fullName: string; role: Role }> {
  try {
    const liveUser = await authService.getCurrentUser();
    if (liveUser) {
      return { id: liveUser.id, fullName: liveUser.fullName, role: liveUser.role };
    }
  } catch {
    // fallback to mock session
  }

  try {
    const mockUser = requireUser();
    return { id: mockUser.id, fullName: mockUser.fullName, role: mockUser.role as Role };
  } catch {
    throw mockError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  }
}

export const instructionService = {
  async list(): Promise<DailyInstruction[]> {
    await delay(100);

    const user = await resolveCurrentUser();
    const instructions = getDb().instructions ?? [];

    const isSupervisor = user.role === 'manager' || user.role === 'customer_experience_manager';

    return instructions
      .filter(
        (instruction) =>
          isSupervisor ||
          instruction.audience === 'all' ||
          instruction.targetStaffIds.includes(user.id),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toDto);
  },

  async create(input: DailyInstructionInput): Promise<DailyInstruction> {
    await delay(300);

    const user = await resolveCurrentUser();
    if (user.role !== 'manager' && user.role !== 'customer_experience_manager') {
      throw mockError(403, 'FORBIDDEN', 'Only managers and customer experience managers can publish instructions.');
    }

    if (!input.title.trim() || !input.body.trim()) {
      throw mockError(400, 'VALIDATION_ERROR', 'Enter an instruction title and description.');
    }

    if (input.audience === 'selected' && (!input.targetStaffIds || input.targetStaffIds.length === 0)) {
      throw mockError(400, 'VALIDATION_ERROR', 'Select at least one staff member.');
    }

    const roleBadge = user.role === 'customer_experience_manager' ? 'Customer Experience Manager' : 'Branch Manager';
    const instruction: StoredInstruction = {
      id: uid('inst'),
      title: input.title.trim(),
      body: input.body.trim(),
      audience: input.audience,
      targetStaffIds: input.audience === 'all' ? [] : input.targetStaffIds,
      authorName: `${user.fullName} (${roleBadge})`,
      createdAt: nowISO(),
    };

    const db = getDb();
    db.instructions ??= [];
    db.instructions.push(instruction);
    commit();

    return toDto(instruction);
  },

  async getActiveStaff(): Promise<{ id: string; fullName: string; referenceId: string }[]> {
    await delay(100);
    const user = await resolveCurrentUser();
    if (user.role !== 'manager' && user.role !== 'customer_experience_manager') {
      throw mockError(403, 'FORBIDDEN', 'You do not have permission to view staff members.');
    }

    try {
      if (user.role === 'customer_experience_manager') {
        const scoped = await staffService.listInScope();
        if (scoped && scoped.length > 0) {
          return scoped.map((s) => ({
            id: s.id,
            fullName: s.fullName,
            referenceId: s.employeeId || s.referenceId || 'ID Pending',
          }));
        }
      } else {
        const staffList = await staffService.list({ status: 'active' });
        if (staffList && staffList.length > 0) {
          return staffList
            .filter((s) => s.role === 'staff' || s.role === 'customer_experience_manager')
            .map((s) => ({
              id: s.id,
              fullName: s.fullName,
              referenceId: s.employeeId || s.referenceId || 'ID Pending',
            }));
        }
      }
    } catch {
      // Fallback to mockDb
    }

    return getDb()
      .users.filter((u) => (u.role === 'staff' || u.role === 'customer_experience_manager') && u.status === 'active')
      .map(({ id, fullName, referenceId, employeeId }) => ({
        id,
        fullName,
        referenceId: employeeId || referenceId || 'ID Pending',
      }));
  },
};
