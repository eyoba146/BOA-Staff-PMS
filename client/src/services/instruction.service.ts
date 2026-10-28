
import type {
  DailyInstruction,
  DailyInstructionInput,
} from '@/types';
import { commit, getDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';
import type { StoredInstruction } from './mock/seed';

function toDto(instruction: StoredInstruction): DailyInstruction {
  return {
    ...instruction,
    targetStaffIds: [...instruction.targetStaffIds],
  };
}

function ensureMockMode(): void {
  // This feature is intentionally frontend-only for the current prototype.
  // Do not send requests to backend endpoints that do not exist yet.
}

export const instructionService = {
  async list(): Promise<DailyInstruction[]> {
    ensureMockMode();
    await delay();

    const user = requireUser();
    const instructions = getDb().instructions ?? [];

    return instructions
      .filter(
        (instruction) =>
          user.role === 'manager' ||
          instruction.audience === 'all' ||
          instruction.targetStaffIds.includes(user.id),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toDto);
  },

  async create(input: DailyInstructionInput): Promise<DailyInstruction> {
    ensureMockMode();
    await delay(300);

    const manager = requireManager();

    if (!input.title.trim() || !input.body.trim()) {
      throw mockError(
        400,
        'VALIDATION_ERROR',
        'Enter an instruction title and description.',
      );
    }

    if (
      input.audience === 'selected' &&
      input.targetStaffIds.length === 0
    ) {
      throw mockError(
        400,
        'VALIDATION_ERROR',
        'Select at least one staff member.',
      );
    }

    const db = getDb();
    const activeStaff = db.users.filter(
      (user) => user.role === 'staff' && user.status === 'active',
    );

    const validStaffIds = new Set(activeStaff.map((staff) => staff.id));
    const targetStaffIds =
      input.audience === 'all'
        ? []
        : [...new Set(input.targetStaffIds)].filter((id) =>
            validStaffIds.has(id),
          );

    if (input.audience === 'selected' && targetStaffIds.length === 0) {
      throw mockError(
        400,
        'VALIDATION_ERROR',
        'Select at least one active staff member.',
      );
    }

    const instruction: StoredInstruction = {
      id: uid('instruction'),
      title: input.title.trim(),
      body: input.body.trim(),
      audience: input.audience,
      targetStaffIds,
      authorName: manager.fullName,
      createdAt: nowISO(),
    };

    db.instructions ??= [];
    db.instructions.push(instruction);
    commit();

    return toDto(instruction);
  },

  async getActiveStaff() {
    ensureMockMode();
    await delay();

    requireManager();

    return getDb()
      .users.filter(
        (user) => user.role === 'staff' && user.status === 'active',
      )
      .map(({ id, fullName, referenceId }) => ({
        id,
        fullName,
        referenceId,
      }));
  },
};
