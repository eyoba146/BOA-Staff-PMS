import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { userRepository } from './user.repository.js';

export interface StoredPosition {
  id: string;
  name: string;
  isActive: boolean;
  assignedStaffCount?: number;
  createdAt: string;
  updatedAt: string;
}

const memoryPositions: StoredPosition[] = [
  {
    id: 'pos_cso',
    name: 'Customer Service Officer',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'pos_cso_demo',
    name: 'Customer Service Officer (demo)',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'pos_ro',
    name: 'Relationship Officer',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'pos_ro_demo',
    name: 'Relationship Officer (demo)',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'pos_cash',
    name: 'Cash Officer',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'pos_cash_demo',
    name: 'Cash Officer (demo)',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'pos_acct',
    name: 'Branch Accountant',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'pos_acct_demo',
    name: 'Branch Accountant (demo)',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
];

export const positionRepository = {
  async list(filter?: { activeOnly?: boolean; search?: string }): Promise<StoredPosition[]> {
    const q = filter?.search?.trim().toLowerCase();
    const allUsers = await userRepository.listAll();

    if (env.DATABASE_URL) {
      try {
        const positions = await prisma.position.findMany({
          where: {
            ...(filter?.activeOnly ? { isActive: true } : {}),
            ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
          },
          orderBy: { name: 'asc' },
        });

        return positions.map((p: any) => {
          const count = allUsers.filter(
            (u) =>
              u.role === 'staff' &&
              u.position.toLowerCase() === p.name.toLowerCase() &&
              u.status !== 'pending_email_verification',
          ).length;
          return {
            id: p.id,
            name: p.name,
            isActive: p.isActive,
            assignedStaffCount: count,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        });
      } catch {
        // Fall back to memory
      }
    }

    return memoryPositions
      .filter((p) => (filter?.activeOnly ? p.isActive : true))
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q)))
      .map((p) => {
        const count = allUsers.filter(
          (u) =>
            u.role === 'staff' &&
            u.position.toLowerCase() === p.name.toLowerCase() &&
            u.status !== 'pending_email_verification',
        ).length;
        return {
          ...p,
          assignedStaffCount: count,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async findById(id: string): Promise<StoredPosition | null> {
    const allUsers = await userRepository.listAll();

    if (env.DATABASE_URL) {
      try {
        const p = await prisma.position.findUnique({ where: { id } });
        if (p) {
          const count = allUsers.filter(
            (u) =>
              u.role === 'staff' &&
              u.position.toLowerCase() === p.name.toLowerCase() &&
              u.status !== 'pending_email_verification',
          ).length;
          return {
            id: p.id,
            name: p.name,
            isActive: p.isActive,
            assignedStaffCount: count,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        }
      } catch {
        // Fall back to memory
      }
    }

    const pos = memoryPositions.find((p) => p.id === id);
    if (!pos) return null;
    const count = allUsers.filter(
      (u) =>
        u.role === 'staff' &&
        u.position.toLowerCase() === pos.name.toLowerCase() &&
        u.status !== 'pending_email_verification',
    ).length;
    return { ...pos, assignedStaffCount: count };
  },

  async findByName(name: string): Promise<StoredPosition | null> {
    const cleanName = name.trim().toLowerCase();
    if (env.DATABASE_URL) {
      try {
        const p = await prisma.position.findFirst({
          where: { name: { equals: cleanName, mode: 'insensitive' } },
        });
        if (p) {
          return {
            id: p.id,
            name: p.name,
            isActive: p.isActive,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        }
      } catch {
        // Fall back to memory
      }
    }

    return memoryPositions.find((p) => p.name.toLowerCase() === cleanName) ?? null;
  },

  async create(name: string): Promise<StoredPosition> {
    const cleanName = name.trim();
    const now = new Date().toISOString();

    if (env.DATABASE_URL) {
      try {
        const p = await prisma.position.create({
          data: { name: cleanName, isActive: true },
        });
        return {
          id: p.id,
          name: p.name,
          isActive: p.isActive,
          assignedStaffCount: 0,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      } catch {
        // Fall back to memory
      }
    }

    const newPos: StoredPosition = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      isActive: true,
      assignedStaffCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    memoryPositions.push(newPos);
    return newPos;
  },

  async update(id: string, updates: { name?: string; isActive?: boolean }): Promise<StoredPosition | null> {
    const now = new Date().toISOString();
    const cleanName = updates.name?.trim();

    if (env.DATABASE_URL) {
      try {
        const p = await prisma.position.update({
          where: { id },
          data: {
            ...(cleanName ? { name: cleanName } : {}),
            ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
          },
        });
        return {
          id: p.id,
          name: p.name,
          isActive: p.isActive,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      } catch {
        // Fall back to memory
      }
    }

    const pos = memoryPositions.find((p) => p.id === id);
    if (!pos) return null;
    if (cleanName) pos.name = cleanName;
    if (updates.isActive !== undefined) pos.isActive = updates.isActive;
    pos.updatedAt = now;
    return pos;
  },

  async setActive(id: string, isActive: boolean): Promise<StoredPosition | null> {
    return this.update(id, { isActive });
  },
};
